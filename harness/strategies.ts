/**
 * Strategies — the scripted managers the harness plays a run with. Each is a pure,
 * deterministic policy `(state) => SprintActions`: given the run so far, it produces one
 * sprint's plan. They are *test drivers*, not game AI and not the player, so unlike the
 * view they are allowed to read raw morale and burnout — the point is to exercise the
 * engine under known, repeatable pressure, not to model a human.
 *
 * The five span the space the mechanical bars need to probe:
 *   - always-crunch  — assign everyone and crunch every sprint. The pure crunch pressure
 *                       the echo-timing bar measures: burnout climbs until someone quits.
 *   - never-crunch   — assign, never crunch, and spend attention to prop up morale. The
 *                       safe baseline: no crunch debt, so no attrition.
 *   - balanced       — push (crunch) only when the roadmap is behind pace AND nobody is
 *                       yet strained, and spend attention on the flagging. A disciplined
 *                       manager: the "is smart play both survivable and productive?" case.
 *   - neglectful     — assign work but spend no attention and never crunch. Isolates
 *                       neglect: morale erodes (and throughput with it) yet burnout never
 *                       accrues, so the team survives but ships the least.
 *   - heeds-warning  — crunch flat out until the at-risk warning appears, then stop for
 *                       good. The manager the fairness guarantee is written for, and the
 *                       only strategy that exercises the recovery arc: it measures whether
 *                       acting on the warning actually saves the engineer.
 *
 * Everything here is deterministic — no RNG, no clock. Choices are a pure function of
 * state, so a given seed and strategy always drive the identical sequence of plans.
 */

import { getTuning } from '../src/content';
import { roadmapProgress, type Engineer, type Ticket } from '../src/engine';
import {
  spendAttention,
  type AttentionAction,
  type SprintActions,
} from '../src/engine';
import type { GameState } from '../src/engine';

/** The named strategies the harness can drive a run with. */
export type StrategyName =
  | 'always-crunch'
  | 'never-crunch'
  | 'balanced'
  | 'neglectful'
  | 'heeds-warning';

/** A deterministic policy: the run so far in, one sprint's plan out. */
export type Strategy = (state: GameState) => SprintActions;

/** Open (not-yet-done) tickets, in backlog order. */
function openTickets(state: GameState): readonly Ticket[] {
  return state.backlog.filter((ticket) => ticket.status !== 'done');
}

/** The unclaimed open ticket this engineer fits best, or null when none remain. */
function bestFitTicket(
  engineer: Engineer,
  pool: readonly Ticket[],
): Ticket | null {
  let best: Ticket | null = null;
  for (const ticket of pool) {
    if (
      best === null ||
      engineer.skills[ticket.requiredSkill] > engineer.skills[best.requiredSkill]
    ) {
      best = ticket;
    }
  }
  return best;
}

/**
 * Assign each engineer, in roster order, to a distinct best-fit open ticket. When
 * `roadmapFirst`, an engineer takes an open roadmap ticket while any remain before
 * touching the rest of the backlog — the only way the soft target actually gets worked.
 * The backlog is over capacity, so tickets are the scarce side; an engineer left with
 * nothing to claim simply stays idle.
 */
function assignByFit(
  state: GameState,
  roadmapFirst: boolean,
): Record<string, string> {
  const roadmapIds = new Set(state.roadmap.ticketIds);
  const open = openTickets(state);
  const claimed = new Set<string>();
  const assignments: Record<string, string> = {};

  for (const engineer of state.roster) {
    const unclaimed = open.filter((ticket) => !claimed.has(ticket.id));
    const roadmapPool = unclaimed.filter((ticket) => roadmapIds.has(ticket.id));
    const pool =
      roadmapFirst && roadmapPool.length > 0 ? roadmapPool : unclaimed;
    const pick = bestFitTicket(engineer, pool);
    if (pick) {
      assignments[engineer.id] = pick.id;
      claimed.add(pick.id);
    }
  }
  return assignments;
}

/**
 * Append attention actions to a plan while the pool can afford them, in the given order.
 * Uses the engine's own budget gate, so a strategy never over-spends attention — an
 * unaffordable action is simply dropped, exactly as an exhausted pool would present it.
 */
