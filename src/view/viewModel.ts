/**
 * The view-model projection — the seam that turns a `GameState` plus the in-progress
 * sprint plan into flat, display-ready data. It is the concrete expression of the
 * engine/view wall: it *reshapes* what the engine already decided (roadmap progress,
 * the fuzzy reads, the attention budget) into the shape a panel wants, and it computes
 * no game rule of its own. Anything rule-shaped — how much attention is left, whether an
 * action is affordable, how far the roadmap has moved — is asked of an engine function,
 * never re-derived here.
 *
 * Two properties make this the right place to test the wall. It is a pure function of
 * `(state, draft)`, so it runs headlessly in Node with no DOM — the bulk of the view's
 * logic is verified without a browser. And it is the single chokepoint every rendered
 * value flows through, so the fuzzy-readability rule can be enforced structurally: raw
 * `morale` and `burnout` are simply never copied onto a view model, so no renderer built
 * on top of this can leak them. A read reaches the player only as the engine's
 * qualitative note and the at-risk flag.
 *
 * The DOM layer is deliberately dumb below this: it maps a `RunView` to elements and
 * maps events back to store dispatches. Keeping the projection separate from the DOM is
 * also what makes the eventual framework choice cheap — swapping the renderer reuses this
 * projection wholesale.
 */

import {
  roadmapProgress,
  currentAttentionPool,
  attentionActionCost,
  canAffordAttention,
  assignmentFor,
  attentionKindsFor,
  type GameState,
  type RunStatus,
  type TicketStatus,
  type AttentionActionKind,
  type SprintActions,
} from '../engine';
import { listSkills, type Skill } from '../content';

/** The two inputs a view is built from: the committed run, and the plan being assembled. */
export interface RunSnapshot {
  readonly state: GameState;
  readonly draft: SprintActions;
}

/** One skill and this engineer's proficiency in it — a systems number, safe to show. */
export interface SkillView {
  readonly skill: Skill;
  readonly proficiency: number;
}

/**
 * One engineer's card. `read` is the engine's fuzzy note from the last resolved sprint —
 * the player's current understanding of the person going into planning — or `null` before
 * the first sprint has resolved (no read yet, shown plainly, not as an error). `atRisk`
 * mirrors that read's fairness flag. Deliberately carries no morale or burnout: the raw
 * interiors never reach a view model, so a renderer cannot show them.
 */
export interface RosterCardView {
  readonly id: string;
  readonly name: string;
  readonly flavor: string;
  readonly skills: readonly SkillView[];
  readonly read: string | null;
  readonly atRisk: boolean;
  /** The ticket this engineer is slated for in the current plan, or `null` if idle. */
  readonly assignedTicketId: string | null;
  /** Attention actions committed to this engineer this sprint, in the order chosen. */
  readonly attention: readonly AttentionActionKind[];
}

/** One backlog ticket as shown: its cost, the skill it wants, and who is slated on it. */
export interface BacklogTicketView {
  readonly id: string;
  readonly size: number;
  readonly requiredSkill: Skill;
  readonly status: TicketStatus;
  /** Names of engineers slated onto this ticket in the current plan (usually zero or one). */
  readonly assignedTo: readonly string[];
}

/**
 * The backlog panel. `tickets` are the ones still in play (not done); the counts let the
 * panel show the over-capacity reality plainly — more work than the team can clear — with
 * no auto-balancing nudge. `teamSize` is the roster count, the yardstick the backlog is
 * over.
 */
export interface BacklogView {
  readonly tickets: readonly BacklogTicketView[];
  readonly openCount: number;
  readonly doneCount: number;
  readonly teamSize: number;
}

/**
 * The soft-goal readout: how many roadmap tickets have shipped, out of the total. Being
 * behind (`completed < total`) is schedule pressure, never a fail line — the view renders
 * it as progress, and nothing here marks it as failure.
 */
export interface RoadmapView {
  readonly completed: number;
  readonly total: number;
}

/** One buyable attention action: its kind, cost, and whether the current budget affords it. */
export interface AttentionActionView {
  readonly kind: AttentionActionKind;
  readonly cost: number;
  readonly affordable: boolean;
}

/**
 * The attention economy for this sprint: the pool as capacity/remaining (remaining derived
 * by the engine from the plan, so it can never drift), and the three actions it buys with
 * live affordability. An exhausted pool is an ordinary state here — `remaining` is 0 and
 * every action reads unaffordable — not an error.
 */
export interface AttentionTrayView {
  readonly capacity: number;
  readonly remaining: number;
  readonly actions: readonly AttentionActionView[];
}

