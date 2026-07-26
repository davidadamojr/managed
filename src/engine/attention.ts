/**
 * The attention economy — the management-side juggle. Each sprint the manager has a
 * small, scarce pool of attention points to spend across a tiny set of people
 * actions. The scarcity is deliberate and load-bearing: the pool is smaller than the
 * team, so the player is forced to choose whom *not* to attend to. Making that choice
 * hurt is the whole reason the pool is capped rather than generous.
 *
 * Two invariants shape this file. Capacity is never written as a literal — it comes
 * from `attentionCapacityFor(manager)`, the single seam that lets the manager's own
 * standing and strain bend the pool later without any caller changing. And "how much
 * is left" is always derived from the plan's committed actions, never stored as a
 * second copy, because a stored remaining could silently disagree with the plan.
 *
 * This module owns the budget, not the consequences: it records which actions were
 * committed and enforces the cap. Their morale and throughput effects are applied
 * when the sprint resolves. An exhausted pool is an ordinary, reportable state here,
 * never an error.
 */

import { getTuning } from '../content';
import {
  attentionCapacityFor,
  type AttentionPool,
  type ManagerState,
} from './entities';
import type { AttentionActionKind, AttentionAction, SprintActions } from './actions';
import type { GameState } from './state';

/**
 * The attention cost of one action. Sourced from tuning so the economy can be
 * retuned by editing data alone — no call site changes when a cost moves.
 */
export function attentionActionCost(kind: AttentionActionKind): number {
  return getTuning().attention.actionCost[kind];
}

/** Total attention a plan has committed: the summed cost of its actions. */
export function attentionSpent(actions: SprintActions): number {
  return actions.attentionActions.reduce(
    (sum, action) => sum + attentionActionCost(action.kind),
    0,
  );
}

/**
 * A fresh, full pool for a sprint. Capacity is sourced from manager state through the
 * one seam, and `remaining` starts equal to it. Rebuilding the pool from scratch each
 * sprint boundary is what makes attention non-bankable: unspent points do not carry
 * over, and any future manager-side depletion has exactly one place to take hold.
 */
export function freshAttentionPool(manager: ManagerState): AttentionPool {
  const capacity = attentionCapacityFor(manager);
  return { capacity, remaining: capacity };
}

/**
 * Attention still available for the current plan. Derived — the sprint's capacity
 * minus committed spend, floored at zero — because the plan is the single source of
 * truth for what has been spent, so a derived remaining can never drift from it.
 */
export function attentionRemaining(
  state: GameState,
  actions: SprintActions,
): number {
  return Math.max(0, state.attention.capacity - attentionSpent(actions));
}

/**
 * The live pool for a plan-in-progress: the sprint's capacity with `remaining`
 * recomputed from committed spend. Offered as the same shape as the stored pool so a
 * caller can render the budget updating as a plan is built, without recomputing it.
 */
export function currentAttentionPool(
  state: GameState,
  actions: SprintActions,
): AttentionPool {
  return {
    capacity: state.attention.capacity,
    remaining: attentionRemaining(state, actions),
  };
}

/**
 * Whether the plan can still afford one more action of this kind this sprint. When it
 * cannot, the action is simply unavailable — a fact to present, not a failure: the
 * point of the game is that the manager runs out of attention before running out of
 * things worth doing.
 */
export function canAffordAttention(
  state: GameState,
  actions: SprintActions,
  kind: AttentionActionKind,
): boolean {
  return attentionActionCost(kind) <= attentionRemaining(state, actions);
}

/**
 * The result of trying to commit one attention action: either it fits the budget and
 * a new plan carrying it is returned, or the pool cannot afford it and the shortfall
 * is reported as data. Returned rather than thrown so an empty pool stays an ordinary
 * state a caller can surface plainly.
 */
export type AttentionSpend =
  | { readonly ok: true; readonly actions: SprintActions }
  | {
      readonly ok: false;
      readonly reason: 'insufficient-attention';
      readonly kind: AttentionActionKind;
      readonly cost: number;
      readonly remaining: number;
    };

/**
 * Commit one attention action to the plan when the budget allows, returning a new
 * plan with it appended; otherwise leave the plan untouched and report the shortfall.
 * This is the one hard cap in the plan: assignment is left permissive on purpose so
 * the over-capacity juggle can be expressed, but attention is gated here so
 * `remaining` can never be driven negative.
 */
export function spendAttention(
  state: GameState,
  actions: SprintActions,
  action: AttentionAction,
): AttentionSpend {
  if (!canAffordAttention(state, actions, action.kind)) {
    return {
      ok: false,
      reason: 'insufficient-attention',
      kind: action.kind,
      cost: attentionActionCost(action.kind),
      remaining: attentionRemaining(state, actions),
    };
  }
  return {
    ok: true,
    actions: {
      ...actions,
      attentionActions: [...actions.attentionActions, action],
    },
  };
}
