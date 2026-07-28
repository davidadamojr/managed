import { describe, it, expect } from 'vitest';
import { buildRunView } from '../../src/view/viewModel';
import {
  newRun,
  tick,
  emptyActions,
  assign,
  setCrunch,
  spendAttention,
  roadmapProgress,
  type GameState,
  type SprintActions,
} from '../../src/engine';
import { listSkills } from '../../src/content';

const SEED = 20260728;

/** The id of the first ticket still in play — always present in a fresh over-capacity run. */
function firstOpenTicketId(state: GameState): string {
  const ticket = state.backlog.find((t) => t.status !== 'done');
  if (ticket === undefined) throw new Error('fixture: expected an open ticket');
  return ticket.id;
}

/** Spend the whole attention pool so the tray reads exhausted. */
function drainAttention(state: GameState): SprintActions {
  let draft = emptyActions();
  for (let i = 0; i < state.attention.capacity; i += 1) {
    const result = spendAttention(state, draft, { kind: 'oneOnOne', engineerId: 'eng-1' });
    if (result.ok) draft = result.actions;
  }
  return draft;
}

/** Every property name appearing anywhere in a value tree — the raw-interior leak check. */
function allKeys(value: unknown, keys: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, keys);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      allKeys(child, keys);
    }
  }
  return keys;
}

describe('roster projection', () => {
  it('projects one card per engineer with identity, skills, and no assignment yet', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });

    expect(view.roster).toHaveLength(state.roster.length);
    view.roster.forEach((card, i) => {
      const engineer = state.roster[i]!;
      expect(card.id).toBe(engineer.id);
      expect(card.name).toBe(engineer.name);
      expect(card.flavor).toBe(engineer.flavor);
      // Every skill is shown with its raw proficiency — a systems number, not an interior.
      expect(card.skills).toHaveLength(listSkills().length);
      for (const { skill, proficiency } of card.skills) {
        expect(proficiency).toBe(engineer.skills[skill]);
      }
      expect(card.assignedTicketId).toBeNull();
      expect(card.attention).toEqual([]);
    });
  });

  it('reflects a drafted assignment on both the card and the backlog ticket', () => {
    const state = newRun(SEED);
    const ticketId = firstOpenTicketId(state);
    const draft = assign(emptyActions(), 'eng-1', ticketId);
    const view = buildRunView({ state, draft });

    const card = view.roster.find((c) => c.id === 'eng-1')!;
    expect(card.assignedTicketId).toBe(ticketId);

    const ticket = view.backlog.tickets.find((t) => t.id === ticketId)!;
    expect(ticket.assignedTo).toContain(card.name);
  });

  it('shows no read before the first resolve, then the engine\'s fuzzy note after', () => {
    const state = newRun(SEED);
    const fresh = buildRunView({ state, draft: emptyActions() });
    for (const card of fresh.roster) expect(card.read).toBeNull();

    const resolved = tick(state, emptyActions()).state;
    const view = buildRunView({ state: resolved, draft: emptyActions() });
    const reads = new Map(resolved.history!.at(-1)!.reads.map((r) => [r.engineerId, r]));
    for (const card of view.roster) {
      const read = reads.get(card.id)!;
      expect(card.read).toBe(read.note);
      expect(card.atRisk).toBe(read.atRisk);
    }
  });
});

describe('the fuzzy-readability wall', () => {
  it('carries no raw morale or burnout anywhere in the view model', () => {
    // Resolve a sprint first so morale/burnout have actually moved off their uniform
    // starting values — the interiors are live, and still must not surface.
    const resolved = tick(newRun(SEED), setCrunch(emptyActions(), true)).state;
    const view = buildRunView({ state: resolved, draft: emptyActions() });

    const keys = allKeys(view);
    expect(keys.has('morale')).toBe(false);
    expect(keys.has('burnout')).toBe(false);
  });
});

describe('backlog projection', () => {
  it('lists every in-play ticket with size and skill, and shows it over capacity', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });

    const inPlay = state.backlog.filter((t) => t.status !== 'done');
    expect(view.backlog.tickets).toHaveLength(inPlay.length);
    for (const ticket of view.backlog.tickets) {
      const source = state.backlog.find((t) => t.id === ticket.id)!;
      expect(ticket.size).toBe(source.size);
      expect(ticket.requiredSkill).toBe(source.requiredSkill);
    }
    // The scarcity is the point: more open work than the team can staff.
    expect(view.backlog.teamSize).toBe(state.roster.length);
    expect(view.backlog.openCount).toBeGreaterThan(view.backlog.teamSize);
  });
});

describe('roadmap projection', () => {
  it('mirrors the engine\'s roadmap progress exactly', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });
    expect(view.roadmap).toEqual(roadmapProgress(state.roadmap, state.backlog));
  });
});

describe('attention tray projection', () => {
  it('starts full with all three actions affordable', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });

    expect(view.attention.remaining).toBe(view.attention.capacity);
    expect(view.attention.actions).toHaveLength(3);
    for (const action of view.attention.actions) {
      expect(action.cost).toBeGreaterThan(0);
      expect(action.affordable).toBe(true);
    }
  });

  it('reads exhausted, with every action unaffordable, once the pool is drained', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: drainAttention(state) });

    expect(view.attention.remaining).toBe(0);
    for (const action of view.attention.actions) {
      expect(action.affordable).toBe(false);
    }
  });
});

describe('crunch and resolvability projection', () => {
  it('mirrors the draft crunch flag', () => {
    const state = newRun(SEED);
    expect(buildRunView({ state, draft: emptyActions() }).crunch).toBe(false);
    expect(buildRunView({ state, draft: setCrunch(emptyActions(), true) }).crunch).toBe(true);
  });

  it('can resolve while active, but not at a terminal state', () => {
    const state = newRun(SEED);
    expect(buildRunView({ state, draft: emptyActions() }).canResolve).toBe(true);

    const completed: GameState = { ...state, status: 'completed' };
    expect(buildRunView({ state: completed, draft: emptyActions() }).canResolve).toBe(false);
  });
});
