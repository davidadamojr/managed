/**
 * Generators for the property tests, and the deterministic player that turns what they
 * generate into real runs.
 *
 * The problem a plan generator has to solve: a `SprintActions` is only meaningful
 * against the state it is played into. Engineer and ticket ids come from the board the
 * seed built, and what attention is affordable depends on the pool that sprint. Random
 * `SprintActions` would mostly be nonsense — unknown ids and overspent pools — and would
 * prove the engine handles garbage rather than that it is deterministic over the space
 * a player can actually reach.
 *
 * So what is generated is a *recipe*: choices with no ids in them, resolved against the
 * live state at the moment they are played. A recipe picks roster slots and positions in
 * the open backlog, not names; attention is committed through the engine's own budget
 * gate, so an unaffordable action is dropped exactly as the interface would drop it. The
 * resulting plans are legal by construction, and the space they cover is the real one:
 * idle engineers, poor fits, two engineers on one ticket, an exhausted pool.
 *
 * `materializePlan` is a pure function of `(state, recipe)`, which is what makes replay
 * meaningful — the same seed and the same recipes always produce the same plans, so any
 * divergence between two plays is the engine's, not the generator's.
 *
 * Not a `*.test.ts` file, so the runner treats it as the helper it is.
 */

import fc from 'fast-check';
import { getTuning } from '../../src/content';
import {
  assign,
  newRun,
  setCrunch,
  spendAttention,
  tick,
  type AttentionActionKind,
  type GameState,
  type SprintActions,
  type SprintSummary,
} from '../../src/engine';

/** One managerial action, aimed by roster position rather than by id. */
export interface AttentionPick {
  readonly kind: AttentionActionKind;
  readonly engineerSlot: number;
}

/**
 * One sprint's choices, free of anything the board has to supply. `ticketPicks` gives a
 * position in the open backlog per roster slot — a negative pick leaves that engineer
 * idle — and the picks are free to collide, since co-assignment is legal.
 */
export interface PlanRecipe {
  readonly ticketPicks: readonly number[];
  readonly crunch: boolean;
  readonly attentionPicks: readonly AttentionPick[];
}

const ATTENTION_KINDS: readonly AttentionActionKind[] = [
  'oneOnOne',
  'unblock',
  'recognize',
];

/**
 * Resolve a recipe against a state into a legal plan. Positions wrap into whatever is
 * actually there, so a recipe stays playable against any board; attention goes through
 * `spendAttention`, so the cap is the engine's to enforce here as everywhere else.
 */
export function materializePlan(state: GameState, recipe: PlanRecipe): SprintActions {
  const open = state.backlog.filter((ticket) => ticket.status !== 'done');

  let plan: SprintActions = setCrunch(
    { assignments: {}, crunch: false, attentionActions: [] },
    recipe.crunch,
  );

  state.roster.forEach((engineer, slot) => {
    const pick = recipe.ticketPicks[slot % Math.max(1, recipe.ticketPicks.length)] ?? -1;
    if (pick < 0 || open.length === 0) return;
    plan = assign(plan, engineer.id, open[pick % open.length]!.id);
  });

  for (const { kind, engineerSlot } of recipe.attentionPicks) {
    const engineer = state.roster[engineerSlot % state.roster.length];
    if (!engineer) continue;
    const spend = spendAttention(state, plan, { kind, engineerId: engineer.id });
    // An unaffordable action is simply not taken — the ordinary shape of an empty pool.
    if (spend.ok) plan = spend.actions;
  }

  return plan;
}

/** A run's whole play-through: every state it passed through, and every summary. */
export interface PlayedRun {
  /** Start-of-run state first, then one state per resolved sprint. */
  readonly states: readonly GameState[];
  readonly summaries: readonly SprintSummary[];
}

/**
 * Play a run from `start`, resolving recipes in order until the run ends or they run
 * out. Deterministic end to end: the only variation is the RNG the state carries.
 */
export function playFrom(
  start: GameState,
  recipes: readonly PlanRecipe[],
): PlayedRun {
  const states: GameState[] = [start];
  const summaries: SprintSummary[] = [];
  let state = start;
  for (const recipe of recipes) {
    if (state.status !== 'active') break;
    const result = tick(state, materializePlan(state, recipe));
    state = result.state;
    states.push(state);
    summaries.push(result.summary);
  }
  return { states, summaries };
}

/** Build a run from a seed and play it through the given recipes. */
export function playRun(seed: number, recipes: readonly PlanRecipe[]): PlayedRun {
  return playFrom(newRun(seed), recipes);
}

/** Seeds across the whole uint32 space the RNG normalizes into. */
export const seedArb = fc.integer({ min: 0, max: 0xffff_ffff });

/**
 * One sprint's recipe. The ranges deliberately overshoot the board — more ticket picks
 * than the team has slots, more attention than the pool can buy — so the generated space
 * includes the plans a player bumps into: everyone idle, everyone on one ticket, an
 * attention budget spent to empty and then some.
 */
export const planRecipeArb: fc.Arbitrary<PlanRecipe> = fc.record({
  ticketPicks: fc.array(fc.integer({ min: -2, max: 40 }), {
    minLength: 1,
    maxLength: 8,
  }),
  crunch: fc.boolean(),
  attentionPicks: fc.array(
    fc.record({
      kind: fc.constantFrom(...ATTENTION_KINDS),
      engineerSlot: fc.integer({ min: 0, max: 7 }),
    }),
    { maxLength: 6 },
  ),
});

/**
 * A full run's worth of recipes, with a couple to spare so a run that survives to its
 * final sprint is never cut short by the generator running dry.
 */
export const runRecipesArb: fc.Arbitrary<PlanRecipe[]> = fc.array(planRecipeArb, {
  minLength: getTuning().run.sprints,
  maxLength: getTuning().run.sprints + 2,
});

/** A seed paired with the plans to play it with — the input to a whole generated run. */
export const runArb = fc.record({ seed: seedArb, recipes: runRecipesArb });
