import { describe, it, expect } from 'vitest';
import {
  newRun,
  tick,
  deriveOutcome,
  emptyActions,
  setCrunch,
  assign,
  roadmapProgress,
  createRng,
  type GameState,
  type SprintActions,
  type Engineer,
  type Ticket,
} from '../src/engine';
import { createMemoryStore, saveRun, loadRun } from '../src/persistence/storage';

const SEED = 20260727;

// A quiet plan: nobody crunches, so burnout only ever recovers and no one reaches the
// at-risk band — the whole run reaches its scheduled end with the team intact.
function quietPlan(): SprintActions {
  return emptyActions();
}

// A punishing plan: everyone crunches on a fresh open ticket every sprint, so burnout
// climbs the fixed accrual each sprint and eventually crosses the attrition threshold.
// Assigning to distinct tickets by absolute backlog position keeps each engineer on
// open work (crunch only bites the assigned), driving the loss deterministically.
function crunchPlan(state: GameState): SprintActions {
  let actions = setCrunch(emptyActions(), true);
  state.roster.forEach((engineer, i) => {
    const ticket = state.backlog[state.sprintIndex * state.roster.length + i];
    if (ticket) actions = assign(actions, engineer.id, ticket.id);
  });
  return actions;
}

function playToTerminal(
  seed: number,
  plan: (state: GameState) => SprintActions,
): GameState {
  let state = newRun(seed);
  let guard = 0;
  while (state.status === 'active' && guard < state.runLength + 2) {
    state = tick(state, plan(state)).state;
    guard += 1;
  }
  return state;
}

describe('completion terminal state', () => {
  it('reaches the final sprint with the team intact and completes', () => {
    const runLength = newRun(SEED).runLength;
    const state = playToTerminal(SEED, quietPlan);

    expect(state.status).toBe('completed');
    expect(state.sprintIndex).toBe(runLength);
    expect(state.roster).toHaveLength(newRun(SEED).roster.length); // nobody left
  });

  it('produces a plain completed run summary with no post-mortem', () => {
    const outcome = deriveOutcome(playToTerminal(SEED, quietPlan))!;
    expect(outcome.result).toBe('completed');
    expect(outcome.sprintsPlayed).toBe(outcome.runLength);
    expect(outcome.postMortem).toBeUndefined();
  });
});

describe('attrition-fail terminal state', () => {
  const failedState = playToTerminal(SEED, crunchPlan);

  it('sustained crunch ends the run in a quit', () => {
    expect(failedState.status).toBe('failed');
    expect(failedState.departure).toBeDefined();
  });

  it('produces a post-mortem naming who left and tracing the crunch', () => {
    const outcome = deriveOutcome(failedState)!;
    expect(outcome.result).toBe('failed');

    const pm = outcome.postMortem!;
    expect(pm.engineerId).toBe(failedState.roster[0]!.id); // lockstep team, first quits
    expect(pm.engineerName).toBe(failedState.roster[0]!.name);
    expect(pm.crunchSprints).toBeGreaterThanOrEqual(1);
    expect(pm.sprintIndex).toBe(failedState.departure!.sprintIndex);
  });

  it('echoes the ignored at-risk warnings readably, in the game\'s own voice', () => {
    const pm = deriveOutcome(failedState)!.postMortem!;
    expect(pm.warnings.length).toBeGreaterThanOrEqual(1);
    for (const warning of pm.warnings) {
      expect(warning.note).toContain(pm.engineerName); // the read names the person
    }
  });

  it('holds the fairness floor: at least one warning was shown before the loss', () => {
    const pm = deriveOutcome(failedState)!.postMortem!;
    // Either the player ignored ≥1 actionable warning, or the bounded fast exception
    // compressed it into the quit sprint — never an unforeseeable loss.
    expect(pm.warningsShown >= 1 || pm.fastBurnout).toBe(true);
    expect(pm.warnings.length).toBeGreaterThanOrEqual(1);
  });
});

describe('early roadmap completion does not end the run', () => {
  it('continues to the scheduled end when the roadmap is already done', () => {
    // A run whose roadmap tickets are all already shipped, well before the final
    // sprint. Roadmap is a soft target — finishing it early must not end the run.
    const roster: Engineer[] = [
      {
        id: 'eng-1',
        name: 'Ada',
        flavor: 'x',
        skills: { frontend: 60, backend: 40, infra: 30, debugging: 50 },
        morale: 65,
        burnout: 10,
        assignment: null,
      },
    ];
    const backlog: Ticket[] = [
      { id: 't1', size: 3, requiredSkill: 'frontend', progress: 3, status: 'done' },
      { id: 't2', size: 3, requiredSkill: 'backend', progress: 3, status: 'done' },
      { id: 't3', size: 3, requiredSkill: 'infra', progress: 0, status: 'open' },
    ];
    const state: GameState = {
      seed: 1,
      rngState: createRng(1),
      sprintIndex: 0,
      runLength: 4,
      roster,
      backlog,
      roadmap: { ticketIds: ['t1', 't2'] },
      attention: { capacity: 3, remaining: 3 },
      manager: { reputation: 0, burnout: 0 },
      status: 'active',
    };

    // Guard: the roadmap really is complete going in.
    expect(roadmapProgress(state.roadmap, state.backlog)).toEqual({ completed: 2, total: 2 });

    const next = tick(state, emptyActions()).state;
    expect(next.status).toBe('active'); // a finished roadmap is not a terminal state
    expect(next.sprintIndex).toBe(1); // the run advances normally
  });
});

describe('save / resume exactness', () => {
  it('resuming a saved mid-run run is bit-identical to an uninterrupted play', () => {
    const runLength = newRun(SEED).runLength;

    // Uninterrupted: play the whole run in one sitting.
    let uninterrupted = newRun(SEED);
    for (let i = 0; i < runLength; i += 1) {
      uninterrupted = tick(uninterrupted, emptyActions()).state;
    }

    // Interrupted: play two sprints, save, load, then finish the run.
    let mid = newRun(SEED);
    mid = tick(mid, emptyActions()).state;
    mid = tick(mid, emptyActions()).state;

    const store = createMemoryStore();
    expect(saveRun(store, mid).ok).toBe(true);
    const loaded = loadRun(store);
    expect(loaded.ok).toBe(true);

    let resumed = (loaded as { ok: true; state: GameState }).state;
    for (let i = 2; i < runLength; i += 1) {
      resumed = tick(resumed, emptyActions()).state;
    }

    // The restored RNG cursor makes the continuation indistinguishable from an
    // uninterrupted run — deep equality across the whole final state.
    expect(resumed).toEqual(uninterrupted);
    expect(resumed.status).toBe(uninterrupted.status);
  });
});