function spendWhileAffordable(
  state: GameState,
  base: SprintActions,
  actions: readonly AttentionAction[],
): SprintActions {
  let plan = base;
  for (const action of actions) {
    const result = spendAttention(state, plan, action);
    if (result.ok) plan = result.actions;
  }
  return plan;
}

/**
 * Recognize the lowest-morale engineers first — a deterministic morale-support order.
 * Equal morale is broken by roster position, the same tiebreak attrition uses when two
 * engineers reach an outcome together. Roster position is also the only tiebreak that
 * carries no ambient input: a string comparison that consults the host's collation
 * would make the plan depend on the machine's locale, and uniform starting morale
 * means ties are the common case, not the rare one.
 */
function recognizeLowestMorale(state: GameState): AttentionAction[] {
  return state.roster
    .map((engineer, position) => ({ engineer, position }))
    .sort((a, b) => a.engineer.morale - b.engineer.morale || a.position - b.position)
    .map(({ engineer }) => ({ kind: 'recognize' as const, engineerId: engineer.id }));
}

/** True while the roadmap is behind a straight-line pace for the sprint just completed. */
function roadmapBehindPace(state: GameState): boolean {
  const { completed, total } = roadmapProgress(state.roadmap, state.backlog);
  const expectedByNow = (total * (state.sprintIndex + 1)) / state.runLength;
  return completed < expectedByNow;
}

/** True while no engineer has entered the at-risk band — safe to ask for a push. */
function teamClearOfRisk(state: GameState): boolean {
  const { atRiskBurnout } = getTuning().attrition;
  return state.roster.every((engineer) => engineer.burnout < atRiskBurnout);
}

/**
 * Whether any summary so far has flagged anyone as at-risk. Unlike the other predicates
 * here this reads the *fuzzy* signal — the same at-risk read the player is shown — rather
 * than raw burnout, so a strategy built on it represents a line of play a real player can
 * actually follow. A warning, once seen, is never unseen.
 */
function warningEverShown(state: GameState): boolean {
  return (state.history ?? []).some((summary) =>
    summary.reads.some((read) => read.atRisk),
  );
}

const alwaysCrunch: Strategy = (state) => ({
  assignments: assignByFit(state, true),
  crunch: true,
  attentionActions: [],
});

const neverCrunch: Strategy = (state) => {
  const base: SprintActions = {
    assignments: assignByFit(state, true),
    crunch: false,
    attentionActions: [],
  };
  return spendWhileAffordable(state, base, recognizeLowestMorale(state));
};

const balanced: Strategy = (state) => {
  const base: SprintActions = {
    assignments: assignByFit(state, true),
    crunch: roadmapBehindPace(state) && teamClearOfRisk(state),
    attentionActions: [],
  };
  return spendWhileAffordable(state, base, recognizeLowestMorale(state));
};

const neglectful: Strategy = (state) => ({
  assignments: assignByFit(state, true),
  crunch: false,
  attentionActions: [],
});

const heedsWarning: Strategy = (state) => {
  const base: SprintActions = {
    assignments: assignByFit(state, true),
    crunch: !warningEverShown(state),
    attentionActions: [],
  };
  return spendWhileAffordable(state, base, recognizeLowestMorale(state));
};

/** The strategy registry, keyed by name. */
export const STRATEGIES: Readonly<Record<StrategyName, Strategy>> = {
  'always-crunch': alwaysCrunch,
  'never-crunch': neverCrunch,
  balanced,
  neglectful,
  'heeds-warning': heedsWarning,
};

/** All strategy names, in a stable reporting order. */
export const STRATEGY_NAMES: readonly StrategyName[] = [
  'always-crunch',
  'never-crunch',
  'balanced',
  'neglectful',
  'heeds-warning',
];

/** Fetch a strategy by name, or throw if the name is unknown (a caller-side typo). */
export function strategyByName(name: StrategyName): Strategy {
  const strategy = STRATEGIES[name];
  if (!strategy) throw new Error(`unknown strategy: ${name}`);
  return strategy;
}
