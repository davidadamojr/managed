import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  newRun,
  emptyActions,
  attentionActionCost,
  attentionSpent,
  freshAttentionPool,
  attentionRemaining,
  currentAttentionPool,
  canAffordAttention,
  spendAttention,
  attentionCapacityFor,
  type SprintActions,
  type AttentionAction,
  type AttentionActionKind,
  type GameState,
  type ManagerState,
} from '../src/engine';
import { getTuning } from '../src/content';

// The attention economy is a pure budget over a plan. These tests fix the three
// properties that matter: capacity is only ever produced by the manager→capacity
// seam (so a future rule can bend it in one place), costs come from tuning (so a
// retune is a data edit), and the cap is honored — an exhausted pool is an ordinary,
// reportable state, never an error. A real `newRun` supplies a coherent state
// (roster of teamSize, a full pool sourced through the seam).

const ALL_KINDS: readonly AttentionActionKind[] = ['oneOnOne', 'unblock', 'recognize'];

/** Spend one action of `kind` on `engineerId`, asserting it fit the budget. */
function commit(
  state: GameState,
  actions: SprintActions,
  kind: AttentionActionKind,
  engineerId: string,
): SprintActions {
  const result = spendAttention(state, actions, { kind, engineerId });
  if (!result.ok) throw new Error(`expected ${kind} to fit the budget`);
  return result.actions;
}

describe('attention actions — the tiny set, each costed and targeted', () => {
  const state = newRun(7);

  it.each(ALL_KINDS)('records a %s as intent against a specific engineer', (kind) => {
    const target = state.roster[0]!.id;
    const plan = commit(state, emptyActions(), kind, target);

    const action = plan.attentionActions.at(-1) as AttentionAction;
    expect(action).toEqual({ kind, engineerId: target });
  });

  it.each(ALL_KINDS)('charges the tuning-configured cost for a %s', (kind) => {
    const plan = commit(state, emptyActions(), kind, state.roster[0]!.id);
    expect(attentionSpent(plan)).toBe(getTuning().attention.actionCost[kind]);
  });

  it('reads every action cost from tuning, not an inline literal', () => {
    // Behavioral proof that a retune of the data alone moves the economy: each cost
    // equals its tuning entry, so there is no second copy in code to fall out of sync.
    for (const kind of ALL_KINDS) {
      expect(attentionActionCost(kind)).toBe(getTuning().attention.actionCost[kind]);
    }
  });

  it('sums the cost of every committed action', () => {
    let plan = emptyActions();
    plan = commit(state, plan, 'oneOnOne', state.roster[0]!.id);
    plan = commit(state, plan, 'unblock', state.roster[1]!.id);

    const expected =
      attentionActionCost('oneOnOne') + attentionActionCost('unblock');
    expect(attentionSpent(plan)).toBe(expected);
  });
});

describe('attention capacity — produced only by the manager→capacity seam', () => {
  it('a fresh pool draws its capacity from attentionCapacityFor, not a literal', () => {
    // The forward hook: capacity comes from exactly one function of manager state, so
    // a later rule that lets the manager's standing or strain bend the pool changes
    // only that function — every pool follows with no caller touched. (The manager
    // fields are inert today, so capacity is uniform; that stability is asserted
    // elsewhere. What matters here is that the pool is sourced *through* the seam.)
    const managers: ManagerState[] = [
      { reputation: 0, burnout: 0 },
      { reputation: 90, burnout: 75 },
    ];
    for (const manager of managers) {
      const pool = freshAttentionPool(manager);
      expect(pool.capacity).toBe(attentionCapacityFor(manager));
      expect(pool.remaining).toBe(attentionCapacityFor(manager));
    }
  });

  it('a new run starts with a full pool sourced through the seam', () => {
    const state = newRun(3);
    expect(state.attention.capacity).toBe(attentionCapacityFor(state.manager));
    expect(state.attention.remaining).toBe(state.attention.capacity);
    expect(attentionRemaining(state, emptyActions())).toBe(state.attention.capacity);
  });

  it('no engine file outside the seam reaches for the raw capacity constant', () => {
    // `poolPerSprint` is the raw pool size in tuning. It must appear in exactly one
    // engine file — the one defining `attentionCapacityFor` — so nothing bypasses the
    // seam to bake in a capacity. newRun must reach the pool through freshAttentionPool.
    const here = dirname(fileURLToPath(import.meta.url));
    const read = (rel: string) =>
      readFileSync(join(here, '..', 'src', 'engine', rel), 'utf8');

    expect(read('entities.ts')).toContain('poolPerSprint');
    expect(read('attention.ts')).not.toContain('poolPerSprint');
    expect(read('newRun.ts')).not.toContain('poolPerSprint');
    expect(read('newRun.ts')).toContain('freshAttentionPool');
    expect(read('state.ts')).not.toContain('poolPerSprint');
  });
});

