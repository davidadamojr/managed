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
 * A run shows one of three screens, and this file projects all three so that single
 * chokepoint stays single: the planning screen (`RunView`), the sprint summary
 * (`SummaryView`), and the ending (`OutcomeView`). Which one is showing is presentation
 * state the store owns — the engine's `status` decides whether a run is over, never
 * which panel is on screen.
 *
 * The DOM layer is deliberately dumb below this: it maps a `ScreenView` to elements and
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
  deriveOutcome,
  type GameState,
  type TicketStatus,
  type AttentionActionKind,
  type SprintActions,
  type SprintSummary,
  type MoodBand,
  type ReadTrend,
  type RunResult,
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

/**
 * Human sprint label for a zero-based index, clamped so the sprint past the last one —
 * where a completed run's index sits — still reads "Sprint 6 of 6".
 */
function sprintLabel(sprintIndex: number, runLength: number): string {
  return `Sprint ${Math.min(sprintIndex + 1, runLength)} of ${runLength}`;
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
    label: sprintLabel(state.sprintIndex, state.runLength),
    roster: state.roster.map((engineer) => rosterCard(engineer, draft, readNoteById)),
    backlog: backlogView(state, draft),
    roadmap: { completed: progress.completed, total: progress.total },
    crunch: draft.crunch,
    attention: attentionTray(snapshot),
    canResolve: state.status === 'active',
  };
}

/** One sprint in an engineer's read history: the band the player was shown that sprint. */
export interface ReadHistoryPointView {
  /** 1-based sprint number, as the player counts them. */
  readonly sprint: number;
  readonly mood: MoodBand;
  readonly atRisk: boolean;
}

/**
 * One engineer's read on the summary screen. `note` is the engine's fuzzy observation
 * for this sprint; `mood` and `trend` are the same read as enums, so a renderer can mark
 * it without parsing prose. `history` is the strip of bands this engineer has read as
 * over the run — every one of them already shown to the player in its own sprint, and
 * gathered here because the crunch→burnout coupling is only legible across sprints.
 *
 * The strip does not undercut the 1:1: bands are coarse and lag, while a 1:1 resolves
 * the actual direction of *this* sprint (`trend`, `sharpened`). Remembering what was
 * shown is a courtesy; knowing which way someone is heading still has to be bought.
 */
export interface EngineerReadView {
  readonly engineerId: string;
  readonly name: string;
  readonly note: string;
  readonly atRisk: boolean;
  readonly mood: MoodBand;
  readonly trend: ReadTrend;
  readonly sharpened: boolean;
  /** Oldest first, ending with this sprint. A single point is state without direction. */
  readonly history: readonly ReadHistoryPointView[];
}

/** A ticket that reached done this sprint, with the detail that makes it recognizable. */
export interface ShippedTicketView {
  readonly id: string;
  readonly size: number;
  readonly requiredSkill: Skill;
}

/** The event that surfaced this sprint: its description and the people it landed on. */
export interface SprintEventView {
  readonly description: string;
  readonly affected: readonly string[];
}

/**
 * The sprint summary screen — what shipped, where the roadmap stands, how each person
 * reads, and any event. `runEnded` says the resolved sprint was the run's last, so the
 * advance leads to the ending rather than to another planning screen.
 */
export interface SummaryView {
  readonly label: string;
  readonly shipped: readonly ShippedTicketView[];
  readonly roadmap: RoadmapView;
  readonly reads: readonly EngineerReadView[];
  readonly event: SprintEventView | null;
  readonly runEnded: boolean;
}

/** One at-risk read the player was shown, replayed on the post-mortem. */
export interface WarningEchoView {
  /** 1-based sprint number the warning appeared in. */
  readonly sprint: number;
  readonly note: string;
}

/**
 * The why-trace behind a loss. `warningsShown` counts the warnings the player saw with
 * a sprint left to act on them; `warnings` is the full record shown, whose last entry is
 * the read from the leaving sprint itself. `fastBurnout` marks the bounded exception
 * where the slide was steep enough that warning and exit shared a sprint.
 */
export interface PostMortemView {
  readonly engineerName: string;
  /** 1-based sprint number the engineer left in. */
  readonly sprint: number;
  readonly warningsShown: number;
  readonly crunchSprints: number;
  readonly fastBurnout: boolean;
  readonly warnings: readonly WarningEchoView[];
}

/**
 * The ending screen. `roadmap` is where the soft target finished — context, never a
 * win/lose axis — and `survivors` is who is still on the team. `postMortem` is present
 * exactly when the run ended in a departure.
 */
export interface OutcomeView {
  readonly label: string;
  readonly result: RunResult;
  readonly sprintsPlayed: number;
  readonly runLength: number;
  readonly roadmap: RoadmapView;
  readonly survivors: readonly string[];
  readonly postMortem: PostMortemView | null;
}

/**
 * Which screen the run is showing. This is presentation state, not run state: the
 * engine's `status` decides whether a run is over, while the phase decides whether the
 * player is being shown the framing, planning, reading the sprint just resolved, or at
 * the ending.
 */
export type ScreenPhase = 'framing' | 'planning' | 'summary' | 'ended';

