// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { mount } from '../../src/view/dom';
import { createRunStore, type RunStore } from '../../src/view/store';
import { newRun, type GameState } from '../../src/engine';
import { framingCopy, controlLabel } from '../../src/content/copy';

// The first-time experience, which is one screen long. A new player is shown the goal and
// one way in; a returning player never sees it. Everything asserted here is about that
// being *all* it is — the failure this guards against is an onboarding flow growing steps.

const SEED = 20260728;

interface Mounted {
  readonly container: HTMLElement;
  readonly store: RunStore;
}

/** Mount a run the way the composition root does for a brand-new player. */
function mountFirstVisit(state: GameState = newRun(SEED)): Mounted {
  const container = document.createElement('main');
  const store = createRunStore(state, { openWithFraming: true });
  mount(container, store);
  return { container, store };
}

/** Click the one control on the framing screen. */
function start(container: HTMLElement): void {
  container.querySelector<HTMLButtonElement>('.start-btn')!.click();
}

describe('the framing screen', () => {
  it('opens on the framing when the player is new to this browser', () => {
    const { container, store } = mountFirstVisit();

    expect(store.phase()).toBe('framing');
    expect(container.querySelector('.framing-screen')).not.toBeNull();
    expect(container.querySelector('.run-screen')).toBeNull();
  });

  it('shows the goal in the game\'s own words', () => {
    const { container } = mountFirstVisit();
    const lines = [...container.querySelectorAll('.framing-line')].map((p) => p.textContent);

    expect(lines).toEqual(framingCopy().lines);
    expect(container.querySelector('.framing-title')!.textContent).toBe(framingCopy().title);
  });

  it('offers exactly one control, labelled as the way in', () => {
    // The shape of "no tutorial": there is nothing here to click but the way forward.
    const { container } = mountFirstVisit();
    const controls = container.querySelectorAll('button, select, input, a');

    expect(controls).toHaveLength(1);
    expect(controls[0]!.tagName).toBe('BUTTON'); // focusable, so keyboard-only entry works
    expect(controls[0]!.textContent).toBe(controlLabel('start'));
  });

  it('shows no run state — the team is met on the run screen, not here', () => {
    const { container } = mountFirstVisit();

    expect(container.querySelector('.engineer-card')).toBeNull();
    expect(container.querySelector('.ticket')).toBeNull();
    expect(container.textContent).not.toMatch(/sprint \d/i);
  });
});

describe('getting into the run', () => {
  it('lands directly on the run screen in one action — framing → run, with no steps between', () => {
    const { container, store } = mountFirstVisit();

    start(container);

    expect(store.phase()).toBe('planning');
    expect(container.querySelector('.run-screen')).not.toBeNull();
    expect(container.querySelector('.framing-screen')).toBeNull();
    // The very first thing after the framing is a playable sprint, not another notice.
    expect(container.querySelector('.resolve-btn')).not.toBeNull();
    expect(container.querySelector('.engineer-card')).not.toBeNull();
  });

  it('does not come back once the run is under way', () => {
    const { container, store } = mountFirstVisit();
    start(container);

    container.querySelector<HTMLButtonElement>('.resolve-btn')!.click();
    container.querySelector<HTMLButtonElement>('.advance-btn')!.click();

    expect(store.phase()).toBe('planning');
    expect(container.querySelector('.framing-screen')).toBeNull();
  });

  it('does not come back between runs either', () => {
    const { container, store } = mountFirstVisit({ ...newRun(SEED), status: 'failed' });
    // A finished run opens at its ending even for a first visit; there is nothing to frame.
    expect(store.phase()).toBe('ended');

    container.querySelector<HTMLButtonElement>('.new-run-btn')!.click();
    expect(store.phase()).toBe('planning');
    expect(container.querySelector('.framing-screen')).toBeNull();
  });
});

describe('the returning player', () => {
  it('goes straight to the run, with no framing to dismiss', () => {
    const container = document.createElement('main');
    const store = createRunStore(newRun(SEED));
    mount(container, store);

    expect(store.phase()).toBe('planning');
    expect(container.querySelector('.framing-screen')).toBeNull();
    expect(container.querySelector('.run-screen')).not.toBeNull();
  });

  it('is unaffected by a stray dispatch from a screen that is not showing', () => {
    const store = createRunStore(newRun(SEED));
    store.beginRun();
    expect(store.phase()).toBe('planning');
  });
});