/**
 * The whole main run screen as flat data. Everything a renderer needs and nothing it must
 * compute. `label` is a presentation string ("Sprint 2 of 6"); `canResolve` is false once
 * the run has reached a terminal state, so the view stops offering a tick it cannot run.
 */
export interface RunView {
  readonly label: string;
  readonly status: RunStatus;
  readonly roster: readonly RosterCardView[];
  readonly backlog: BacklogView;
  readonly roadmap: RoadmapView;
  readonly crunch: boolean;
  readonly attention: AttentionTrayView;
  readonly canResolve: boolean;
}

/**
 * The three managerial actions, in a fixed display order. The player targets a specific
 * engineer via that engineer's card; this list drives the tray's legend and its
 * per-engineer buttons, so both share one source of order and cost.
 */
const ATTENTION_KINDS: readonly AttentionActionKind[] = ['oneOnOne', 'unblock', 'recognize'];

/** Human sprint label, 1-based and clamped so a completed run reads "Sprint 6 of 6". */
function sprintLabel(state: GameState): string {
  const current = Math.min(state.sprintIndex + 1, state.runLength);
  return `Sprint ${current} of ${state.runLength}`;
}

/** Project one engineer to a card, pulling their fuzzy read from the last resolved sprint. */
function rosterCard(
  engineer: GameState['roster'][number],
  draft: SprintActions,
  readNoteById: ReadonlyMap<string, { note: string; atRisk: boolean }>,
): RosterCardView {
  const read = readNoteById.get(engineer.id);
  return {
    id: engineer.id,
    name: engineer.name,
    flavor: engineer.flavor,
    skills: listSkills().map((skill) => ({ skill, proficiency: engineer.skills[skill] })),
    read: read?.note ?? null,
    atRisk: read?.atRisk ?? false,
    assignedTicketId: assignmentFor(draft, engineer.id),
    attention: attentionKindsFor(draft, engineer.id),
  };
}

/** Reverse the plan into a ticket-id → slated-engineer-names lookup for the backlog panel. */
function assigneesByTicket(state: GameState, draft: SprintActions): Map<string, string[]> {
  const nameById = new Map(state.roster.map((e) => [e.id, e.name]));
  const byTicket = new Map<string, string[]>();
  for (const engineer of state.roster) {
    const ticketId = assignmentFor(draft, engineer.id);
    if (ticketId === null) continue;
    const names = byTicket.get(ticketId) ?? [];
    names.push(nameById.get(engineer.id)!);
    byTicket.set(ticketId, names);
  }
  return byTicket;
}

/** Project the backlog: tickets still in play, plus the counts that show it over capacity. */
function backlogView(state: GameState, draft: SprintActions): BacklogView {
  const byTicket = assigneesByTicket(state, draft);
  const tickets = state.backlog
    .filter((t) => t.status !== 'done')
    .map((t) => ({
      id: t.id,
      size: t.size,
      requiredSkill: t.requiredSkill,
      status: t.status,
      assignedTo: byTicket.get(t.id) ?? [],
    }));
  const doneCount = state.backlog.filter((t) => t.status === 'done').length;
  return {
    tickets,
    openCount: state.backlog.length - doneCount,
    doneCount,
    teamSize: state.roster.length,
  };
}

/** Project the attention tray from the sprint's pool and the plan's committed spend. */
function attentionTray(snapshot: RunSnapshot): AttentionTrayView {
  const { state, draft } = snapshot;
  const pool = currentAttentionPool(state, draft);
  return {
    capacity: pool.capacity,
    remaining: pool.remaining,
    actions: ATTENTION_KINDS.map((kind) => ({
      kind,
      cost: attentionActionCost(kind),
      affordable: canAffordAttention(state, draft, kind),
    })),
  };
}

/**
 * Build the whole main-run view from a snapshot. Pure: same `(state, draft)` in, same
 * `RunView` out. Every rule-shaped value is asked of the engine; nothing about game rules
 * is computed here, and no raw morale or burnout is ever copied across.
 */
export function buildRunView(snapshot: RunSnapshot): RunView {
  const { state, draft } = snapshot;
  const lastReads = state.history?.at(-1)?.reads ?? [];
  const readNoteById = new Map(
    lastReads.map((r) => [r.engineerId, { note: r.note, atRisk: r.atRisk }]),
  );
  const progress = roadmapProgress(state.roadmap, state.backlog);

  return {
    label: sprintLabel(state),
    status: state.status,
    roster: state.roster.map((engineer) => rosterCard(engineer, draft, readNoteById)),
    backlog: backlogView(state, draft),
    roadmap: { completed: progress.completed, total: progress.total },
    crunch: draft.crunch,
    attention: attentionTray(snapshot),
    canResolve: state.status === 'active',
  };
}
