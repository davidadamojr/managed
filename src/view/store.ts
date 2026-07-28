/**
 * The run store — the view's small unidirectional heart. It holds exactly two things:
 * the committed `GameState` and the `SprintActions` plan being assembled for the current
 * sprint. Every player gesture is a dispatch that folds an engine function over one of
 * those two values and notifies subscribers with a fresh `RunView`.
 *
 * The store implements no game rule. It only *calls* engine operations — `assign`,
 * `spendAttention`, `setCrunch`, and, on Resolve, the pure `tick` — and swaps its own
 * reference to their results. Because those operations never mutate their inputs, the
 * store never mutates state either: a resolve replaces `state` with the next state the
 * engine returns and resets the draft to a fresh empty plan. That is the whole engine/view
 * contract, enforced by construction.
 *
 * Persistence is injected, not reached for. The store takes an `onCommit` callback and
 * calls it after each resolved tick; the composition root wires that to the persistence
 * layer at the browser edge. Keeping storage out of the store is what lets the store — and
 * all of the view's logic above the DOM — be exercised headlessly with no `localStorage`.
 */

import {
  tick,
  emptyActions,
  assign as assignAction,
  clearAssignment as clearAssignmentAction,
  setCrunch as setCrunchAction,
  toggleCrunch as toggleCrunchAction,
  spendAttention as spendAttentionAction,
  type GameState,
  type SprintActions,
  type AttentionActionKind,
} from '../engine';
import { buildRunView, type RunView } from './viewModel';

/** Notified with the freshly-built view after every dispatch that changes state or plan. */
export type RunListener = (view: RunView) => void;

export interface RunStoreOptions {
  /**
   * Called with the new state after every committed sprint (a resolved tick). This is the
   * persistence seam: the composition root wires it to `saveRun(localStorage, state)`, so
   * the store itself never touches browser storage.
   */
  readonly onCommit?: (state: GameState) => void;
}

/**
 * The store's surface. Reads (`view`, `state`, `draft`) and dispatches (assign, spend,
 * crunch, resolve). Every dispatch is a thin wrapper over an engine operation; none of
 * them computes a rule.
 */
export interface RunStore {
  /** The current view model, freshly projected from state + draft. */
  view(): RunView;
  /** The committed run state — exposed for the composition root's persistence wiring. */
  state(): GameState;
  /** The plan being assembled for the current sprint. */
  draft(): SprintActions;
  assignTicket(engineerId: string, ticketId: string): void;
  clearTicket(engineerId: string): void;
  /**
   * Commit one attention action to the plan. Returns whether it fit the budget — the UI
   * disables unaffordable actions, so a `false` is a harmless defensive no-op, never an
   * error.
   */
  spend(kind: AttentionActionKind, engineerId: string): boolean;
  setCrunch(crunch: boolean): void;
  toggleCrunch(): void;
  /** Resolve the sprint: dispatch a tick, adopt the next state, reset the plan, persist. */
  resolve(): void;
  /** Subscribe to view updates; returns an unsubscribe function. */
  subscribe(listener: RunListener): () => void;
}

/**
 * Create a run store over an initial state. The draft starts empty — a fresh sprint plan
 * with nobody assigned, no crunch, no attention spent.
 */
export function createRunStore(
  initial: GameState,
  options: RunStoreOptions = {},
): RunStore {
  let state = initial;
  let draft = emptyActions();
  const listeners = new Set<RunListener>();

  function notify(): void {
    const view = buildRunView({ state, draft });
    for (const listener of listeners) listener(view);
  }

  return {
    view: () => buildRunView({ state, draft }),
    state: () => state,
    draft: () => draft,

    assignTicket(engineerId, ticketId) {
      draft = assignAction(draft, engineerId, ticketId);
      notify();
    },

    clearTicket(engineerId) {
      draft = clearAssignmentAction(draft, engineerId);
      notify();
    },

    spend(kind, engineerId) {
      const result = spendAttentionAction(state, draft, { kind, engineerId });
      if (!result.ok) return false;
      draft = result.actions;
      notify();
      return true;
    },

    setCrunch(crunch) {
      draft = setCrunchAction(draft, crunch);
      notify();
    },

    toggleCrunch() {
      draft = toggleCrunchAction(draft);
      notify();
    },

    resolve() {
      // A terminal run has no sprint left to resolve; the UI hides Resolve there, and this
      // guard makes a stray dispatch a plain no-op rather than an error.
      if (state.status !== 'active') return;
      state = tick(state, draft).state;
      draft = emptyActions();
      options.onCommit?.(state);
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
