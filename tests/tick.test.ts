import { describe, it, expect } from 'vitest';
import {
  tick,
  newRun,
  emptyActions,
  assign,
  setCrunch,
  createRng,
  nextFloat,
  shouldFireEvent,
  applyPeopleResponse,
  attentionCapacityFor,
  type Engineer,
  type Ticket,
  type GameState,
  type SprintActions,
  type RngState,
  type SkillProficiencies,
} from '../src/engine';
import { serialize, deserialize } from '../src/persistence/serialization';
import { listSkills, type Skill } from '../src/content';

// The tick is the engine's one integration point. These tests treat it as such: they
// pin the locked contract (pure, deterministic, resumes across a save), then walk the
// resolution it orchestrates — work at start-of-sprint fit/morale, crunch's throughput
// vs burnout, the idle response, an untouched over-capacity backlog, roadmap progress
// that never fails a run, the at-most-one seeded event, and the sprint advance.
//
// Randomness lives only in the event step, so tests that assert exact people numbers
// pin the RNG to a "quiet" cursor (no event fires) to isolate the deterministic core;
// event behavior is checked separately with a "firing" cursor.

// ---- fixtures -------------------------------------------------------------

function skillsWith(base: number, overrides: Partial<Record<Skill, number>> = {}): SkillProficiencies {
  const map = {} as Record<Skill, number>;
  for (const s of listSkills()) map[s] = overrides[s] ?? base;
  return map;
}

function engineer(id: string, skills: SkillProficiencies, morale = 65, burnout = 10): Engineer {
  return { id, name: id, flavor: 'vibe', skills, morale, burnout, assignment: null };
}

function ticket(id: string, requiredSkill: Skill, size = 5): Ticket {
  return { id, size, requiredSkill, progress: 0, status: 'open' };
}

/** A complete, active run with a controlled roster/backlog/roadmap and a chosen RNG. */
function stateWith(over: Partial<GameState>): GameState {
  return { ...newRun(1), roadmap: { ticketIds: [] }, ...over };
}

/** The RNG state at a chosen cursor for a (small, positive) seed. */
function at(seed: number, cursor: number): RngState {
  return { seed: createRng(seed).seed, cursor };
}

/** A cursor whose next draw leaves the sprint quiet (no event fires). */
function quietRng(seed: number): RngState {
  for (let cursor = 0; cursor < 50_000; cursor += 1) {
    const state = at(seed, cursor);
    if (!shouldFireEvent(nextFloat(state).value)) return state;
  }
  throw new Error('no quiet cursor found');
}

/** A cursor whose next draw fires an event. */
function firingRng(seed: number): RngState {
  for (let cursor = 0; cursor < 50_000; cursor += 1) {
    const state = at(seed, cursor);
    if (shouldFireEvent(nextFloat(state).value)) return state;
  }
  throw new Error('no firing cursor found');
}

/** A meaty plan over a real run: everyone assigned, crunching, some attention spent. */
function fullPlan(state: GameState): SprintActions {
  let plan = emptyActions();
  state.roster.forEach((eng, i) => {
    const target = state.backlog[i];
    if (target) plan = assign(plan, eng.id, target.id);
  });
  plan = setCrunch(plan, true);
  return {
    ...plan,
    attentionActions: [
      { kind: 'oneOnOne', engineerId: state.roster[0]!.id },
      { kind: 'recognize', engineerId: state.roster[1]!.id },
    ],
  };
}

// ---- the locked contract: purity + determinism ---------------------------

describe('tick — the locked contract (§5.1)', () => {
  it('is deterministic: the same state and actions reproduce state and summary exactly', () => {
    const state = newRun(20240726);
    const actions = fullPlan(state);
    expect(tick(state, actions)).toEqual(tick(state, actions));
  });

  it('resumes identically across a save round-trip (rngState survives serialization)', () => {
    const state = newRun(20240726);
    const actions = fullPlan(state);
    const direct = tick(state, actions);
    const resumed = tick(deserialize(serialize(state)), actions);
    expect(resumed).toEqual(direct);
  });

  it('never mutates the input state (purity)', () => {
    const state = newRun(20240726);
    const before = structuredClone(state);
    tick(state, fullPlan(state));
    expect(state).toEqual(before);
  });
});

// ---- work resolution ------------------------------------------------------

describe('tick — work resolves from skill fit and morale', () => {
  it('a good-fit engineer ships while a poor-fit engineer on an equal ticket does not', () => {
    const good = engineer('good', skillsWith(0, { backend: 100 }), 100);
    const poor = engineer('poor', skillsWith(0, { frontend: 10 }), 100);
    const state = stateWith({
      roster: [good, poor],
      backlog: [ticket('k-good', 'backend', 3), ticket('k-poor', 'frontend', 8)],
      rngState: quietRng(1),
    });
    const plan = assign(assign(emptyActions(), 'good', 'k-good'), 'poor', 'k-poor');

    const { state: next, summary } = tick(state, plan);
    expect(summary.shipped).toEqual(['k-good']);
    expect(next.backlog.find((k) => k.id === 'k-poor')!.status).toBe('in-progress');
  });

  it('leaves an over-capacity backlog unserved — excess tickets are untouched', () => {
    const eng = engineer('e', skillsWith(0, { backend: 100 }), 100);
    const served = ticket('served', 'backend', 3);
    const spare = ticket('spare', 'infra', 3);
    const state = stateWith({ roster: [eng], backlog: [served, spare], rngState: quietRng(1) });

    const { state: next, summary } = tick(state, assign(emptyActions(), 'e', 'served'));
    expect(summary.shipped).toEqual(['served']);
    expect(next.backlog.find((k) => k.id === 'spare')).toEqual(spare);
  });
});

