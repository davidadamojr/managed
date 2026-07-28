/**
 * The tuning report — the harness's headline artifact. It plays every strategy over a
 * seed set (optionally under an alternate parameter override), runs the four mechanical
 * bars over the resulting records, and assembles a single plain-data verdict plus a
 * greppable console rendering.
 *
 * Two honesty disciplines from §2 and §10 shape it:
 *   - The four bars are *mechanical* pass/fail against explicit thresholds. They report
 *     what is. When a candidate set fails, the report fails it — loudly, with numbers.
 *   - Claude Code's *fun-estimate* is a different kind of claim, so it is kept in its own
 *     clearly-labelled field, never folded into the mechanical pass/fail. It is a
 *     hypothesis for the builder to confirm or correct by playing, not a measured result.
 *
 * The report is deterministic: a given seed set and parameter override always produce
 * the identical report, because everything under it is deterministic.
 */

import { getTuning, withTuning, type TuningOverride } from '../src/content';
import { runMany, makeSeeds, HARNESS_BASE_SEED } from './simulate';
import type { RunRecord } from './simulate';
import { STRATEGY_NAMES, type StrategyName } from './strategies';
import {
  echoTimingBar,
  fairnessBar,
  dominantStrategyBar,
  roadmapBar,
  DEFAULT_BAR_CONFIG,
  type BarConfig,
  type EchoTimingResult,
  type FairnessResult,
  type DominantStrategyResult,
  type RoadmapResult,
} from './bars';

/** How to run the report: how many seeds, from where, under what params and thresholds. */
export interface ReportOptions {
  readonly seedCount?: number;
  readonly baseSeed?: number;
  readonly override?: TuningOverride;
  readonly config?: BarConfig;
}

/** The assembled mechanical verdict plus the separated fun-estimate. */
export interface TuningReport {
  readonly seeds: readonly number[];
  readonly runLength: number;
  readonly echo: EchoTimingResult;
  readonly fairness: FairnessResult;
  readonly dominant: DominantStrategyResult;
  readonly roadmap: RoadmapResult;
  /** True only when all four mechanical bars pass. */
  readonly pass: boolean;
  /**
   * Claude Code's best-estimate of felt fun — explicitly a hypothesis, NOT a measured
   * bar. Separated so it can never be mistaken for a mechanical result. The builder owns
   * felt fun by playing; this only offers a starting read to confirm or correct.
   */
  readonly funHypothesis: string;
}

/** The strategy that supplies the echo-timing bar: pure, sustained crunch. */
const CRUNCH_STRATEGY: StrategyName = 'always-crunch';
/** The strategy that supplies the roadmap bar: reasonable play that pursues the roadmap. */
const ROADMAP_STRATEGY: StrategyName = 'balanced';

/**
 * Compose the fun-estimate from the mechanical verdicts. Deliberately hedged and derived
 * only from what the bars found, so it stays an honest hypothesis rather than a verdict.
 */
function funHypothesisFor(
  echo: EchoTimingResult,
  fairness: FairnessResult,
  dominant: DominantStrategyResult,
  roadmap: RoadmapResult,
): string {
  const echoAlive = echo.pass && fairness.pass;
  const juggleLoose = !dominant.pass || !roadmap.pass;
  if (echoAlive && !juggleLoose) {
    return 'HYPOTHESIS (not measured): the delayed echo lands fairly and the juggle asks for real trade-offs — this is the configuration most likely to feel tense. Play it to confirm the loss lands as a punch.';
  }
  if (echoAlive && juggleLoose) {
    return 'HYPOTHESIS (not measured): the crunch→burnout→attrition echo is intact and fair, but survival and/or the roadmap are currently too easy, so the run probably only bites when the player self-imposes pressure. Likely feels slack until the juggle is tightened.';
  }
  return 'HYPOTHESIS (not measured): the core echo is not landing in its window or not reliably fair, so the run probably feels arbitrary rather than earned. Fix the echo before judging felt fun.';
}

