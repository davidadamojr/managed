import { describe, it, expect } from 'vitest';
import {
  runSimulation,
  runMany,
  makeSeeds,
  quitSprint,
  isLoss,
  roadmapFraction,
  HARNESS_BASE_SEED,
} from '../harness/simulate';

// The driver plays the real engine to a terminal state and captures it. Its two duties:
// always terminate with a real outcome, and be perfectly deterministic so every bar
// built on it is reproducible.

describe('runSimulation — terminal, captured, deterministic', () => {
  it('always reaches a terminal outcome (never returns active)', () => {
    for (const strategy of ['always-crunch', 'never-crunch'] as const) {
      const record = runSimulation(HARNESS_BASE_SEED, strategy);
      expect(['completed', 'failed']).toContain(record.outcome.result);
    }
  });

  it('is deterministic — identical seed + strategy ⇒ identical record', () => {
    const a = runSimulation(HARNESS_BASE_SEED, 'balanced');
    const b = runSimulation(HARNESS_BASE_SEED, 'balanced');
    expect(b).toEqual(a);
  });

  it('records the full history, one summary per sprint played', () => {
    const record = runSimulation(HARNESS_BASE_SEED, 'never-crunch');
    expect(record.history).toHaveLength(record.outcome.sprintsPlayed);
  });

  it('always-crunch loses the run; never-crunch survives it', () => {
    expect(isLoss(runSimulation(HARNESS_BASE_SEED, 'always-crunch'))).toBe(true);
    expect(isLoss(runSimulation(HARNESS_BASE_SEED, 'never-crunch'))).toBe(false);
  });

  it('applies a tuning override for the whole run', () => {
    // Shortening the run via override must be reflected in the captured outcome.
    const record = runSimulation(HARNESS_BASE_SEED, 'never-crunch', {
      run: { sprints: 3 },
    });
    expect(record.outcome.runLength).toBe(3);
    expect(record.history.length).toBeLessThanOrEqual(3);
  });

  it('leaves no override leaked after the run (scope restored)', () => {
    runSimulation(HARNESS_BASE_SEED, 'never-crunch', { run: { sprints: 2 } });
    // A subsequent default run sees the base run length again.
    const after = runSimulation(HARNESS_BASE_SEED, 'never-crunch');
    expect(after.outcome.runLength).toBe(6);
  });
});

describe('run-set helpers', () => {
  it('makeSeeds yields consecutive, deterministic seeds from the base', () => {
    expect(makeSeeds(3)).toEqual([
      HARNESS_BASE_SEED,
      HARNESS_BASE_SEED + 1,
      HARNESS_BASE_SEED + 2,
    ]);
  });

  it('runMany plays one record per seed, in order', () => {
    const seeds = makeSeeds(5);
    const records = runMany(seeds, 'balanced');
    expect(records.map((r) => r.seed)).toEqual(seeds);
  });

  it('quitSprint and roadmapFraction read the outcome faithfully', () => {
    const loss = runSimulation(HARNESS_BASE_SEED, 'always-crunch');
    expect(quitSprint(loss)).toBe(loss.outcome.postMortem!.sprintIndex);
    const survive = runSimulation(HARNESS_BASE_SEED, 'never-crunch');
    expect(quitSprint(survive)).toBeNull();
    const { completed, total } = survive.outcome.roadmap;
    expect(roadmapFraction(survive)).toBeCloseTo(completed / total);
  });
});
