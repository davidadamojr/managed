import { describe, it, expect } from 'vitest';
import {
  echoTimingBar,
  fairnessBar,
  dominantStrategyBar,
  roadmapBar,
  DEFAULT_BAR_CONFIG,
} from '../harness/bars';
import { runMany, makeSeeds } from '../harness/simulate';
import type { RunRecord } from '../harness/simulate';
import type { StrategyName } from '../harness/strategies';
import type { RunOutcome, SprintSummary } from '../src/engine';

const SEEDS = makeSeeds(24);

// ── synthetic-record builders ────────────────────────────────────────────────
// The bars are pure reductions over RunRecords, so hand-built records let a test drive a
// bar into any regime — including ones the honest Inc-1 tick cannot produce — to prove
// the check itself has teeth.

function atRiskSummary(
  sprintIndex: number,
  engineerId: string,
  atRisk: boolean,
): SprintSummary {
  return {
    sprintIndex,
    shipped: [],
    roadmap: { completed: 0, total: 5 },
    reads: [
      {
        engineerId,
        note: '',
        atRisk,
        mood: 'steady',
        trend: 'unknown',
        sharpened: false,
      },
    ],
  };
}

function lossRecord(opts: {
  seed: number;
  quitSprint: number;
  engineerId: string;
  atRiskBefore: readonly number[];
  fastBurnout: boolean;
  roadmap?: { completed: number; total: number };
}): RunRecord {
  const roadmap = opts.roadmap ?? { completed: 3, total: 5 };
  const history: SprintSummary[] = [];
  for (let s = 0; s <= opts.quitSprint; s += 1) {
    history.push(atRiskSummary(s, opts.engineerId, opts.atRiskBefore.includes(s)));
  }
  const outcome: RunOutcome = {
    result: 'failed',
    sprintsPlayed: opts.quitSprint + 1,
    runLength: 6,
    roadmap,
    postMortem: {
      engineerId: opts.engineerId,
      engineerName: 'Test Engineer',
      sprintIndex: opts.quitSprint,
      warningsShown: opts.atRiskBefore.length,
      crunchSprints: 0,
      fastBurnout: opts.fastBurnout,
      warnings: [],
    },
  };
  return { seed: opts.seed, strategy: 'always-crunch', outcome, history };
}

function surviveRecord(opts: {
  seed: number;
  strategy?: StrategyName;
  completed: number;
  total: number;
  finalReachedAt: number;
  runLength?: number;
}): RunRecord {
  const runLength = opts.runLength ?? 6;
  const history: SprintSummary[] = [];
  for (let s = 0; s < runLength; s += 1) {
    history.push({
      sprintIndex: s,
      shipped: [],
      roadmap: { completed: s >= opts.finalReachedAt ? opts.completed : 0, total: opts.total },
      reads: [],
    });
  }
  const outcome: RunOutcome = {
    result: 'completed',
    sprintsPlayed: runLength,
    runLength,
    roadmap: { completed: opts.completed, total: opts.total },
  };
  return { seed: opts.seed, strategy: opts.strategy ?? 'balanced', outcome, history };
}

// ── Bar 1: echo timing ───────────────────────────────────────────────────────

describe('echoTimingBar', () => {
  it('passes on the candidate crunch strategy — quits land in the window', () => {
    const result = echoTimingBar(runMany(SEEDS, 'always-crunch'));
    expect(result.pass).toBe(true);
    expect(result.lossRate).toBe(1);
    expect(result.prematureQuits).toBe(0);
  });

  it('fails when crunch is effectively free (low accrual ⇒ no losses)', () => {
    const result = echoTimingBar(
      runMany(SEEDS, 'always-crunch', { burnout: { crunchAccrual: 8 } }),
    );
    expect(result.pass).toBe(false);
    expect(result.lossRate).toBeLessThan(DEFAULT_BAR_CONFIG.echo.minCrunchLossRate);
    expect(result.summary).toMatch(/free/);
  });

  it('fails when the echo returns unforeseeably early (high accrual ⇒ premature)', () => {
    const result = echoTimingBar(
      runMany(SEEDS, 'always-crunch', { burnout: { crunchAccrual: 35 } }),
    );
    expect(result.pass).toBe(false);
    expect(result.prematureQuits).toBeGreaterThan(0);
    expect(result.summary).toMatch(/early/);
  });
});

// ── Bar 2: fairness ──────────────────────────────────────────────────────────