/**
 * Run the full report. Plays all four strategies over the seed set under the given
 * override, then reduces the records through the bars. Records are produced once per
 * strategy and reused: the fairness bar sees every record, the echo and roadmap bars see
 * their designated strategy, and the dominant-strategy bar sees them grouped.
 */
export function runReport(options: ReportOptions = {}): TuningReport {
  const {
    seedCount = 24,
    baseSeed = HARNESS_BASE_SEED,
    override = {},
    config = DEFAULT_BAR_CONFIG,
  } = options;

  const seeds = makeSeeds(seedCount, baseSeed);
  const runLength = withTuning(override, () => getTuning().run.sprints);

  const byStrategy = STRATEGY_NAMES.map(
    (name) => [name, runMany(seeds, name, override)] as const,
  );
  const recordsByStrategy = new Map<StrategyName, readonly RunRecord[]>(byStrategy);
  const allRecords = byStrategy.flatMap(([, records]) => records);

  const echo = echoTimingBar(recordsByStrategy.get(CRUNCH_STRATEGY)!, config);
  const fairness = fairnessBar(allRecords);
  const dominant = dominantStrategyBar(byStrategy, config);
  const roadmap = roadmapBar(recordsByStrategy.get(ROADMAP_STRATEGY)!, runLength, config);

  const pass = echo.pass && fairness.pass && dominant.pass && roadmap.pass;
  const funHypothesis = funHypothesisFor(echo, fairness, dominant, roadmap);

  return { seeds, runLength, echo, fairness, dominant, roadmap, pass, funHypothesis };
}

/** A single PASS/FAIL tag for a bar. */
function tag(pass: boolean): string {
  return pass ? 'PASS' : 'FAIL';
}

/**
 * Render a report as greppable console lines (one concern per line, so runs diff cleanly
 * across parameter sets). Returns the lines rather than printing them, so the rendering
 * is testable and the CLI owns the actual output.
 */
export function formatReport(report: TuningReport): string[] {
  const lines: string[] = [];
  lines.push('Managed — mechanical tuning report');
  lines.push(
    `seeds=${report.seeds.length} (base ${report.seeds[0]}) runLength=${report.runLength}`,
  );
  lines.push(`overall: ${tag(report.pass)} (${[report.echo, report.fairness, report.dominant, report.roadmap].filter((b) => b.pass).length}/4 bars pass)`);
  lines.push('');

  lines.push(`[${tag(report.echo.pass)}] echo-timing — ${report.echo.summary}`);
  lines.push(
    `        lossRate=${report.echo.lossRate.toFixed(2)} quitSprints=${JSON.stringify(report.echo.quitSprintCounts)} premature=${report.echo.prematureQuits}`,
  );

  lines.push(`[${tag(report.fairness.pass)}] fairness — ${report.fairness.summary}`);
  lines.push(
    `        losses=${report.fairness.totalLosses} unforeseeable=${report.fairness.unforeseeableLosses} fastBurnout=${report.fairness.fastBurnoutLosses}`,
  );

  lines.push(`[${tag(report.dominant.pass)}] dominant-strategy — ${report.dominant.summary}`);
  for (const stat of report.dominant.perStrategy) {
    lines.push(
      `        ${stat.strategy.padEnd(14)} complete=${stat.completionRate.toFixed(2)} loss=${stat.lossRate.toFixed(2)} roadmap=${stat.avgRoadmap.toFixed(2)}`,
    );
  }

  lines.push(`[${tag(report.roadmap.pass)}] roadmap-achievability — ${report.roadmap.summary}`);
  lines.push(
    `        avgFraction=${report.roadmap.avgFraction.toFixed(2)} fullRate=${report.roadmap.fullCompletionRate.toFixed(2)} finalCounts=${JSON.stringify(report.roadmap.finalCountDistribution)}`,
  );

  lines.push('');
  lines.push(report.funHypothesis);
  return lines;
}
