/**
 * The composition root — the one place the pure view meets the browser. It wires the three
 * real-world edges the rest of the view is kept clean of: the DOM mount point, browser
 * `localStorage` (through the persistence layer, never touched directly), and the seed for
 * a fresh run. Everything below it — the store, the projection, the renderer — stays
 * headless and testable because this file, and only this file, holds the impurity.
 *
 * Startup resumes a saved run if one exists and otherwise starts a fresh seeded run. The
 * seed comes from a `?seed=` query param or a fixed default, so the app stays reproducible
 * by eye with no ambient nondeterminism even at this edge. Whether a save was found is
 * also the answer to "is this player new", which is what decides if the framing screen
 * shows — a question about this browser, so it belongs at this edge and nowhere deeper.
 *
 * This module is deliberately not unit-tested: it is glue over already-tested parts, and
 * its only logic is choosing between resume and new. It is typechecked by the view config
 * (which enables the DOM lib) rather than the engine config (which forbids it).
 */

import { newRun, type GameState } from '../engine';
import { loadRun, saveRun } from '../persistence';
import { createRunStore } from './store';
import { mount } from './dom';

/** The seed used when no `?seed=` is given — a fixed number keeps a fresh run reproducible. */
const DEFAULT_SEED = 20260728;

/** The seed for a new run: the `?seed=` query param when valid, else the fixed default. */
function chosenSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  if (param === null) return DEFAULT_SEED;
  const parsed = Number(param);
  return Number.isFinite(parsed) ? parsed : DEFAULT_SEED;
}

/** What the app opens with: the saved run if there is one, otherwise a fresh seeded run. */
interface Opening {
  readonly state: GameState;
  /**
   * Whether this browser had a run already. It is the whole test for "has this player
   * been here before" — a save exists, so they have, and they get straight back to play
   * with no framing screen to dismiss. A player who reads the framing and closes the tab
   * without starting is counted as returning, which errs toward never nagging.
   */
  readonly returning: boolean;
}

function opening(): Opening {
  const loaded = loadRun(window.localStorage);
  return loaded.ok
    ? { state: loaded.state, returning: true }
    : { state: newRun(chosenSeed()), returning: false };
}

/** Wire the store to persistence and the DOM, then mount the run screen. */
function bootstrap(): void {
  const container = document.getElementById('app');
  if (container === null) throw new Error('view mount point #app not found');

  const { state: initial, returning } = opening();
  const store = createRunStore(initial, {
    openWithFraming: !returning,
    onCommit: (state) => {
      saveRun(window.localStorage, state);
    },
  });
  mount(container, store);

  // Persist immediately so even a brand-new run is resumable from sprint 0, not only once
  // the first sprint has resolved.
  saveRun(window.localStorage, store.state());
}

bootstrap();