describe('fairnessBar', () => {
  it('passes on the candidate params — every loss is foreseeable', () => {
    const records = (['always-crunch', 'never-crunch', 'balanced', 'neglectful'] as const)
      .flatMap((s) => runMany(SEEDS, s));
    const result = fairnessBar(records);
    expect(result.pass).toBe(true);
    expect(result.unforeseeableLosses).toBe(0);
  });

  it('fails a broken set that collapses the warning band and drops the lead', () => {
    // atRiskBurnout == threshold erases the band; a zero lead lets a quit fire the first
    // sprint eligibility is reached — so a quit arrives with no prior at-risk read.
    const records = runMany(SEEDS, 'always-crunch', {
      attrition: { atRiskBurnout: 80, warningLeadSprints: 0 },
    });
    const result = fairnessBar(records);
    expect(result.pass).toBe(false);
    expect(result.unforeseeableLosses).toBeGreaterThan(0);
    expect(result.offendingSeeds.length).toBe(result.unforeseeableLosses);
  });

  it('detects a synthetic unforeseeable loss (no prior at-risk read, not fast)', () => {
    const record = lossRecord({
      seed: 1,
      quitSprint: 4,
      engineerId: 'eng-1',
      atRiskBefore: [], // never shown at-risk before the quit
      fastBurnout: false,
    });
    expect(fairnessBar([record]).unforeseeableLosses).toBe(1);
  });

  it('counts a warned loss as foreseeable', () => {
    const record = lossRecord({
      seed: 1,
      quitSprint: 4,
      engineerId: 'eng-1',
      atRiskBefore: [3], // shown at-risk the sprint before
      fastBurnout: false,
    });
    const result = fairnessBar([record]);
    expect(result.unforeseeableLosses).toBe(0);
    expect(result.pass).toBe(true);
  });

  it('excuses an unwarned loss when it is a bounded fast-burnout quit', () => {
    const record = lossRecord({
      seed: 1,
      quitSprint: 2,
      engineerId: 'eng-1',
      atRiskBefore: [],
      fastBurnout: true, // the coincident-warning exception
    });
    const result = fairnessBar([record]);
    expect(result.unforeseeableLosses).toBe(0);
    expect(result.fastBurnoutLosses).toBe(1);
  });
});

// ── Bar 3: dominant strategy ─────────────────────────────────────────────────

describe('dominantStrategyBar', () => {
  it('flags a free-lunch strategy that both survives and ships freely', () => {
    const freeLunch = [
      surviveRecord({ seed: 1, completed: 5, total: 5, finalReachedAt: 5 }),
      surviveRecord({ seed: 2, completed: 5, total: 5, finalReachedAt: 5 }),
    ];
    const risky = [lossRecord({ seed: 1, quitSprint: 4, engineerId: 'eng-1', atRiskBefore: [3], fastBurnout: false })];
    const result = dominantStrategyBar([
      ['never-crunch', freeLunch],
      ['always-crunch', risky],
    ]);
    expect(result.pass).toBe(false);
    expect(result.trivializing).toContain('never-crunch');
    expect(result.trivializing).not.toContain('always-crunch');
  });

  it('passes when every strategy trades something (no free lunch)', () => {
    // survives but ships little (roadmap 0.4 < trivial ceiling) — not a free lunch.
    const safeButSlow = [
      surviveRecord({ seed: 1, completed: 2, total: 5, finalReachedAt: 5 }),
      surviveRecord({ seed: 2, completed: 2, total: 5, finalReachedAt: 5 }),
    ];
    // ships everything but risks people (loss rate > 0) — not a free lunch either.
    const fastButRisky = [
      surviveRecord({ seed: 1, completed: 5, total: 5, finalReachedAt: 5 }),
      lossRecord({ seed: 2, quitSprint: 4, engineerId: 'eng-1', atRiskBefore: [3], fastBurnout: false, roadmap: { completed: 5, total: 5 } }),
    ];
    const result = dominantStrategyBar([
      ['never-crunch', safeButSlow],
      ['always-crunch', fastButRisky],
    ]);
    expect(result.pass).toBe(true);
    expect(result.trivializing).toHaveLength(0);
  });

  it('reports the loss-rate spread — the visible teeth of the crunch coupling', () => {
    const byStrategy = (['always-crunch', 'never-crunch', 'balanced', 'neglectful'] as const)
      .map((name) => [name, runMany(SEEDS, name)] as const);
    const result = dominantStrategyBar(byStrategy);
    const crunch = result.perStrategy.find((s) => s.strategy === 'always-crunch')!;
    const safe = result.perStrategy.find((s) => s.strategy === 'never-crunch')!;
    expect(crunch.lossRate).toBeGreaterThan(safe.lossRate);
    expect(result.lossRateSpread).toBeGreaterThan(0);
  });
});

// ── Bar 4: roadmap achievability ─────────────────────────────────────────────

describe('roadmapBar', () => {
  it('passes when the roadmap needs most of the run (tight-but-achievable)', () => {
    const records = [
      surviveRecord({ seed: 1, completed: 4, total: 5, finalReachedAt: 5 }),
      surviveRecord({ seed: 2, completed: 5, total: 5, finalReachedAt: 5 }),
    ];
    const result = roadmapBar(records, 6);
    expect(result.achievable).toBe(true);
    expect(result.trivial).toBe(false);
    expect(result.pass).toBe(true);
  });

  it('fails as trivial when the final count is reached far too early', () => {
    const records = [
      surviveRecord({ seed: 1, completed: 5, total: 5, finalReachedAt: 1 }),
      surviveRecord({ seed: 2, completed: 5, total: 5, finalReachedAt: 1 }),
    ];
    const result = roadmapBar(records, 6);
    expect(result.trivial).toBe(true);
    expect(result.pass).toBe(false);
    expect(result.summary).toMatch(/loose/);
  });

  it('fails as unreachable when almost nothing ships', () => {
    const records = [
      surviveRecord({ seed: 1, completed: 0, total: 5, finalReachedAt: 6 }),
      surviveRecord({ seed: 2, completed: 0, total: 5, finalReachedAt: 6 }),
    ];
    const result = roadmapBar(records, 6);
    expect(result.achievable).toBe(false);
    expect(result.pass).toBe(false);
    expect(result.summary).toMatch(/reachable/);
  });
});
