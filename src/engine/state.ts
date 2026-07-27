/**
 * `GameState` — the single serializable root that carries an entire run. One object
 * holds everything the simulation needs and nothing it doesn't, so a save is just
 * this object as JSON and a tick is just this object in and a new one out.
 *
 * The RNG lives inside the state (not a global) so that a resumed save replays the
 * exact same stream: identical state plus identical actions always produce an
 * identical next state.
 */

import type { RngState } from './rng';
import type {
  Engineer,
  Ticket,
  Roadmap,
  AttentionPool,
  ManagerState,
} from './entities';
import type { SprintSummary } from './summary';

/**
 * `active` while the run is in progress, `completed` when the team survives to the
 * end, `failed` when someone quits. Failure is only ever a human outcome — no
 * metric, missed roadmap included, ends a run.
 */
export type RunStatus = 'active' | 'completed' | 'failed';

/**
 * Why a run ended in attrition — the readable trace the post-mortem is built from.
 * Recorded once, when a quit fires, and carried on the state for the rest of the run.
 * It holds the *story* of the loss, not raw interiors: who left and when, how many
 * sprints of at-risk warning the player was shown and ignored, how many crunch
 * sprints led here, and whether the bounded fast-burnout exception compressed the
 * warning into the quitting sprint. No morale or burnout number appears — the fuzzy
 * rule holds even in the post-mortem. Later run-lifecycle work finalizes and renders
 * this; the engine only produces it.
 */
export interface DepartureTrace {
  readonly engineerId: string;
  readonly engineerName: string;
  /** Zero-based sprint index in which the engineer quit. */
  readonly sprintIndex: number;
  /** Consecutive at-risk sprints surfaced before the quit — the ignored warnings. */
  readonly warningsShown: number;
  /** Crunch sprints the engineer endured over the run — the cause behind the burnout. */
  readonly crunchSprints: number;
  /** True when the fast-burnout exception let the warning coincide with the loss. */
  readonly fastBurnout: boolean;
}

/**
 * The whole run in one serializable object. `seed` is the run's fixed identity;
 * `rngState` carries the live stream position drawn from that seed. They start
 * equal and diverge only in cursor as the run advances — both are kept because the
 * origin seed identifies the run while the cursor is what resumes it.
 */
export interface GameState {
  readonly seed: number;
  readonly rngState: RngState;
  /** Zero-based index of the current sprint. */
  readonly sprintIndex: number;
  /** Total sprints in the run. */
  readonly runLength: number;
  readonly roster: readonly Engineer[];
  readonly backlog: readonly Ticket[];
  readonly roadmap: Roadmap;
  readonly attention: AttentionPool;
  readonly manager: ManagerState;
  readonly status: RunStatus;
  /** Resolved sprint summaries, oldest first. Optional and retained for review. */
  readonly history?: readonly SprintSummary[];
  /**
   * Set once, when a quit ends the run, to the trace behind the loss. Absent on an
   * active or completed run — a `failed` run always carries it.
   */
  readonly departure?: DepartureTrace;
}
