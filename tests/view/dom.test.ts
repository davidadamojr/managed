// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { mount } from '../../src/view/dom';
import { createRunStore, type RunStore } from '../../src/view/store';
import { newRun, type GameState } from '../../src/engine';
import { controlLabel, panelCopy, screenNote } from '../../src/content/copy';
import { planningScreen } from './screens';
import {
  completedRun,
  engineer,
  failedRun,
  read,
  runState,
  summary,
} from './fixtures';

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
    const capacity = planningScreen(store.view()).attention.capacity;
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
    const capacity = planningScreen(store.view()).attention.capacity;
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
    const ticketId = planningScreen(store.view()).backlog.tickets[0]!.id;

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

  it('resolves the sprint, shows its summary, and plans on from there', () => {
    const { container, store } = mountRun();
    expect(container.querySelector('.sprint-label')!.textContent).toBe('Sprint 1 of 6');

    container.querySelector<HTMLButtonElement>('.resolve-btn')!.click();

    // The resolved sprint is read before the next one is planned.
    expect(store.state().sprintIndex).toBe(1);
    expect(container.querySelector('.summary-screen')).not.toBeNull();
    expect(container.querySelector('.sprint-label')!.textContent).toBe('Sprint 1 of 6');

    container.querySelector<HTMLButtonElement>('.advance-btn')!.click();

    expect(container.querySelector('.run-screen')).not.toBeNull();
    expect(container.querySelector('.sprint-label')!.textContent).toBe('Sprint 2 of 6');
    // The read is now the engine's note rather than the pre-first-sprint placeholder.
    expect(container.querySelector('.engineer-read')!.textContent).not.toBe('No read yet.');
  });
});

