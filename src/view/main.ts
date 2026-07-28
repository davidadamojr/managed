/**
 * The composition root — the one place the pure view meets the browser. It wires the three
 * real-world edges the rest of the view is kept clean of: the DOM mount point, browser
 * `localStorage` (through the persistence layer, never touched directly), and the seed for
 * a fresh run. Everything below it — the store, the projection, the renderer — stays
 * headless and testable because this file, and only this file, holds the impurity.
 *
 * Startup resumes a saved run if one exists and otherwise starts a fresh seeded run. The
 * seed comes from a `?seed=` query param or a fixed default, so the app stays reproducible
 * by eye with no ambient nondeterminism even at this edge. A richer new-run/first-time
 * flow is a later prompt; this is the minimum that makes the screen playable.
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

/** Resume the saved run if there is one; otherwise begin a fresh seeded run. */
function initialState(): GameState {
  const loaded = loadRun(window.localStorage);
  return loaded.ok ? loaded.state : newRun(chosenSeed());
}

/** Wire the store to persistence and the DOM, then mount the run screen. */
function bootstrap(): void {
  const container = document.getElementById('app');
  if (container === null) throw new Error('view mount point #app not found');

  const store = createRunStore(initialState(), {
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
