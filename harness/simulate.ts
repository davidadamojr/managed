/**
 * The simulation driver — the harness's one path from a seed to a finished run. It
 * drives the *same* pure engine the view will use (`newRun` + scripted `tick`s), so the
 * harness can never measure a simulation that diverges from the real game. There is no
 * second engine here, only a scripted player.
 *
 * A run is played entirely inside a `withTuning` scope, so an alternate parameter set is
 * in force for construction and every tick alike — that is what lets a sweep re-measure
 * the whole design under a changed constant. With no override the base candidate
 * constants apply, unchanged.
 *
 * Determinism is total: a given seed, strategy, and parameter override always produce
 * the identical `RunRecord`. The seed threads through `GameState`, the strategy is a
 * pure function of state, and no clock or ambient randomness is touched.
 */

import { withTuning, type TuningOverride } from '../src/content';
import {
  newRun,
  tick,
  deriveOutcome,
  type GameState,
  type RunOutcome,
  type SprintSummary,
} from '../src/engine';
import { strategyByName, type StrategyName } from './strategies';

/**
 * The fixed base seed for harness seed sets. A literal, not a clock read, so the whole
 * suite of runs reproduces exactly. Individual runs take consecutive seeds from here.
 */
export const HARNESS_BASE_SEED = 20260728;

/**
 * Everything one finished run leaves behind for the bars to read: the seed and strategy
 * that produced it, the terminal outcome (result, sprints played, roadmap landing, and
 * — on a loss — the post-mortem), and the full sprint history. The history is retained
 * because the fairness bar re-verifies, against the actual reads shown, that a warning
 * preceded any loss — rather than trusting the trace's own count.
 */
export interface RunRecord {
  readonly seed: number;
  readonly strategy: StrategyName;
  readonly outcome: RunOutcome;
  readonly history: readonly SprintSummary[];
}

/**
 * Play one full run to its terminal state and capture it. Ticks until the run completes
 * or someone quits; the loop is bounded by the run length, so it always terminates. The
 * override defaults to empty — the base candidate constants.
 */
export function runSimulation(
  seed: number,
  strategy: StrategyName,
  override: TuningOverride = {},
): RunRecord {
  return withTuning(override, () => {
    const policy = strategyByName(strategy);
    let state: GameState = newRun(seed);
    // A run advances at most `runLength` sprints before completing; the guard is a
    // belt-and-braces stop so an unusual override can never spin here.
    let guard = state.runLength + 2;
    while (state.status === 'active' && guard > 0) {
      state = tick(state, policy(state)).state;
      guard -= 1;
    }
    const outcome = deriveOutcome(state);
    // Only an active run yields null, and the loop exits only on a terminal state.
    if (!outcome) throw new Error('simulation ended without a terminal outcome');
    return { seed, strategy, outcome, history: state.history ?? [] };
  });
}

/**
 * A deterministic set of `count` seeds starting at `base`. Consecutive integers, each
 * normalized into its own RNG stream by construction, so the set is stable and diverse.
 */
export function makeSeeds(
  count: number,
  base: number = HARNESS_BASE_SEED,
): number[] {
  return Array.from({ length: count }, (_, i) => base + i);
}

/**
 * Play `seeds.length` runs of one strategy under one parameter set, in seed order. The
 * result is the raw material for every bar — a bar is a pure reduction over these
 * records. Order is deterministic, so the aggregate is reproducible.
 */
export function runMany(
  seeds: readonly number[],
  strategy: StrategyName,
  override: TuningOverride = {},
): RunRecord[] {
  return seeds.map((seed) => runSimulation(seed, strategy, override));
}

/** The sprint an engineer quit in, or null when the run did not end in a loss. */
export function quitSprint(record: RunRecord): number | null {
  return record.outcome.postMortem?.sprintIndex ?? null;
}

/** Whether the run ended in attrition. */
export function isLoss(record: RunRecord): boolean {
  return record.outcome.result === 'failed';
}

/** Roadmap completion as a 0–1 fraction (0 when the roadmap is empty). */
export function roadmapFraction(record: RunRecord): number {
  const { completed, total } = record.outcome.roadmap;
  return total === 0 ? 0 : completed / total;
}
