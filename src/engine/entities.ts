/**
 * The core entities — the serializable nouns the simulation reads and rewrites.
 * These are plain data with no behavior; rules live in pure functions elsewhere so
 * the same shapes can serialize to a save, port to another language, and be driven
 * headlessly by the tuning harness.
 *
 * Every field is `readonly` because a tick never mutates its input: it builds a new
 * state with spreads and returns it. Making the fields readonly hands that
 * invariant to the compiler instead of trusting discipline.
 */

import { getTuning } from '../content';
import type { Skill } from '../content';

/** Inclusive bounds for the two people attributes (morale, burnout). */
export const ATTRIBUTE_MIN = 0;
export const ATTRIBUTE_MAX = 100;

/**
 * Clamp a people attribute into [0, 100] so morale and burnout can never overflow
 * their bounds. Provided here as the single clamp everything routes through; the
 * value-changing systems that call it come later.
 */
export function clampAttribute(value: number): number {
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, value));
}

/**
 * An engineer's proficiency in each skill, on the same 0–100 scale. Total rather
 * than partial — every skill is present, low where the person is weak — so fit and
 * assignment logic never has to special-case a missing key.
 */
export type SkillProficiencies = Readonly<Record<Skill, number>>;

/**
 * What one engineer is doing this sprint: which tickets they carry and whether
 * they are crunching. `null` means unassigned. Crunch is a per-sprint choice that
 * trades throughput now for burnout that surfaces later, so it belongs with the
 * assignment rather than as durable engineer state.
 */
export interface Assignment {
  readonly ticketIds: readonly string[];
  readonly crunch: boolean;
}

/**
 * Optional per-engineer bookkeeping. `atRiskSprints` records how many consecutive
 * sprints an at-risk warning has been shown, which is what lets the game guarantee
 * a fair warning before anyone can quit. Optional so an engineer who was never at
 * risk carries nothing.
 */
export interface EngineerFlags {
  readonly atRiskSprints?: number;
}

/**
 * A team member. `morale` and `burnout` are kept as two separate values on
 * purpose: morale is fast-moving mood that flexes within a sprint and modulates
 * throughput; burnout is slow accumulation across sprints and drives the attrition
 * threshold. Collapsing them into one number would erase the delayed echo the whole
 * game is built to produce. Both live on the 0–100 scale.
 */
export interface Engineer {
  readonly id: string;
  readonly name: string;
  /** The wry one-line "vibe" from the name pool; flavor only, no mechanics. */
  readonly flavor: string;
  readonly skills: SkillProficiencies;
  readonly morale: number;
  readonly burnout: number;
  readonly assignment: Assignment | null;
  readonly flags?: EngineerFlags;
}

export type TicketStatus = 'open' | 'in-progress' | 'done';

/**
 * A unit of backlog work. `size` is effort in points; `progress` accumulates
 * toward it. Completed tickets stay in the backlog marked done rather than being
 * removed, so what shipped and how far the roadmap has moved stay derivable from
 * the backlog alone.
 */
export interface Ticket {
  readonly id: string;
  readonly size: number;
  readonly requiredSkill: Skill;
  readonly progress: number;
  readonly status: TicketStatus;
}

/**
 * The soft goal: the subset of ticket ids that count toward the roadmap. Only the
 * ids are stored — progress is derived from the live tickets, never cached here, so
 * it cannot fall out of sync with what actually shipped. Missing the roadmap is a
 * painful outcome but never ends a run.
 */
export interface Roadmap {
  readonly ticketIds: readonly string[];
}

/** How many of the roadmap's designated tickets are done, out of the total. */
export interface RoadmapProgress {
  readonly completed: number;
  readonly total: number;
}

/**
 * Read roadmap progress straight from the backlog rather than a stored counter, so
 * the number always reflects real ticket statuses. A roadmap id with no matching
 * backlog ticket simply doesn't count as completed.
 */
export function roadmapProgress(
  roadmap: Roadmap,
  backlog: readonly Ticket[],
): RoadmapProgress {
  const done = new Set(
    backlog.filter((t) => t.status === 'done').map((t) => t.id),
  );
  const completed = roadmap.ticketIds.filter((id) => done.has(id)).length;
  return { completed, total: roadmap.ticketIds.length };
}

/**
 * The manager's own state. Its fields do nothing yet — they hold neutral values and
 * no rule reads them. The container still exists from the first save so that when
 * reputation and the manager's own burnout later modulate attention capacity, they
 * have real, already-persisted state to move, with no migration of old saves.
 */
export interface ManagerState {
  readonly reputation: number;
  readonly burnout: number;
}

/**
 * This sprint's attention economy. `capacity` is produced by
 * `attentionCapacityFor`, never written as a literal, so the source of the number
 * is a single seam that manager state can influence later. `remaining` is what is
 * left after actions are spent.
 */
export interface AttentionPool {
  readonly capacity: number;
  readonly remaining: number;
}

/**
 * Attention capacity is a function of the manager, not a fixed constant. Today it
 * returns a flat base pool from the tuning file and ignores the manager entirely —
 * hence `_manager`. Routing capacity through this one function now is what lets
 * reputation or manager burnout bend it later without touching any caller.
 */
export function attentionCapacityFor(_manager: ManagerState): number {
  return getTuning().attention.poolPerSprint;
}
