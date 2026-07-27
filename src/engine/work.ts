/**
 * Work resolution — the juggle half of the sprint tick. Given the roster, the
 * backlog, and the sprint's plan, it computes how far each assigned engineer pushes
 * their ticket and which tickets ship, and classifies what each engineer lived
 * through so the people model (prompt 07) can respond to it.
 *
 * Throughput is the product of three legible levers: skill fit (how well the person
 * matches the ticket's required skill), morale (the fast mood multiplier from the
 * people model), and crunch (the team-wide throughput boost). Fit and morale are read
 * at the START of the sprint — the values the player saw when planning — because the
 * locked resolution order resolves work before morale shifts. A poor fit therefore
 * ships slowly rather than erroring, and an idle engineer ships nothing.
 *
 * Two deliberate resolution rules, both left open by the spec and decided here:
 *   - Crunch is a per-engineer effect only for those actually assigned. An idle
 *     engineer during a team crunch does not grind and does not accrue crunch
 *     burnout — being benched is its own (idle) experience, not a crunch one.
 *   - An impossible or already-done assignment produces no work, but the engineer is
 *     still counted as assigned (they were given a job). Plans are validated upstream;
 *     this module stays total and never throws on a bad reference.
 *
 * Everything here is pure and deterministic — no RNG, no clock. Every coefficient
 * comes from tuning so the throughput curve is retuned as data, never as logic.
 */

import { getTuning } from '../content';
import type { Skill } from '../content';
import {
  ATTRIBUTE_MAX,
  type Assignment,
  type Engineer,
  type Ticket,
  type TicketStatus,
} from './entities';
import { moraleThroughputMultiplier, type Workload } from './people';
import type { SprintActions } from './actions';

/** Skill fit as a 0–1 fraction: the engineer's proficiency in the required skill. */
export function skillFit(engineer: Engineer, skill: Skill): number {
  return engineer.skills[skill] / ATTRIBUTE_MAX;
}

/**
 * Whether an assignment reads as a poor fit — the boolean the people model consumes
 * for its morale frustration. Throughput scales continuously with fit; this only
 * decides whether the sprint *felt* like the wrong job.
 */
export function isPoorFit(engineer: Engineer, ticket: Ticket): boolean {
  return engineer.skills[ticket.requiredSkill] <= getTuning().work.poorFitThreshold;
}

/**
 * Effort points one engineer produces against one ticket this sprint: the base output
 * scaled by skill fit, the start-of-sprint morale multiplier, and the crunch boost
 * when crunching. A good fit at good morale ships meaningfully more than a poor fit or
 * a checked-out engineer, and crunch lifts it further at a burnout cost applied later.
 */
export function workOutput(
  engineer: Engineer,
  ticket: Ticket,
  crunch: boolean,
): number {
  const { work, crunch: crunchTuning } = getTuning();
  const fit = skillFit(engineer, ticket.requiredSkill);
  const moraleMultiplier = moraleThroughputMultiplier(engineer.morale);
  const crunchMultiplier = crunch ? crunchTuning.throughputMultiplier : 1;
  return work.baseOutput * fit * moraleMultiplier * crunchMultiplier;
}

/**
 * The work-side facts about one engineer's sprint, handed to the people model as the
 * classified half of its `SprintExperience` (attention received is the other half).
 * `assignment` is the plan projected back onto the engineer for the resolved state.
 */
export interface EngineerWork {
  readonly workload: Workload;
  readonly poorFit: boolean;
  /** Effective crunch: the team flag, but only for an engineer who is actually assigned. */
  readonly crunch: boolean;
  readonly assignment: Assignment | null;
}

/**
 * The outcome of resolving a sprint's work: the advanced backlog, the ids that shipped
 * this sprint, and the per-engineer classification keyed by engineer id.
 */
export interface WorkResolution {
  readonly backlog: readonly Ticket[];
  readonly shipped: readonly string[];
  readonly classifications: Readonly<Record<string, EngineerWork>>;
}

/**
 * Recompute a ticket's status from its accumulated progress. Progress only ever grows
 * within a sprint, so this never regresses a ticket: a ticket that reaches its size is
 * done, one with any progress is in-progress, and an untouched one keeps its zero.
 */
function statusFor(progress: number, size: number): TicketStatus {
  if (progress >= size) return 'done';
  if (progress > 0) return 'in-progress';
  return 'open';
}

/**
 * Resolve one sprint's work. Engineers are processed in roster order (the sum is
 * order-independent, so two engineers sharing a ticket simply pool their output). Work
 * lands only on tickets that exist and were not already done; everything else is left
 * to the classification so the people model still sees an "assigned" sprint. `shipped`
 * is exactly the tickets that crossed into done this sprint, not those already done.
 */
export function resolveWork(
  roster: readonly Engineer[],
  backlog: readonly Ticket[],
  actions: SprintActions,
): WorkResolution {
  const progressById = new Map<string, number>();
  const ticketById = new Map<string, Ticket>();
  for (const ticket of backlog) {
    progressById.set(ticket.id, ticket.progress);
    ticketById.set(ticket.id, ticket);
  }
  const doneAtStart = new Set(
    backlog.filter((t) => t.status === 'done').map((t) => t.id),
  );

  const classifications: Record<string, EngineerWork> = {};
  for (const engineer of roster) {
    const ticketId = actions.assignments[engineer.id];
    if (ticketId === undefined) {
      classifications[engineer.id] = {
        workload: 'idle',
        poorFit: false,
        crunch: false,
        assignment: null,
      };
      continue;
    }
    const ticket = ticketById.get(ticketId);
    if (ticket && !doneAtStart.has(ticket.id)) {
      const output = workOutput(engineer, ticket, actions.crunch);
      progressById.set(ticket.id, (progressById.get(ticket.id) ?? 0) + output);
    }
    classifications[engineer.id] = {
      workload: 'assigned',
      poorFit: ticket ? isPoorFit(engineer, ticket) : false,
      crunch: actions.crunch,
      assignment: { ticketIds: [ticketId], crunch: actions.crunch },
    };
  }

  const newBacklog = backlog.map((ticket) => {
    const progress = progressById.get(ticket.id) ?? ticket.progress;
    return { ...ticket, progress, status: statusFor(progress, ticket.size) };
  });
  const shipped = newBacklog
    .filter((t) => t.status === 'done' && !doneAtStart.has(t.id))
    .map((t) => t.id);

  return { backlog: newBacklog, shipped, classifications };
}
