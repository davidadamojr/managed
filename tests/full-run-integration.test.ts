import { describe, it, expect } from 'vitest';
import {
  newRun,
  tick,
  deriveOutcome,
  type GameState,
  type RunOutcome,
  type SprintSummary,
} from '../src/engine';
import { createMemoryStore, saveRun, loadRun } from '../src/persistence';
import { DEFAULT_BAR_CONFIG } from '../harness/bars';
import { makeSeeds, runMany, isLoss, quitSprint } from '../harness/simulate';
import { strategyByName, STRATEGY_NAMES, type StrategyName } from '../harness/strategies';

// The capstone. Everything else in this suite tests a system; this file tests the one
// coupling the whole game is built to produce — a crunch decision that comes back,
// sprints later, as a person the manager was warned about and then lost.
//
// Two claims, and they are the only two this file makes:
//
//   1. The echo is PRESENT. A crunch-heavy run does not merely feel risky; it ends in a
//      loss, in a window late enough to have been read and early enough to leave the run
//      somewhere to go afterwards.
//   2. The echo is FAIR. Every loss, under every scripted manager, was preceded by a
//      fuzzy at-risk read the player could have acted on — and a manager who does act on
//      it keeps the whole team.
//
// What it deliberately does NOT claim: that the loss *hurts*. Whether the departure lands
// as a punch or a shrug is not a property any assertion can reach, and it is the gate the
// increment actually has to clear. This file only guarantees there is something there to
// feel, and that later increments cannot quietly take it away.
//
// The runs are driven by the harness's scripted managers against the real `tick` — the
// same composition the tuning report is measured through, so a regression here and a
// regression in the report are the same regression, not two that can drift apart.
//
// One property of Increment 1 shapes the scripts: burnout has exactly one source, the
// crunch toggle, and the player controls it completely. So the loss run crunches every
// sprint rather than twice — two sprints of crunch followed by rest recovers harmlessly,
// by design. The pressure that would make a short, sharp crunch unrecoverable arrives
// with later systems; here, sustained crunch is what the echo is made of.

/** The seed set the settled tuning report is measured over, reused so the two agree. */
const SEEDS = makeSeeds(96);

/**
 * The seed whose crunch-heavy run plays the modal arc — the shape 89 of the 96 seeds
 * produce. The 7 remaining seeds land a sprint earlier because an event added burnout on
 * top of the crunch; they are still inside the window, and the seed-set assertions below
 * cover them. This one is traced sprint by sprint because a canonical arc is easier to
 * read (and to re-derive after a retune) than a distribution.
 */
const CANONICAL_SEED = 20260730;

/** A finished run, plus the manager's own crunch decisions — the cause, kept alongside. */
interface PlayedRun {
  readonly state: GameState;
  readonly outcome: RunOutcome;
  /** Whether the manager called for crunch in each resolved sprint, oldest first. */
  readonly crunchBySprint: readonly boolean[];
}

/**
 * Save a run and read it straight back, asserting both halves succeeded. Used to drop a
 * real persistence round trip into the middle of a run, so "the echo survives a save" is
 * checked against the same storage path a player would resume through, not a copy.
 */
function roundTripThroughStorage(state: GameState): GameState {
  const store = createMemoryStore();
  expect(saveRun(store, state).ok).toBe(true);
  const loaded = loadRun(store);
  if (!loaded.ok) throw new Error(`resume failed: ${loaded.message}`);
  return loaded.state;
}

/**
 * Play one seeded run to its terminal state under a scripted manager, optionally
 * interrupting it with a save/resume after `resumeAfterSprints` sprints.
 *
 * The loop is bounded rather than trusting the run to end, because a test suite that
 * hangs reports nothing at all; a run that fails to terminate should fail an assertion.
 */
function play(
  seed: number,
  strategy: StrategyName,
  resumeAfterSprints?: number,
): PlayedRun {
  const policy = strategyByName(strategy);
  let state = newRun(seed);
  const crunchBySprint: boolean[] = [];
  let guard = state.runLength + 2;

  while (state.status === 'active' && guard > 0) {
    const actions = policy(state);
    crunchBySprint.push(actions.crunch);
    state = tick(state, actions).state;
    if (crunchBySprint.length === resumeAfterSprints) {
      state = roundTripThroughStorage(state);
    }
    guard -= 1;
  }

  const outcome = deriveOutcome(state);
  if (!outcome) throw new Error(`run ${seed} (${strategy}) never reached a terminal state`);
  return { state, outcome, crunchBySprint };
}

/** The first sprint an engineer was shown as at-risk, or null if they never were. */
function firstAtRiskSprint(
  history: readonly SprintSummary[],
  engineerId: string,
): number | null {
  const hit = history.find((summary) =>
    summary.reads.some((read) => read.engineerId === engineerId && read.atRisk),
  );
  return hit ? hit.sprintIndex : null;
}