describe('tick — crunch trades throughput now for burnout later', () => {
  const eng = engineer('e', skillsWith(0, { backend: 100 }), 65, 10);
  const bigTicket = ticket('k', 'backend', 30); // too big to finish either way
  const base = stateWith({ roster: [eng], backlog: [bigTicket], rngState: quietRng(1) });
  const assignOnly = assign(emptyActions(), 'e', 'k');

  it('crunch ships more progress this sprint than the same non-crunch sprint', () => {
    const noCrunch = tick(base, assignOnly).state.backlog[0]!.progress;
    const crunch = tick(base, setCrunch(assignOnly, true)).state.backlog[0]!.progress;
    expect(crunch).toBeGreaterThan(noCrunch);
  });

  it('crunch accrues more burnout this sprint than the same non-crunch sprint', () => {
    const noCrunch = tick(base, assignOnly).state.roster[0]!.burnout;
    const crunch = tick(base, setCrunch(assignOnly, true)).state.roster[0]!.burnout;
    expect(crunch).toBeGreaterThan(noCrunch);
  });
});

describe('tick — an idle engineer ships nothing and feels the idle response', () => {
  it('produces no work and applies exactly the people model’s idle outcome', () => {
    const eng = engineer('e', skillsWith(50), 65, 10);
    const state = stateWith({ roster: [eng], backlog: [ticket('k', 'backend')], rngState: quietRng(1) });

    const { state: next, summary } = tick(state, emptyActions());
    expect(summary.shipped).toEqual([]);
    expect(next.backlog[0]!.progress).toBe(0);

    const expected = applyPeopleResponse(
      { morale: eng.morale, burnout: eng.burnout },
      { workload: 'idle', poorFit: false, crunch: false, attention: [] },
    );
    expect(next.roster[0]!.morale).toBe(expected.morale);
    expect(next.roster[0]!.burnout).toBe(expected.burnout);
  });
});

// ---- roadmap: soft goal, never a fail axis --------------------------------

describe('tick — roadmap progress is soft', () => {
  it('advances roadmap progress when a designated ticket ships', () => {
    const eng = engineer('e', skillsWith(0, { backend: 100 }), 100);
    const state = stateWith({
      roster: [eng],
      backlog: [ticket('k1', 'backend', 3)],
      roadmap: { ticketIds: ['k1'] },
      rngState: quietRng(1),
    });
    const { summary } = tick(state, assign(emptyActions(), 'e', 'k1'));
    expect(summary.roadmap).toEqual({ completed: 1, total: 1 });
  });

  it('a roadmap miss is representable and never sets status to failed', () => {
    const eng = engineer('e', skillsWith(50), 65);
    const state = stateWith({
      roster: [eng],
      backlog: [ticket('k1', 'backend', 3)],
      roadmap: { ticketIds: ['k1'] },
      rngState: quietRng(1),
    });
    const { state: next, summary } = tick(state, emptyActions()); // k1 never worked
    expect(summary.roadmap).toEqual({ completed: 0, total: 1 });
    expect(next.status).toBe('active');
  });
});

// ---- events: at most one, seeded ------------------------------------------

describe('tick — fires at most one event, seeded', () => {
  const eng = engineer('e', skillsWith(50), 60, 20);
  const backlog = [ticket('k', 'backend')];

  it('records the fired event in the summary and picks it deterministically', () => {
    const state = stateWith({ roster: [eng], backlog, rngState: firingRng(1) });
    const first = tick(state, emptyActions()).summary;
    const second = tick(state, emptyActions()).summary;
    expect(first.event).toBeDefined();
    expect(second.event!.id).toBe(first.event!.id); // seeded: same state ⇒ same event
  });

  it('surfaces no event on a quiet sprint', () => {
    const state = stateWith({ roster: [eng], backlog, rngState: quietRng(1) });
    expect(tick(state, emptyActions()).summary.event).toBeUndefined();
  });
});

// ---- advance + bookkeeping ------------------------------------------------

describe('tick — advances the sprint and refreshes the attention pool', () => {
  it('increments the sprint index and refills attention via attentionCapacityFor', () => {
    const state = stateWith({
      roster: [engineer('e', skillsWith(50))],
      backlog: [ticket('k', 'backend')],
      sprintIndex: 1,
      runLength: 6,
      attention: { capacity: 3, remaining: 0 }, // spent-down pool from the prior sprint
      rngState: quietRng(1),
    });
    const { state: next } = tick(state, emptyActions());

    expect(next.sprintIndex).toBe(2);
    const capacity = attentionCapacityFor(state.manager);
    expect(next.attention).toEqual({ capacity, remaining: capacity });
  });

  it('retains the summary in history', () => {
    const state = stateWith({
      roster: [engineer('e', skillsWith(50))],
      backlog: [ticket('k', 'backend')],
      rngState: quietRng(1),
    });
    const { state: next, summary } = tick(state, emptyActions());
    expect(next.history).toHaveLength(1);
    expect(next.history!.at(-1)).toEqual(summary);
  });

  it('completes the run when the team reaches the final sprint intact', () => {
    const state = stateWith({
      roster: [engineer('e', skillsWith(50))],
      backlog: [ticket('k', 'backend')],
      sprintIndex: 5,
      runLength: 6,
      rngState: quietRng(1),
    });
    const { state: next } = tick(state, emptyActions());
    expect(next.sprintIndex).toBe(6);
    expect(next.status).toBe('completed');
  });
});