describe('attention budget — scarce, capped, and plain when exhausted', () => {
  const state = newRun(11);
  const capacity = state.attention.capacity;

  it('decrements remaining as actions are committed', () => {
    let plan = emptyActions();
    expect(attentionRemaining(state, plan)).toBe(capacity);

    plan = commit(state, plan, 'oneOnOne', state.roster[0]!.id);
    expect(attentionRemaining(state, plan)).toBe(
      capacity - attentionActionCost('oneOnOne'),
    );
    expect(currentAttentionPool(state, plan)).toEqual({
      capacity,
      remaining: capacity - attentionActionCost('oneOnOne'),
    });
  });

  it('spends down to an empty pool, then reports further actions unavailable — no throw', () => {
    // With the cheapest action, how many fit before the pool is dry. The scarcity
    // invariant keeps this below the roster size, so distinct targets always exist.
    const cost = attentionActionCost('oneOnOne');
    const fits = Math.floor(capacity / cost);
    expect(fits).toBeLessThan(state.roster.length); // can attend to some, never all

    let plan = emptyActions();
    for (let i = 0; i < fits; i += 1) {
      plan = commit(state, plan, 'oneOnOne', state.roster[i]!.id);
    }
    expect(attentionRemaining(state, plan)).toBe(capacity - fits * cost);
    expect(canAffordAttention(state, plan, 'oneOnOne')).toBe(capacity - fits * cost >= cost);

    // The pool is now too thin for another 1:1. Spending is refused as data, the plan
    // is left untouched, and nothing is thrown.
    const over = spendAttention(state, plan, {
      kind: 'oneOnOne',
      engineerId: state.roster[0]!.id,
    });
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.reason).toBe('insufficient-attention');
      expect(over.kind).toBe('oneOnOne');
      expect(over.cost).toBe(cost);
      expect(over.remaining).toBeLessThan(cost);
    }
    expect(plan.attentionActions).toHaveLength(fits); // plan unchanged by the refusal
  });

  it('never lets remaining fall below zero', () => {
    let plan = emptyActions();
    const cost = attentionActionCost('oneOnOne');
    for (let i = 0; i < Math.floor(capacity / cost); i += 1) {
      plan = commit(state, plan, 'oneOnOne', state.roster[i]!.id);
    }
    expect(attentionRemaining(state, plan)).toBeGreaterThanOrEqual(0);
  });
});

describe('attention — the no-op sprint is legal and representable', () => {
  const state = newRun(5);

  it('an empty plan spends nothing and leaves the whole pool intact', () => {
    const plan = emptyActions();
    expect(plan.attentionActions).toEqual([]);
    expect(attentionSpent(plan)).toBe(0);
    expect(attentionRemaining(state, plan)).toBe(state.attention.capacity);
    expect(currentAttentionPool(state, plan).remaining).toBe(state.attention.capacity);
  });
});

describe('attention — refreshes each sprint, nothing carries over', () => {
  it('a fresh pool is full regardless of a prior sprint spending everything', () => {
    const state = newRun(9);
    const cost = attentionActionCost('oneOnOne');

    // Exhaust the current sprint's budget.
    let plan = emptyActions();
    for (let i = 0; i < Math.floor(state.attention.capacity / cost); i += 1) {
      plan = commit(state, plan, 'oneOnOne', state.roster[i]!.id);
    }
    expect(attentionRemaining(state, plan)).toBeLessThan(cost);

    // The next sprint's pool is rebuilt from the manager, back to full — unspent
    // points do not bank and spent ones do not persist.
    const next = freshAttentionPool(state.manager);
    expect(next.remaining).toBe(next.capacity);
    expect(next.capacity).toBe(attentionCapacityFor(state.manager));
  });
});

describe('attention — spending is pure and serializable', () => {
  const state = newRun(13);

  it('does not mutate the input plan when committing an action', () => {
    const before = emptyActions();
    const after = commit(state, before, 'recognize', state.roster[0]!.id);

    expect(before.attentionActions).toEqual([]); // original untouched
    expect(after.attentionActions).toHaveLength(1);
    expect(after).not.toBe(before);
    expect(after.attentionActions).not.toBe(before.attentionActions);
  });

  it('preserves committed actions and their order through a JSON round-trip', () => {
    let plan = emptyActions();
    plan = commit(state, plan, 'oneOnOne', state.roster[0]!.id);
    plan = commit(state, plan, 'recognize', state.roster[1]!.id);

    const round = JSON.parse(JSON.stringify(plan)) as SprintActions;
    expect(round).toEqual(plan);
    expect(round.attentionActions).toEqual([
      { kind: 'oneOnOne', engineerId: state.roster[0]!.id },
      { kind: 'recognize', engineerId: state.roster[1]!.id },
    ]);
  });
});
