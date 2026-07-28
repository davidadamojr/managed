import { describe, it, expect } from 'vitest';
import { createRunStore } from '../../src/view/store';
import { newRun, emptyActions, type GameState } from '../../src/engine';
import type { RunView } from '../../src/view/viewModel';

const SEED = 20260728;

function firstOpenTicketId(state: GameState): string {
  const ticket = state.backlog.find((t) => t.status !== 'done');
  if (ticket === undefined) throw new Error('fixture: expected an open ticket');
  return ticket.id;
}

describe('assignment dispatch', () => {
  it('assigns and clears an engineer\'s ticket in the draft, notifying each time', () => {
    const store = createRunStore(newRun(SEED));
    const views: RunView[] = [];
    store.subscribe((v) => views.push(v));
    const ticketId = firstOpenTicketId(store.state());

    store.assignTicket('eng-1', ticketId);
    expect(store.draft().assignments['eng-1']).toBe(ticketId);
    expect(views.at(-1)!.roster.find((c) => c.id === 'eng-1')!.assignedTicketId).toBe(ticketId);

    store.clearTicket('eng-1');
    expect('eng-1' in store.draft().assignments).toBe(false);
    expect(views).toHaveLength(2);
  });
});

describe('attention dispatch', () => {
  it('commits an affordable action and refuses one the budget cannot cover', () => {
    const store = createRunStore(newRun(SEED));
    const capacity = store.view().attention.capacity;

    for (let i = 0; i < capacity; i += 1) {
      expect(store.spend('oneOnOne', 'eng-1')).toBe(true);
    }
    expect(store.draft().attentionActions).toHaveLength(capacity);

    // The pool is dry; the next spend is refused and leaves the plan untouched.
    expect(store.spend('recognize', 'eng-2')).toBe(false);
    expect(store.draft().attentionActions).toHaveLength(capacity);
  });
});

describe('crunch dispatch', () => {
  it('toggles and sets the team-wide crunch flag', () => {
    const store = createRunStore(newRun(SEED));
    expect(store.draft().crunch).toBe(false);

    store.toggleCrunch();
    expect(store.draft().crunch).toBe(true);

    store.setCrunch(false);
    expect(store.draft().crunch).toBe(false);
  });
});

describe('resolve dispatch', () => {
  it('advances state, resets the draft, and fires the persistence hook — without mutating', () => {
    const commits: GameState[] = [];
    const store = createRunStore(newRun(SEED), { onCommit: (s) => commits.push(s) });
    const before = store.state();

    store.assignTicket('eng-1', firstOpenTicketId(before));
    store.spend('oneOnOne', 'eng-1');
    store.setCrunch(true);
    store.resolve();

    expect(store.state().sprintIndex).toBe(before.sprintIndex + 1);
    expect(store.draft()).toEqual(emptyActions());
    expect(commits).toHaveLength(1);
    expect(commits[0]).toBe(store.state());
    // The prior state object is untouched — the store swapped its reference, never mutated.
    expect(before.sprintIndex).toBe(0);
  });

  it('is a plain no-op once the run has reached a terminal state', () => {
    const commits: GameState[] = [];
    const store = createRunStore(newRun(SEED), { onCommit: (s) => commits.push(s) });

    let guard = 0;
    while (store.state().status === 'active' && guard < 20) {
      store.resolve(); // quiet plan, no crunch — the run completes intact
      guard += 1;
    }
    expect(store.state().status).toBe('completed');

    const committedByEnd = commits.length;
    store.resolve();
    expect(store.state().status).toBe('completed');
    expect(commits).toHaveLength(committedByEnd);
  });
});

describe('subscription lifecycle', () => {
  it('stops notifying after unsubscribe', () => {
    const store = createRunStore(newRun(SEED));
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.toggleCrunch();
    expect(calls).toBe(1);

    unsubscribe();
    store.toggleCrunch();
    expect(calls).toBe(1);
  });
});