describe('in-context labels', () => {
  /** The panel labels the planning screen is meant to teach by naming. */
  const NAMED_PANELS = ['roster', 'backlog', 'roadmap', 'attention', 'crunch'] as const;

  it('names every panel and explains it in one line, from the copy data', () => {
    const { container } = mountRun();

    for (const key of NAMED_PANELS) {
      const section = container.querySelector(`.panel.${key}`);
      expect(section, `no ${key} panel on the planning screen`).not.toBeNull();
      expect(section!.querySelector('.panel-title')!.textContent).toBe(panelCopy(key).title);
      expect(section!.querySelector('.panel-note')!.textContent).toBe(panelCopy(key).note);
    }
  });

  it('labels the controls with the words the copy gives them', () => {
    const { container } = mountRun();

    expect(container.querySelector('.resolve-btn')!.textContent).toBe(controlLabel('resolve'));
    expect(container.querySelector('.crunch-label')!.textContent).toContain(controlLabel('crunch'));
    expect(container.querySelector('.assign-select option')!.textContent).toBe(controlLabel('idle'));
    expect(container.querySelector('.assign-select')!.getAttribute('aria-label')).toContain(
      controlLabel('assign'),
    );
    expect(container.querySelector('.header-note')!.textContent).toBe(screenNote('planning'));
  });

  it('labels the sprint summary as what it is', () => {
    const { container, store } = mountRun();
    store.resolve();

    expect(container.querySelector('.header-note')!.textContent).toBe(screenNote('summary'));
    expect(container.querySelector('.panel.reads .panel-title')!.textContent).toBe(
      panelCopy('reads').title,
    );
    expect(container.querySelector('.panel.reads .panel-note')!.textContent).toBe(
      panelCopy('reads').note,
    );
  });

  it('keeps saying that the roadmap is not the thing that ends a run', () => {
    // The label follows the bar onto the ending screen, where the temptation to read a
    // shortfall as the cause of the loss is strongest.
    const { container } = mountRun(failedRun());
    expect(container.querySelector('.panel.roadmap .panel-note')!.textContent).toBe(
      panelCopy('roadmap').note,
    );
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

describe('the sprint summary screen', () => {
  /** Mount a run and resolve one sprint — the screen the store lands on afterwards. */
  function mountSummary(state: GameState = newRun(SEED)): Mounted {
    const mounted = mountRun(state);
    mounted.store.resolve();
    return mounted;
  }

  it('renders what shipped, roadmap progress, a read per engineer, and the way onward', () => {
    const { container, store } = mountSummary();

    expect(container.querySelector('.summary-screen')).not.toBeNull();
    expect(container.querySelector('.sprint-label')!.textContent).toBe('Sprint 1 of 6');
    expect(container.querySelector('.shipped')).not.toBeNull();
    expect(container.querySelector('.roadmap-progress')!.textContent).toContain('shipped');
    expect(container.querySelectorAll('.read-card')).toHaveLength(store.state().roster.length);
    expect(container.querySelector('.advance-btn')!.textContent).toBe('Plan the next sprint');
  });

  it('names each engineer and shows the engine\'s note, never a number', () => {
    const { container, store } = mountSummary();
    const name = store.state().roster[0]!.name;
    const card = container.querySelector('.read-card')!;

    expect(card.querySelector('.read-name')!.textContent).toBe(name);
    const note = card.querySelector('.read-note')!.textContent!;
    expect(note).toContain(name);
    expect(note).not.toMatch(/\d/);
  });

  it('never renders a raw morale or burnout value', () => {
    const { container, store } = mountRun();
    store.setCrunch(true);
    store.resolve();
    expect(container.textContent).not.toMatch(/morale|burnout/i);
  });

  it('shows a first summary as state without a direction', () => {
    const { container } = mountSummary();
    // One sprint played, so each strip is a single point: where the person is, with no
    // prior to have moved from.
    for (const card of container.querySelectorAll('.read-card')) {
      expect(card.querySelectorAll('.read-point')).toHaveLength(1);
      expect(card.querySelector('.read-point')!.getAttribute('data-sprint')).toBe('1');
    }
  });

  it('shows a slide across sprints as one band per sprint', () => {
    // Three sprints already read as steady, then dipping, then struggling. The screen
    // has to make that direction perceptible — a single sprint's note cannot carry it.
    const { container } = mountSummary(
      runState({
        sprintIndex: 3,
        roster: [engineer('eng-1', 'Priya')],
        history: [
          summary(0, [read('eng-1', 'steady')]),
          summary(1, [read('eng-1', 'dipping')]),
          summary(2, [read('eng-1', 'struggling')]),
        ],
      }),
    );

    const strip = container.querySelectorAll<HTMLElement>('.read-card .read-point');
    expect([...strip].map((point) => point.dataset.mood).slice(0, 3)).toEqual([
      'steady',
      'dipping',
      'struggling',
    ]);
    expect([...strip].map((point) => point.dataset.sprint).slice(0, 3)).toEqual(['1', '2', '3']);
  });

  it('renders an at-risk read as a human observation, never an alert', () => {
    // Burnout already inside the warning band, so the resolved sprint reads at-risk.
    const { container } = mountSummary(
      runState({
        roster: [engineer('eng-1', 'Priya', { burnout: 70 }), engineer('eng-2', 'Sam')],
      }),
    );

    const atRisk = container.querySelector('.read-card[data-engineer-id="eng-1"] .read-note')!;
    expect(atRisk.classList.contains('at-risk')).toBe(true);
    expect(atRisk.getAttribute('role')).toBe('note');
    expect(atRisk.textContent).toContain('Priya');
    expect(atRisk.textContent).not.toMatch(/warning|alert|critical|risk/i);
    expect(container.querySelector('[role="alert"], .error, .fail')).toBeNull();
  });

  it('renders the event that fired, in the engine\'s words', () => {
    const { container, store } = mountRun();
    // Events are a per-sprint chance, so play on until one surfaces; this seed's run
    // reaches one well inside its length.
    let guard = 0;
    while ((store.state().history ?? []).at(-1)?.event === undefined && guard < 12) {
      const next =
        container.querySelector<HTMLButtonElement>('.resolve-btn') ??
        container.querySelector<HTMLButtonElement>('.advance-btn')!;
      next.click();
      guard += 1;
    }

    const event = store.state().history!.at(-1)!.event!;
    expect(container.querySelector('.event-description')!.textContent).toBe(event.description);
  });
});

describe('the post-mortem screen', () => {
  it('names who left, traces the why, and echoes the warnings verbatim', () => {
    const state = failedRun();
    const { container } = mountRun(state);
    const trace = state.departure!;

    expect(container.querySelector('.outcome-screen')!.getAttribute('data-result')).toBe('failed');
    expect(container.querySelector('.post-mortem .panel-title')!.textContent).toContain('Priya');
    expect(container.querySelector('.departure-line')!.textContent).toContain('Sprint 4');
    expect(container.querySelector('.trace-crunch')!.textContent).toContain(
      String(trace.crunchSprints),
    );
    expect(container.querySelector('.trace-warnings')!.textContent).toContain(
      String(trace.warningsShown),
    );

    // The evidence is re-shown as it was written, not re-described.
    const echoes = container.querySelectorAll('.warning-echo');
    expect(echoes).toHaveLength(2);
    expect(echoes[0]!.textContent).toContain('Sprint 2');
    expect(echoes[0]!.textContent).toContain('Priya seems checked out lately.');
  });

  it('says so plainly when the slide was too fast to warn twice', () => {
    const base = failedRun();
    const { container } = mountRun({
      ...base,
      departure: { ...base.departure!, warningsShown: 0, fastBurnout: true },
    });
    expect(container.querySelector('.trace-fast')!.textContent).toContain('same sprint');
  });

  it('never prints a raw interior, and is not presented as an error', () => {
    const { container } = mountRun(failedRun());
    expect(container.textContent).not.toMatch(/morale|burnout/i);
    expect(container.querySelector('[role="alert"], .error, .fail')).toBeNull();
  });

  it('offers a new run that replaces the finished one', () => {
    const { container, store } = mountRun(failedRun());
    const button = container.querySelector<HTMLButtonElement>('.new-run-btn')!;
    expect(button.tagName).toBe('BUTTON');

    button.click();
    expect(store.state().status).toBe('active');
    expect(container.querySelector('.run-screen')).not.toBeNull();
  });
});

describe('the completion screen', () => {
  it('renders a plain run summary with no victory fanfare', () => {
    const { container } = mountRun(completedRun());

    expect(container.querySelector('.outcome-screen')!.getAttribute('data-result')).toBe(
      'completed',
    );
    expect(container.querySelector('.completion-line')!.textContent).toContain('still on the team');
    expect(container.querySelector('.survivors')!.textContent).toContain('Priya');
    expect(container.querySelector('.sprints-played')!.textContent).toContain('of 6');
    expect(container.querySelector('.roadmap-progress')).not.toBeNull();
    expect(container.textContent).not.toMatch(/congratulations|victory|you win|well done/i);
    expect(container.querySelector('.post-mortem')).toBeNull();
  });
});

describe('playing a whole run through the screens', () => {
  it('reaches the ending through resolve → summary → advance, on native controls throughout', () => {
    const { container, store } = mountRun();
    let guard = 0;
    while (container.querySelector('.outcome-screen') === null && guard < 20) {
      const next =
        container.querySelector<HTMLButtonElement>('.resolve-btn') ??
        container.querySelector<HTMLButtonElement>('.advance-btn')!;
      expect(next.tagName).toBe('BUTTON'); // every step forward is focusable
      next.click();
      guard += 1;
    }

    expect(store.state().status).toBe('completed');
    expect(container.querySelector('.outcome-screen')!.getAttribute('data-result')).toBe(
      'completed',
    );
  });

  it('lands on the post-mortem when sustained crunch loses someone', () => {
    // The delayed echo, played through the UI: crunch everyone on fresh work every
    // sprint, and the burnout it accrues eventually costs the manager a person.
    const { container, store } = mountRun();
    let guard = 0;
    while (container.querySelector('.outcome-screen') === null && guard < 20) {
      if (container.querySelector('.resolve-btn') !== null) {
        const state = store.state();
        store.setCrunch(true);
        state.roster.forEach((eng, i) => {
          const ticket = state.backlog[state.sprintIndex * state.roster.length + i];
          if (ticket) store.assignTicket(eng.id, ticket.id);
        });
        container.querySelector<HTMLButtonElement>('.resolve-btn')!.click();
      } else {
        container.querySelector<HTMLButtonElement>('.advance-btn')!.click();
      }
      guard += 1;
    }

    expect(store.state().status).toBe('failed');
    expect(container.querySelector('.post-mortem')).not.toBeNull();
    // The loss was foreseeable: the player was shown at least one of these first.
    expect(container.querySelectorAll('.warning-echo').length).toBeGreaterThanOrEqual(1);
  });
});
