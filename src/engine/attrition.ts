/**
 * The attrition seam. The sprint tick calls `evaluateAttrition` at one fixed point —
 * immediately after burnout is updated — to decide whether the just-updated burnout
 * has cost the team anyone. Placing the call here now locks that ordering so the
 * fairness guarantee (a fuzzy at-risk warning must precede any quit) has a stable home
 * and later work only fills the body, never moves the call.
 *
 * The threshold, the at-risk state machine, the warning lead-time, the bounded
 * fast-burnout exception, the terminal `failed` transition, and the why-trace for the
 * post-mortem all belong to the attrition prompt that follows this one. Until then the
 * seam is intentionally inert: it passes the roster through untouched and preserves the
 * run's status, so nobody quits yet and the tick's wiring can be exercised and tested
 * as an integration without the fail state existing.
 */

import type { Engineer } from './entities';
import type { GameState, RunStatus } from './state';

/**
 * The outcome of an attrition check: the roster to carry forward (later: with at-risk
 * flags updated or a departed engineer removed) and the run's resulting status (later:
 * `failed` when a quit fires). Shaped minimally now; the attrition prompt extends it
 * with the departure trace it records.
 */
export interface AttritionOutcome {
  readonly roster: readonly Engineer[];
  readonly status: RunStatus;
}

/**
 * Evaluate attrition against the post-burnout-update roster. `roster` is authoritative
 * here — it carries the burnout just written this sprint — while `state` supplies run
 * context (sprint index, run length, tuning) the real logic will read. The inert
 * version quits no one: it returns the roster unchanged and keeps the current status.
 */
export function evaluateAttrition(
  roster: readonly Engineer[],
  state: GameState,
): AttritionOutcome {
  return { roster, status: state.status };
}