/** Whether anyone at all read as at-risk in a sprint. */
function anyoneAtRisk(summary: SprintSummary): boolean {
  return summary.reads.some((read) => read.atRisk);
}

const RUN_LENGTH = newRun(CANONICAL_SEED).runLength;
const TEAM_SIZE = newRun(CANONICAL_SEED).roster.length;

// ── The echo, traced end to end ──────────────────────────────────────────────

describe('the delayed echo completes its round trip', () => {
  const run = play(CANONICAL_SEED, 'always-crunch');
  const history = run.state.history ?? [];
  const postMortem = run.outcome.postMortem;

  it('a crunch-heavy run ends in a departure, not a completion', () => {
    expect(run.outcome.result).toBe('failed');
    expect(run.state.departure).toBeDefined();
    expect(postMortem).toBeDefined();
    expect(run.crunchBySprint.every(Boolean)).toBe(true);
  });

  it('the early crunch sprints read as free — the cost is not visible yet', () => {
    // The delay is the mechanic. If the first crunch sprint already flagged someone, the
    // player would be reacting to a warning rather than living with a decision.
    const firstWarningSprint = history.findIndex(anyoneAtRisk);
    expect(firstWarningSprint).toBeGreaterThanOrEqual(2);
    for (const summary of history.slice(0, firstWarningSprint)) {
      expect(anyoneAtRisk(summary)).toBe(false);
    }
  });

  it('the warning surfaces mid-run and the loss follows the sprint after', () => {
    const warned = firstAtRiskSprint(history, postMortem!.engineerId);
    // Sprint indices are zero-based: the warning is shown on the fourth sprint's summary
    // and the departure lands on the fifth, of six.
    expect(warned).toBe(3);
    expect(postMortem!.sprintIndex).toBe(4);
    expect(run.outcome.sprintsPlayed).toBe(5);
  });
});

describe('the echo lands in its window across the seed set', () => {
  const records = runMany(SEEDS, 'always-crunch');

  it('crunch is never free — every crunch-heavy run loses someone', () => {
    expect(records.filter((record) => !isLoss(record))).toHaveLength(0);
  });

  it('no quit arrives unforeseeably early, and none arrives too late to matter', () => {
    const quits = records.map((record) => quitSprint(record)!);
    // Below the floor the echo returned faster than a player could read it. Above
    // runLength - 2 the departure and the end of the run arrive together, leaving no
    // sprint on the far side of the loss — which is the whole reason the run is six
    // sprints rather than five.
    expect(Math.min(...quits)).toBeGreaterThanOrEqual(DEFAULT_BAR_CONFIG.echo.prematureFloor);
    expect(Math.max(...quits)).toBeLessThanOrEqual(RUN_LENGTH - 2);
  });
});

// ── The fairness guarantee ───────────────────────────────────────────────────

describe('the fairness guarantee holds on every loss', () => {
  const records = STRATEGY_NAMES.flatMap((name) => runMany(SEEDS, name));
  const losses = records.filter(isLoss);

  it('there are losses to audit — the guarantee is not passing vacuously', () => {
    expect(losses.length).toBeGreaterThan(0);
  });

  it('every departing engineer was shown at-risk in an earlier sprint', () => {
    // Audited from the run's own history — the reads the player actually saw — rather
    // than from the departure trace's count, so this is independent of the bookkeeping
    // that produced it. Offenders are collected rather than asserted in place, so a
    // failure names the strategy and seed to reproduce from.
    const unforeseeable = losses.filter((record) => {
      const pm = record.outcome.postMortem!;
      const warned = firstAtRiskSprint(record.history, pm.engineerId);
      return warned === null || warned >= pm.sprintIndex;
    });
    expect(unforeseeable.map((record) => `${record.strategy}@${record.seed}`)).toEqual([]);
  });

  it('the post-mortem agrees that a warning was shown and ignored', () => {
    const unwarned = losses.filter(
      (record) => record.outcome.postMortem!.warningsShown < 1,
    );
    expect(unwarned.map((record) => `${record.strategy}@${record.seed}`)).toEqual([]);
  });

  it('never reaches for the bounded fast-burnout exception', () => {
    // Crunch is the only burnout source here and a single crunch cannot clear the
    // warning band, so every Increment-1 loss takes the fully-warned path. A loss that
    // starts arriving through the exception means a new burnout source outruns the band.
    const compressed = losses.filter((record) => record.outcome.postMortem!.fastBurnout);
    expect(compressed.map((record) => `${record.strategy}@${record.seed}`)).toEqual([]);
  });
});

// ── The contrast: the loss is chosen, not scheduled ──────────────────────────

