/**
 * The run store — the view's small unidirectional heart. It holds exactly three things:
 * the committed `GameState`, the `SprintActions` plan being assembled for the current
 * sprint, and which screen is showing. Every player gesture is a dispatch that folds an
 * engine function over one of those values and notifies subscribers with a fresh
 * `ScreenView`.
 *
 * The store implements no game rule. It only *calls* engine operations — `assign`,
 * `spendAttention`, `setCrunch`, and, on Resolve, the pure `tick` — and swaps its own
 * reference to their results. Because those operations never mutate their inputs, the
 * store never mutates state either: a resolve replaces `state` with the next state the
 * engine returns and resets the draft to a fresh empty plan. That is the whole engine/view
 * contract, enforced by construction.
 *
 * The screen phase is the one piece of state that is the view's own, and it is navigation
 * rather than rule: a resolved sprint lands on its summary, an advance goes on to the next
 * sprint or to the ending, and which of those two it is comes from asking the engine's
 * `status` — never from the store deciding when a run is over.
 *
 * Persistence and the next run are injected, not reached for. The store takes an
 * `onCommit` callback and calls it after every state commit; the composition root wires
 * that to the persistence layer at the browser edge. Keeping storage out of the store is
 * what lets the store — and all of the view's logic above the DOM — be exercised
 * headlessly with no `localStorage`.
 */

import {
  tick,
  newRun,
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
import { buildScreenView, type ScreenPhase, type ScreenView } from './viewModel';

/** Notified with the freshly-built screen after every dispatch that changes what shows. */
export type RunListener = (view: ScreenView) => void;

export interface RunStoreOptions {
  /**
   * Called with the new state after every commit — a resolved sprint or a fresh run. This
   * is the persistence seam: the composition root wires it to `saveRun(localStorage,
   * state)`, so the store itself never touches browser storage.
   */
  readonly onCommit?: (state: GameState) => void;
  /**
   * How "start a new run" builds its run. The default advances the seed by one, so a new
   * run is a different team and backlog while staying entirely reproducible — no clock and
   * no `Math.random()` leak in at this edge either.
   */
  readonly nextRun?: (previous: GameState) => GameState;
}

/**
 * The store's surface. Reads (`view`, `state`, `draft`) and dispatches (assign, spend,
 * crunch, resolve). Every dispatch is a thin wrapper over an engine operation; none of
 * them computes a rule.
 */
export interface RunStore {
  /** The screen to render, freshly projected from state + draft + phase. */
  view(): ScreenView;
  /** The committed run state — exposed for the composition root's persistence wiring. */
  state(): GameState;
  /** The plan being assembled for the current sprint. */
  draft(): SprintActions;
  /** Which screen is showing. */
  phase(): ScreenPhase;
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
  /** Leave the summary — on to the next sprint, or to the ending if the run is over. */
  advance(): void;
  /** Abandon the finished run and begin a fresh one. */
  startNewRun(): void;
  /** Subscribe to view updates; returns an unsubscribe function. */
  subscribe(listener: RunListener): () => void;
}

/** A new run keeps the seed lineage: reproducible, but a different board each time. */
function successorRun(previous: GameState): GameState {
  return newRun(previous.seed + 1);
}

/**
 * Create a run store over an initial state. The draft starts empty — a fresh sprint plan
 * with nobody assigned, no crunch, no attention spent. A state that is already terminal
 * opens at its ending rather than at a planning screen it can do nothing with, which is
 * what a resumed save of a finished run needs.
 */
export function createRunStore(
  initial: GameState,
  options: RunStoreOptions = {},
): RunStore {
  let state = initial;
  let draft = emptyActions();
  let phase: ScreenPhase = initial.status === 'active' ? 'planning' : 'ended';
  const nextRun = options.nextRun ?? successorRun;
  const listeners = new Set<RunListener>();

  function notify(): void {
    const view = buildScreenView({ state, draft }, phase);
    for (const listener of listeners) listener(view);
  }

  return {
    view: () => buildScreenView({ state, draft }, phase),
    state: () => state,
    draft: () => draft,
    phase: () => phase,

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
      phase = 'summary';
      options.onCommit?.(state);
      notify();
    },

    advance() {
      if (phase !== 'summary') return;
      phase = state.status === 'active' ? 'planning' : 'ended';
      notify();
    },

    startNewRun() {
      state = nextRun(state);
      draft = emptyActions();
      phase = 'planning';
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
