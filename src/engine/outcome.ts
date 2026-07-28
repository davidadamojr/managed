/**
 * The terminal account of a whole run — the readable data a completion screen or a
 * loss post-mortem is built from. Where a `SprintSummary` narrates one sprint, a
 * `RunOutcome` narrates the ending: whether the team survived to the end or lost
 * someone, how far the run got, where the soft roadmap landed, and — on a loss — the
 * traceable why behind the departure.
 *
 * It is pure derived output, the same category as the sprint summary: no rule reads
 * back from it, no state is mutated, no RNG is drawn. Terminal-state *detection* is
 * not redone here — the run's `status` was decided the moment a tick fired; this only
 * dresses a state the tick already marked terminal into view-ready words and counts,
 * and returns nothing while the run is still active. That is what keeps the
 * engine/view wall intact: the screen renders this and computes nothing about the run
 * itself.
 *
 * The fuzzy-readability rule holds even at the end. A post-mortem never prints a
 * burnout number; the loss is explained through what the player was actually shown —
 * the crunch sprints endured and the at-risk warnings that were surfaced and then
 * ignored, echoed verbatim from the run's own history. The lesson lands in the
 * manager's own observations, not a metric.
 */

import { roadmapProgress, type RoadmapProgress } from './entities';
import type { SprintSummary } from './summary';
import type { GameState, DepartureTrace } from './state';

/** How a terminal run ended. Narrower than `RunStatus` — an active run has no outcome. */
export type RunResult = 'completed' | 'failed';

/**
 * One at-risk warning the player was shown, replayed from history. The `note` is the
 * exact fuzzy observation surfaced that sprint — the warning as the manager saw it, in
 * the game's own voice — so the post-mortem re-shows the evidence rather than
 * re-describing it.
 */
export interface WarningEcho {
  /** Zero-based sprint the warning appeared in. */
  readonly sprintIndex: number;
  /** The at-risk read shown that sprint, verbatim. */
  readonly note: string;
}

/**
 * Why a run ended in a departure, assembled for the post-mortem screen. The head-line
 * facts come straight off the run's `DepartureTrace`; `warnings` is drawn from the
 * retained history — every sprint this engineer read as at-risk, oldest first,
 * including the sprint they finally left in.
 *
 * `warningsShown` and `warnings.length` measure two different things on purpose:
 * `warningsShown` counts the warnings the player saw *and had a sprint to act on* —
 * the ignored ones — while `warnings` is the complete record shown, whose final entry
 * is the coincident read from the quitting sprint itself. The gap between them is the
 * story: a well-warned loss shows several ignored warnings; the bounded fast-burnout
 * exception shows `warningsShown` at zero with a single coincident warning, which is
 * the fairness floor the guarantee never drops below.
 */
export interface PostMortem {
  readonly engineerId: string;
  readonly engineerName: string;
  /** Zero-based sprint the engineer quit in. */
  readonly sprintIndex: number;
  /** At-risk warnings surfaced before the quit — the ones the player could have acted on. */
  readonly warningsShown: number;
  /** Crunch sprints the engineer endured — the cause behind the burnout. */
  readonly crunchSprints: number;
  /** True when the bounded fast-burnout exception compressed the warning into the quit sprint. */
  readonly fastBurnout: boolean;
  /** Every at-risk read shown for this engineer over the run, oldest first. */
  readonly warnings: readonly WarningEcho[];
}

/**
 * The readable end-of-run summary. `sprintsPlayed` is how many sprints actually
 * resolved (which equals `runLength` on a completion and stops short on a loss);
 * `roadmap` is where the soft target finished — context the player earned, never a
 * win/lose axis. `postMortem` is present exactly when `result` is `'failed'`.
 */
export interface RunOutcome {
  readonly result: RunResult;
  readonly sprintsPlayed: number;
  readonly runLength: number;
  readonly roadmap: RoadmapProgress;
  readonly postMortem?: PostMortem;
}

/**
 * Replay a departed engineer's at-risk warnings from the run's history, oldest first.
 * Only that engineer's reads that were flagged at-risk are kept, so a teammate's reads
 * never leak into the post-mortem and a calm sprint contributes nothing.
 */
function warningsFor(
  history: readonly SprintSummary[],
  engineerId: string,
): WarningEcho[] {
  const echoes: WarningEcho[] = [];
  for (const summary of history) {
    const read = summary.reads.find(
      (r) => r.engineerId === engineerId && r.atRisk,
    );
    if (read) echoes.push({ sprintIndex: summary.sprintIndex, note: read.note });
  }
  return echoes;
}

/** Build the post-mortem from the loss trace plus the warnings echoed out of history. */
function buildPostMortem(state: GameState, trace: DepartureTrace): PostMortem {
  return {
    engineerId: trace.engineerId,
    engineerName: trace.engineerName,
    sprintIndex: trace.sprintIndex,
    warningsShown: trace.warningsShown,
    crunchSprints: trace.crunchSprints,
    fastBurnout: trace.fastBurnout,
    warnings: warningsFor(state.history ?? [], trace.engineerId),
  };
}

/**
 * Derive the terminal account of a run, or `null` while it is still active. The roadmap
 * figure is read fresh from the current backlog rather than the last summary, so the
 * outcome is correct on its own even if history was never retained. A failed run always
 * carries its departure trace, so the post-mortem is built whenever one is present.
 */
export function deriveOutcome(state: GameState): RunOutcome | null {
  if (state.status === 'active') return null;

  const roadmap = roadmapProgress(state.roadmap, state.backlog);
  const sprintsPlayed = state.history?.length ?? 0;

  if (state.status === 'completed') {
    return { result: 'completed', sprintsPlayed, runLength: state.runLength, roadmap };
  }

  const outcome: RunOutcome = {
    result: 'failed',
    sprintsPlayed,
    runLength: state.runLength,
    roadmap,
  };
  return state.departure
    ? { ...outcome, postMortem: buildPostMortem(state, state.departure) }
    : outcome;
}