describe('the same run, managed differently, keeps the team', () => {
  const lost = play(CANONICAL_SEED, 'always-crunch');
  const humane = play(CANONICAL_SEED, 'balanced');
  const heeded = play(CANONICAL_SEED, 'heeds-warning');

  it('a humane manager reaches the end of the run intact', () => {
    expect(humane.outcome.result).toBe('completed');
    expect(humane.outcome.sprintsPlayed).toBe(RUN_LENGTH);
    expect(humane.state.departure).toBeUndefined();
    expect(humane.state.roster).toHaveLength(TEAM_SIZE);
  });

  it('acting on the warning — and nothing else — is what saves the engineer', () => {
    // The sharper contrast: this manager crunches through exactly the sprints that led
    // the other one to a departure, and is shown the same warning. The only divergence
    // is what they do once they have seen it.
    const fatalSprint = lost.outcome.postMortem!.sprintIndex;
    expect(heeded.crunchBySprint.slice(0, fatalSprint)).toEqual(
      lost.crunchBySprint.slice(0, fatalSprint),
    );
    expect((heeded.state.history ?? []).some(anyoneAtRisk)).toBe(true);
    expect(heeded.crunchBySprint.slice(fatalSprint).some(Boolean)).toBe(false);
    expect(heeded.outcome.result).toBe('completed');
    expect(heeded.state.roster).toHaveLength(TEAM_SIZE);
  });

  it('holds across the seed set, not just the canonical run', () => {
    const survivors = ['balanced', 'heeds-warning'] as const;
    const casualties = survivors.flatMap((name) =>
      runMany(SEEDS, name)
        .filter(isLoss)
        .map((record) => `${record.strategy}@${record.seed}`),
    );
    expect(casualties).toEqual([]);
  });
});

// ── The lesson, as the player is shown it ────────────────────────────────────

describe('the post-mortem makes the loss legible', () => {
  const run = play(CANONICAL_SEED, 'always-crunch');
  const postMortem = run.outcome.postMortem!;

  it('names who left, and when', () => {
    const departed = run.state.roster.find((e) => e.id === postMortem.engineerId);
    expect(departed).toBeDefined();
    expect(postMortem.engineerName).toBe(departed!.name);
    expect(postMortem.sprintIndex).toBe(run.state.departure!.sprintIndex);
  });

  it('counts every crunch sprint the engineer endured', () => {
    expect(postMortem.crunchSprints).toBe(
      run.crunchBySprint.filter(Boolean).length,
    );
  });

  it('replays the warnings that were shown, in the words they were shown in', () => {
    const beforeTheQuit = postMortem.warnings.filter(
      (warning) => warning.sprintIndex < postMortem.sprintIndex,
    );
    expect(beforeTheQuit.length).toBe(postMortem.warningsShown);
    expect(beforeTheQuit.length).toBeGreaterThanOrEqual(1);

    // The last entry is the coincident read from the quitting sprint itself, so the
    // record ends on the sprint it ended in.
    expect(postMortem.warnings.at(-1)!.sprintIndex).toBe(postMortem.sprintIndex);

    for (const warning of postMortem.warnings) {
      const shown = (run.state.history ?? [])
        .find((summary) => summary.sprintIndex === warning.sprintIndex)!
        .reads.find((read) => read.engineerId === postMortem.engineerId)!;
      expect(warning.note).toBe(shown.note); // echoed, not re-described
      expect(warning.note).toContain(postMortem.engineerName);
      expect(warning.note).not.toMatch(/\d/); // the fuzzy rule holds to the last screen
    }
  });
});

// ── Reproducibility of the whole arc ─────────────────────────────────────────

describe('the whole run reproduces exactly', () => {
  it('replays identically from the same seed and script', () => {
    const first = play(CANONICAL_SEED, 'always-crunch');
    const second = play(CANONICAL_SEED, 'always-crunch');
    expect(second.state).toEqual(first.state);
    expect(second.outcome).toEqual(first.outcome);
    expect(second.crunchBySprint).toEqual(first.crunchBySprint);
  });

  it('survives a mid-run save and resume unchanged, loss run and humane run alike', () => {
    // Saved before the warning surfaces, so the resumed run has to carry the burnout
    // that has not yet become visible — the echo in flight, not just its aftermath.
    const uninterrupted = play(CANONICAL_SEED, 'always-crunch');
    const resumed = play(CANONICAL_SEED, 'always-crunch', 2);
    expect(resumed.state).toEqual(uninterrupted.state);
    expect(resumed.outcome).toEqual(uninterrupted.outcome);

    const humane = play(CANONICAL_SEED, 'balanced');
    const humaneResumed = play(CANONICAL_SEED, 'balanced', 3);
    expect(humaneResumed.state).toEqual(humane.state);
    expect(humaneResumed.outcome).toEqual(humane.outcome);
  });
});
