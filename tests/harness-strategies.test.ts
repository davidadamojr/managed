import { describe, it, expect } from 'vitest';
import { newRun, validateActions, attentionSpent } from '../src/engine';
import { STRATEGIES, STRATEGY_NAMES, strategyByName } from '../harness/strategies';

// Strategies are the scripted managers the harness drives runs with. They must produce
// valid, budget-respecting plans and be pure functions of state — the determinism the
// whole harness rests on.

const SEED = 20260728;

describe('strategies — well-formed plans', () => {
  it.each(STRATEGY_NAMES)('%s produces a plan with only valid references', (name) => {
    const state = newRun(SEED);
    const actions = strategyByName(name)(state);
    expect(validateActions(state, actions).ok).toBe(true);
  });

  it.each(STRATEGY_NAMES)('%s never overspends the attention pool', (name) => {
    const state = newRun(SEED);
    const actions = strategyByName(name)(state);
    expect(attentionSpent(actions)).toBeLessThanOrEqual(state.attention.capacity);
  });

  it.each(STRATEGY_NAMES)('%s is a pure function of state (repeatable)', (name) => {
    const state = newRun(SEED);
    expect(strategyByName(name)(state)).toEqual(strategyByName(name)(state));
  });
});

describe('strategies — their defining behaviours', () => {
  it('always-crunch crunches and assigns the whole team', () => {
    const state = newRun(SEED);
    const actions = STRATEGIES['always-crunch'](state);
    expect(actions.crunch).toBe(true);
    // The backlog is over capacity, so every engineer finds a ticket to claim.
    expect(Object.keys(actions.assignments)).toHaveLength(state.roster.length);
  });

  it('never-crunch and neglectful never crunch', () => {
    const state = newRun(SEED);
    expect(STRATEGIES['never-crunch'](state).crunch).toBe(false);
    expect(STRATEGIES['neglectful'](state).crunch).toBe(false);
  });

  it('neglectful spends no attention; never-crunch does', () => {
    const state = newRun(SEED);
    expect(STRATEGIES['neglectful'](state).attentionActions).toHaveLength(0);
    expect(
      STRATEGIES['never-crunch'](state).attentionActions.length,
    ).toBeGreaterThan(0);
  });

  it('roadmap-first assignment prefers open roadmap tickets', () => {
    const state = newRun(SEED);
    const actions = STRATEGIES['balanced'](state);
    const roadmapIds = new Set(state.roadmap.ticketIds);
    const assigned = Object.values(actions.assignments);
    const roadmapAssigned = assigned.filter((id) => roadmapIds.has(id)).length;
    // With 4 engineers and 5 roadmap tickets all open at sprint 0, every engineer
    // should be on a roadmap ticket.
    expect(roadmapAssigned).toBe(state.roster.length);
  });

  it('strategyByName throws on an unknown name', () => {
    // @ts-expect-error — exercising the runtime guard with an off-list name.
    expect(() => strategyByName('freewheeling')).toThrow(/unknown strategy/);
  });
});
