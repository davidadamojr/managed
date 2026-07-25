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
}
