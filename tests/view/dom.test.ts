// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { mount } from '../../src/view/dom';
import { createRunStore, type RunStore } from '../../src/view/store';
import { newRun, type GameState } from '../../src/engine';

const SEED = 20260728;

interface Mounted {
  readonly container: HTMLElement;
  readonly store: RunStore;
}

/** Mount a fresh run into a detached container — one isolated screen per test. */
function mountRun(state: GameState = newRun(SEED)): Mounted {
  const container = document.createElement('main');
  const store = createRunStore(state);
  mount(container, store);
  return { container, store };
}

/** Fire a native change event, the way a keyboard or mouse edit would. */
function change(element: HTMLElement): void {
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('roster panel', () => {
  it('renders one card per engineer with name, four skills, a read, and an assign control', () => {
    const { container, store } = mountRun();
    const cards = container.querySelectorAll('.engineer-card');
    expect(cards).toHaveLength(store.state().roster.length);

    const first = cards[0]!;
    expect(first.querySelector('.engineer-name')!.textContent).toBe(store.state().roster[0]!.name);
    expect(first.querySelectorAll('.engineer-skills .skill')).toHaveLength(4);
    expect(first.querySelector('.engineer-read')!.textContent).toBe('No read yet.');
    expect(first.querySelector('select.assign-select')).not.toBeNull();
  });

  it('never renders a raw morale or burnout value', () => {
    // Resolve once so interiors have moved; the screen still must not name or show them.
    const { store } = mountRun();
    store.setCrunch(true);
    store.resolve();
    const { container } = mountRun(store.state());

    expect(container.textContent).not.toMatch(/morale|burnout/i);
    // The read shown is the engine's fuzzy note — a phrase, never a bare number.
    const read = container.querySelector('.engineer-read')!.textContent!;
    expect(read.length).toBeGreaterThan(0);
    expect(read).not.toBe('No read yet.');
  });
});

describe('backlog panel', () => {
  it('renders every in-play ticket with skill and size, and a plain over-capacity caption', () => {
    const { container, store } = mountRun();
    const inPlay = store.state().backlog.filter((t) => t.status !== 'done');
    expect(container.querySelectorAll('.ticket-list .ticket')).toHaveLength(inPlay.length);

    const caption = container.querySelector('.backlog-capacity')!.textContent!;
    expect(caption).toContain('tickets in play');
    expect(caption).toContain('team of');

    const ticket = container.querySelector('.ticket')!.textContent!;
    expect(ticket).toMatch(/frontend|backend|infra|debugging/);
    expect(ticket).toContain('pt');
  });
});

describe('roadmap bar', () => {
  it('shows engine progress and never marks being behind as a failure', () => {
    const { container } = mountRun();
    expect(container.querySelector('.roadmap-progress')!.textContent).toContain('0 /');
    expect(container.querySelector('progress.roadmap-meter')).not.toBeNull();
    // Behind schedule is pressure, not failure — nothing on screen is an error/alert.
    expect(container.querySelector('.error, .fail, [role="alert"]')).toBeNull();
  });
});

describe('attention tray', () => {
  it('shows remaining/capacity and lists the three actions', () => {
    const { container, store } = mountRun();
    const capacity = store.view().attention.capacity;
    expect(container.querySelector('.attention-pool')!.textContent).toContain(`${capacity} / ${capacity}`);

    const legend = container.querySelectorAll('.attention-legend .attention-action');
    expect(legend).toHaveLength(3);
    const text = container.querySelector('.attention-legend')!.textContent!;
    expect(text).toContain('1:1');
    expect(text).toContain('Unblock');
    expect(text).toContain('Recognize');
  });

  it('renders an exhausted pool plainly — remaining 0, actions disabled, no error', () => {
    const { container, store } = mountRun();
    const capacity = store.view().attention.capacity;
    for (let i = 0; i < capacity; i += 1) store.spend('oneOnOne', 'eng-1');

    expect(container.querySelector('.attention-pool')!.textContent).toContain(`0 / ${capacity}`);
    for (const button of container.querySelectorAll<HTMLButtonElement>('.attn-btn')) {
      expect(button.disabled).toBe(true);
    }
    expect(container.querySelector('.error, [role="alert"]')).toBeNull();
  });
});

describe('crunch toggle', () => {
  it('reflects the draft flag and updates it on change', () => {
    const { container, store } = mountRun();
    const checkbox = container.querySelector<HTMLInputElement>('.crunch-toggle')!;
    expect(checkbox.checked).toBe(false);

    checkbox.checked = true;
    change(checkbox);
    expect(store.draft().crunch).toBe(true);
    // The rebuilt checkbox reflects the new flag.
    expect(container.querySelector<HTMLInputElement>('.crunch-toggle')!.checked).toBe(true);
  });
});

describe('assembling actions through the UI', () => {
  it('assigns an engineer to a ticket via the select', () => {
    const { container, store } = mountRun();
    const select = container.querySelector<HTMLSelectElement>('.assign-select')!;
    const engineerId = select.dataset.engineerId!;
    const ticketId = store.view().backlog.tickets[0]!.id;

    select.value = ticketId;
    change(select);
    expect(store.draft().assignments[engineerId]).toBe(ticketId);
  });

  it('spends attention on an engineer via a card button', () => {
    const { container, store } = mountRun();
    const button = container.querySelector<HTMLButtonElement>('.attn-btn')!;
    button.click();

    const committed = store.draft().attentionActions;
    expect(committed).toHaveLength(1);
    expect(committed[0]!.engineerId).toBe(button.dataset.engineerId);
    expect(committed[0]!.kind).toBe(button.dataset.kind);
  });

  it('resolves the sprint and re-reads the advanced state', () => {
    const { container, store } = mountRun();
    expect(container.querySelector('.sprint-label')!.textContent).toBe('Sprint 1 of 6');

    container.querySelector<HTMLButtonElement>('.resolve-btn')!.click();

    expect(store.state().sprintIndex).toBe(1);
    expect(container.querySelector('.sprint-label')!.textContent).toBe('Sprint 2 of 6');
    // The read is now the engine's note rather than the pre-first-sprint placeholder.
    expect(container.querySelector('.engineer-read')!.textContent).not.toBe('No read yet.');
  });
});

describe('keyboard-operable, native controls', () => {
  it('builds the core actions from native, focusable elements', () => {
    const { container } = mountRun();
    expect(container.querySelector('.assign-select')!.tagName).toBe('SELECT');
    expect(container.querySelector('.attn-btn')!.tagName).toBe('BUTTON');
    const crunch = container.querySelector<HTMLInputElement>('.crunch-toggle')!;
    expect(crunch.tagName).toBe('INPUT');
    expect(crunch.type).toBe('checkbox');
    expect(container.querySelector('.resolve-btn')!.tagName).toBe('BUTTON');
  });
});

describe('terminal state', () => {
  it('replaces the resolve button with a plain notice when the run ends', () => {
    const { container, store } = mountRun();
    let guard = 0;
    while (container.querySelector('.resolve-btn') !== null && guard < 20) {
      container.querySelector<HTMLButtonElement>('.resolve-btn')!.click();
      guard += 1;
    }
    expect(store.state().status).toBe('completed');
    expect(container.querySelector('.resolve-btn')).toBeNull();
    expect(container.querySelector('.run-ended')!.textContent).toContain('complete');
  });
});