/**
 * The one screen to render, tagged so a renderer can switch on it exhaustively. The
 * framing carries no data: it is the goal in a line or two, which is copy rather than
 * anything projected out of a run, so there is nothing for this projection to say about
 * it beyond that it is showing.
 */
export type ScreenView =
  | { readonly screen: 'framing' }
  | { readonly screen: 'planning'; readonly run: RunView }
  | { readonly screen: 'summary'; readonly summary: SummaryView }
  | { readonly screen: 'ended'; readonly outcome: OutcomeView };

/**
 * Gather one engineer's band-per-sprint strip out of retained history. A transpose of
 * reads the engine already derived — the same reshape the backlog's assignee index is,
 * with no judgement of its own about what a direction means.
 */
function readHistoryFor(
  history: readonly SprintSummary[],
  engineerId: string,
): ReadHistoryPointView[] {
  const points: ReadHistoryPointView[] = [];
  for (const summary of history) {
    const read = summary.reads.find((r) => r.engineerId === engineerId);
    if (read) {
      points.push({ sprint: summary.sprintIndex + 1, mood: read.mood, atRisk: read.atRisk });
    }
  }
  return points;
}

/** Look up the shipped ticket ids against the backlog they came from. */
function shippedTickets(state: GameState, shipped: readonly string[]): ShippedTicketView[] {
  const byId = new Map(state.backlog.map((t) => [t.id, t]));
  return shipped.flatMap((id) => {
    const ticket = byId.get(id);
    return ticket ? [{ id, size: ticket.size, requiredSkill: ticket.requiredSkill }] : [];
  });
}

/**
 * Project the summary of the sprint just resolved, or `null` before any has been. Reads
 * are projected in the engine's own order and carry only its qualitative output — the
 * note, the band, the direction, the at-risk flag — so the raw interiors stay behind the
 * wall here exactly as they do on the planning screen.
 */
export function buildSummaryView(state: GameState): SummaryView | null {
  const history = state.history ?? [];
  const latest = history.at(-1);
  if (latest === undefined) return null;

  const nameById = new Map(state.roster.map((e) => [e.id, e.name]));
  const reads = latest.reads.map((read) => ({
    engineerId: read.engineerId,
    name: nameById.get(read.engineerId)!,
    note: read.note,
    atRisk: read.atRisk,
    mood: read.mood,
    trend: read.trend,
    sharpened: read.sharpened,
    history: readHistoryFor(history, read.engineerId),
  }));

  return {
    label: sprintLabel(latest.sprintIndex, state.runLength),
    shipped: shippedTickets(state, latest.shipped),
    roadmap: { completed: latest.roadmap.completed, total: latest.roadmap.total },
    reads,
    event: latest.event
      ? {
          description: latest.event.description,
          affected: latest.event.affectedEngineerIds.map((id) => nameById.get(id)!),
        }
      : null,
    runEnded: state.status !== 'active',
  };
}

/**
 * Project the ending, or `null` while the run is still active. The whole account —
 * result, counts, roadmap, and the why-trace behind a departure — is the engine's
 * `deriveOutcome`; this only renames sprint indices to the numbers the player counts in
 * and resolves the surviving roster to names.
 */
export function buildOutcomeView(state: GameState): OutcomeView | null {
  const outcome = deriveOutcome(state);
  if (outcome === null) return null;

  const postMortem = outcome.postMortem;
  return {
    label: sprintLabel(state.sprintIndex, state.runLength),
    result: outcome.result,
    sprintsPlayed: outcome.sprintsPlayed,
    runLength: outcome.runLength,
    roadmap: { completed: outcome.roadmap.completed, total: outcome.roadmap.total },
    // The roster keeps whoever quit, so the post-mortem can still speak about the whole
    // team. Who is *left* is that roster minus them.
    survivors: state.roster
      .filter((e) => e.id !== postMortem?.engineerId)
      .map((e) => e.name),
    postMortem: postMortem
      ? {
          engineerName: postMortem.engineerName,
          sprint: postMortem.sprintIndex + 1,
          warningsShown: postMortem.warningsShown,
          crunchSprints: postMortem.crunchSprints,
          fastBurnout: postMortem.fastBurnout,
          warnings: postMortem.warnings.map((w) => ({
            sprint: w.sprintIndex + 1,
            note: w.note,
          })),
        }
      : null,
  };
}

/**
 * Build the one screen the phase asks for. A phase with nothing to show — a summary
 * before any sprint resolved, an ending on a live run — falls back to planning rather
 * than rendering an empty shell; the store never asks for those, so the fallback is a
 * guard, not a path.
 */
export function buildScreenView(snapshot: RunSnapshot, phase: ScreenPhase): ScreenView {
  // The framing has no data behind it, so there is nothing to fall back from.
  if (phase === 'framing') return { screen: 'framing' };

  if (phase === 'summary') {
    const summary = buildSummaryView(snapshot.state);
    if (summary !== null) return { screen: 'summary', summary };
  } else if (phase === 'ended') {
    const outcome = buildOutcomeView(snapshot.state);
    if (outcome !== null) return { screen: 'ended', outcome };
  }
  return { screen: 'planning', run: buildRunView(snapshot) };
}
