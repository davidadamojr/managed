import { describe, it, expect } from 'vitest';
import { newRun, tick, validateActions, attentionSpent, type GameState } from '../src/engine';
import { getTuning } from '../src/content';
import { STRATEGIES, STRATEGY_NAMES, strategyByName } from '../harness/strategies';
import { runMany, makeSeeds } from '../harness/simulate';

// Strategies are the scripted managers the harness drives runs with. They must produce
// valid, budget-respecting plans and be pure functions of state — the determinism the
// whole harness rests on.

const SEED = 20260728;

/**
 * Crunch the whole team until a summary first flags someone as at-risk, and return that
 * state. Played through the real engine rather than hand-built, so the warning under test
 * is the one the game actually produces.
 */
function playUntilWarned(): GameState {
  let state = newRun(SEED);
  while (state.status === 'active') {
    state = tick(state, STRATEGIES['always-crunch'](state)).state;
    if ((state.history ?? []).some((s) => s.reads.some((r) => r.atRisk))) return state;
  }
  throw new Error('no at-risk warning appeared under sustained crunch');
}

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
    // Every roadmap ticket is open at sprint 0 and they outnumber the team, so there is
    // no reason for anyone to be working outside the roadmap yet.
    expect(roadmapAssigned).toBe(state.roster.length);
  });

  it('heeds-warning pushes while the team still reads clear', () => {
    const state = newRun(SEED);
    expect(STRATEGIES['heeds-warning'](state).crunch).toBe(true);
  });

  it('heeds-warning stops crunching once a warning has been shown, and stays stopped', () => {
    const warned = playUntilWarned();
    expect(STRATEGIES['heeds-warning'](warned).crunch).toBe(false);
    // The warning is never unseen: a later sprint whose own summary reads clear does not
    // license another push.
    const laterWithClearLastSprint = {
      ...warned,
      history: [...warned.history!, { ...warned.history!.at(-1)!, reads: [] }],
    };
    expect(STRATEGIES['heeds-warning'](laterWithClearLastSprint).crunch).toBe(false);
  });

  it('heeds-warning reads the shown warning, not the burnout behind it', () => {
    // The distinguishing property: this is the only strategy restricted to what the
    // player can actually see. Strip the summaries and it pushes again even though the
    // roster it is handed is just as burnt out as before.
    const warned = playUntilWarned();
    const { atRiskBurnout } = getTuning().attrition;
    expect(warned.roster.some((e) => e.burnout >= atRiskBurnout)).toBe(true);
    expect(STRATEGIES['heeds-warning']({ ...warned, history: [] }).crunch).toBe(true);
  });

  it('heeds-warning keeps the whole team, every seed — acting on the warning works', () => {
    // The payoff the fairness guarantee promises, measured rather than assumed: a manager
    // who backs off the sprint after the warning appears never loses anyone.
    const records = runMany(makeSeeds(48), 'heeds-warning');
    const losses = records.filter((r) => r.outcome.result === 'failed');
    expect(losses).toHaveLength(0);
  });

  it('strategyByName throws on an unknown name', () => {
    // @ts-expect-error — exercising the runtime guard with an off-list name.
    expect(() => strategyByName('freewheeling')).toThrow(/unknown strategy/);
  });
});
