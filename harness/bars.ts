/**
 * The mechanical bars — the four properties the harness measures the design against.
 * Each bar is a PURE reduction over `RunRecord`s: records in, a pass/fail verdict plus
 * the supporting numbers out. Keeping them pure (no simulation, no I/O) means they are
 * unit-testable against hand-built records and produce identical verdicts for identical
 * inputs.
 *
 * The honesty rule (§2) lives here above all: a bar reports what *is*. Its `pass` is a
 * mechanical judgment against an explicit, tunable threshold — never a flattering nudge.
 * When the candidate constants fail a bar, the bar says so, with the numbers that show
 * why, so the tuning pass has something real to correct.
 *
 * Every threshold is a `BarConfig` field with a documented default, because the
 * thresholds themselves are decisions-to-validate: the tuning pass may move them as play
 * teaches what "tight-but-achievable" or "premature" actually feel like.
 */

import type { RunRecord } from './simulate';
import { isLoss, quitSprint, roadmapFraction } from './simulate';
import type { StrategyName } from './strategies';

/**
 * The thresholds that turn raw numbers into pass/fail. Grouped by bar. Defaults live in
 * `DEFAULT_BAR_CONFIG`; a sweep or the tuning pass may override any of them.
 */
export interface BarConfig {
  readonly echo: {
    /**
     * The earliest sprint index (0-based) a crunch-driven quit may land in and still be
     * foreseeable. A quit before this is "premature" — the echo returned too fast for
     * the player to have read and acted on it.
     */
    readonly prematureFloor: number;
    /** Minimum share of crunch runs that must end in a loss, or crunch is effectively free. */
    readonly minCrunchLossRate: number;
  };
  readonly dominant: {
    /** A strategy losing at or below this rate counts as "survives freely" for the trivial check. */
    readonly trivialMaxLossRate: number;
    /** ...and shipping at or above this roadmap fraction counts as "ships freely". Both ⇒ a free lunch. */
    readonly trivialMinRoadmap: number;
  };
  readonly roadmap: {
    /** Below this mean roadmap fraction, the roadmap reads as effectively unreachable. */
    readonly minAchievableFraction: number;
    /**
     * Fraction of the run by which reaching the final roadmap count reads as "trivially
     * early". Reaching it before `runLength * this` means the target had too much runway
     * to spare — loose, not tight.
     */
    readonly earlyCompletionFraction: number;
  };
}

/**
 * Candidate thresholds — starting points, not settled truth. They encode the design
 * intent ("quits land mid-to-late run", "no strategy both survives and ships for free",
 * "the roadmap needs most of the run") so the bars measure against intent, and the
 * tuning pass revises them alongside the constants.
 */
export const DEFAULT_BAR_CONFIG: BarConfig = {
  echo: { prematureFloor: 3, minCrunchLossRate: 0.8 },
  dominant: { trivialMaxLossRate: 0, trivialMinRoadmap: 0.9 },
  roadmap: { minAchievableFraction: 0.2, earlyCompletionFraction: 0.6 },
};

/** The verdict shape shared by every bar: a name, a pass/fail, and a one-line summary. */
export interface BarVerdict {
  readonly bar: string;
  readonly pass: boolean;
  readonly summary: string;
}

// ── Bar 1: echo timing ──────────────────────────────────────────────────────

export interface EchoTimingResult extends BarVerdict {
  readonly runs: number;
  readonly lossRate: number;
  /** Count of quits per sprint index, e.g. { 3: 7, 4: 23 }. */
  readonly quitSprintCounts: Readonly<Record<number, number>>;
  readonly meanQuitSprint: number | null;
  /** Quits that landed before the premature floor — unforeseeably early. */
  readonly prematureQuits: number;
  readonly prematureFloor: number;
}

/**
 * Does a crunch strategy's echo land in the intended window? Feed it the crunch-strategy
 * records. It passes when crunch is genuinely punished (loss rate high enough that crunch
 * is not free) AND no quit lands before the premature floor (the echo never returns so
 * fast it was unforeseeable). Both failure modes the design fears — "never" and "too
 * early" — are surfaced with their numbers.
 */
export function echoTimingBar(
  crunchRecords: readonly RunRecord[],
  config: BarConfig = DEFAULT_BAR_CONFIG,
): EchoTimingResult {
  const { prematureFloor, minCrunchLossRate } = config.echo;
  const losses = crunchRecords.filter(isLoss);
  const quitSprints = losses.map((r) => quitSprint(r)!);
  const quitSprintCounts: Record<number, number> = {};
  for (const sprint of quitSprints) {
    quitSprintCounts[sprint] = (quitSprintCounts[sprint] ?? 0) + 1;
  }
  const lossRate = crunchRecords.length === 0 ? 0 : losses.length / crunchRecords.length;
  const meanQuitSprint =
    quitSprints.length === 0
      ? null
      : quitSprints.reduce((a, b) => a + b, 0) / quitSprints.length;
  const prematureQuits = quitSprints.filter((s) => s < prematureFloor).length;

  const notFree = lossRate >= minCrunchLossRate;
  const notPremature = prematureQuits === 0;
  const pass = notFree && notPremature;
  const summary = pass
    ? `crunch punished (loss ${(lossRate * 100).toFixed(0)}%), quits land no earlier than sprint ${prematureFloor}; mean quit sprint ${meanQuitSprint?.toFixed(2)}`
    : !notFree
      ? `crunch is nearly free — only ${(lossRate * 100).toFixed(0)}% of crunch runs lose anyone`
      : `${prematureQuits} quit(s) landed before sprint ${prematureFloor} — the echo returned unforeseeably early`;

  return {
    bar: 'echo-timing',
    pass,
    summary,
    runs: crunchRecords.length,
    lossRate,
    quitSprintCounts,
    meanQuitSprint,
    prematureQuits,
    prematureFloor,
  };
}

// ── Bar 2: fairness ─────────────────────────────────────────────────────────

export interface FairnessResult extends BarVerdict {
  readonly totalLosses: number;
  readonly unforeseeableLosses: number;
  readonly fastBurnoutLosses: number;
  /** Seeds whose loss arrived with no prior at-risk read and no fast-burnout excuse. */
  readonly offendingSeeds: readonly number[];
}

/**
 * Whether a departing engineer was shown as at-risk in a sprint strictly before the one
 * they quit in. Read directly from the run's own history — the actual reads the player
 * saw — rather than trusting the departure trace's count, so the bar is an independent
 * audit of the fairness guarantee.
 */
function warnedBeforeQuit(record: RunRecord): boolean {
  const postMortem = record.outcome.postMortem;
  if (!postMortem) return true; // no loss to judge
  return record.history.some(
    (summary) =>
      summary.sprintIndex < postMortem.sprintIndex &&
      summary.reads.some(
        (read) => read.engineerId === postMortem.engineerId && read.atRisk,
      ),
  );
}

/**
 * Does the at-risk warning reliably precede attrition? Feed it every record across every
 * strategy. It passes only when zero losses are "unforeseeable" — a quit with no prior
 * at-risk read AND no fast-burnout justification. The bounded fast-burnout exception is
 * counted separately and does not fail the bar; it is the design's own escape hatch for
 * a spike so drastic that a coincident warning is fair.
 */
export function fairnessBar(records: readonly RunRecord[]): FairnessResult {
  const losses = records.filter(isLoss);
  const offendingSeeds: number[] = [];
  let fastBurnoutLosses = 0;

  for (const record of losses) {
    const postMortem = record.outcome.postMortem!;
    if (postMortem.fastBurnout) fastBurnoutLosses += 1;
    const foreseeable = warnedBeforeQuit(record) || postMortem.fastBurnout;
    if (!foreseeable) offendingSeeds.push(record.seed);
  }

  const unforeseeableLosses = offendingSeeds.length;
  const pass = unforeseeableLosses === 0;
  const summary = pass
    ? `${losses.length} loss(es) audited, all foreseeable (${fastBurnoutLosses} via the bounded fast-burnout exception)`
    : `${unforeseeableLosses} unforeseeable loss(es) — a quit arrived with no prior at-risk warning (seeds ${offendingSeeds.join(', ')})`;

  return {
    bar: 'fairness',
    pass,
    summary,
    totalLosses: losses.length,
    unforeseeableLosses,
    fastBurnoutLosses,
    offendingSeeds,
  };
}

// ── Bar 3: dominant strategy ────────────────────────────────────────────────

export interface StrategyStat {
  readonly strategy: StrategyName;
  readonly runs: number;
  readonly completionRate: number;
  readonly lossRate: number;
  readonly avgRoadmap: number;
}

export interface DominantStrategyResult extends BarVerdict {
  readonly perStrategy: readonly StrategyStat[];
  /** Strategies that both survive freely and ship the roadmap freely — the free lunches. */
  readonly trivializing: readonly StrategyName[];
  /** Spread between the highest and lowest strategy loss rate — the coupling's teeth. */
  readonly lossRateSpread: number;
}

/** Aggregate one strategy's records into its completion / loss / roadmap stats. */
function strategyStat(
  strategy: StrategyName,
  records: readonly RunRecord[],
): StrategyStat {
  const runs = records.length;
  const completions = records.filter((r) => r.outcome.result === 'completed').length;
  const losses = records.filter(isLoss).length;
  const roadmapSum = records.reduce((sum, r) => sum + roadmapFraction(r), 0);
  return {
    strategy,
    runs,
    completionRate: runs === 0 ? 0 : completions / runs,
    lossRate: runs === 0 ? 0 : losses / runs,
    avgRoadmap: runs === 0 ? 0 : roadmapSum / runs,
  };
}

/**
 * Is any strategy a free lunch that trivializes the juggle? Feed it each strategy's
 * records. A strategy "trivializes" when it both survives freely (loss rate at or below
 * the trivial floor) and ships the roadmap freely (average roadmap at or above the
 * trivial ceiling) — winning both axes with no trade. The bar passes only when no such
 * strategy exists, so every approach must give something up. The loss-rate spread is
 * reported too: it is the visible teeth of the crunch coupling (a punished crunch
 * strategy against safe ones), independent of the trivial check.
 */
export function dominantStrategyBar(
  byStrategy: ReadonlyArray<readonly [StrategyName, readonly RunRecord[]]>,
  config: BarConfig = DEFAULT_BAR_CONFIG,
): DominantStrategyResult {
  const { trivialMaxLossRate, trivialMinRoadmap } = config.dominant;
  const perStrategy = byStrategy.map(([name, records]) => strategyStat(name, records));

  const trivializing = perStrategy
    .filter(
      (s) => s.lossRate <= trivialMaxLossRate && s.avgRoadmap >= trivialMinRoadmap,
    )
    .map((s) => s.strategy);

  const lossRates = perStrategy.map((s) => s.lossRate);
  const lossRateSpread =
    lossRates.length === 0 ? 0 : Math.max(...lossRates) - Math.min(...lossRates);

  const pass = trivializing.length === 0;
  const summary = pass
    ? `no free-lunch strategy — every approach trades survival against the roadmap (loss-rate spread ${(lossRateSpread * 100).toFixed(0)}%)`
    : `${trivializing.length} strategy(ies) survive and ship the roadmap for free: ${trivializing.join(', ')} — the juggle is too loose`;

  return { bar: 'dominant-strategy', pass, summary, perStrategy, trivializing, lossRateSpread };
}

// ── Bar 4: roadmap achievability ────────────────────────────────────────────

export interface RoadmapResult extends BarVerdict {
  readonly runs: number;
  readonly avgFraction: number;
  readonly fullCompletionRate: number;
  /** Count of runs ending at each roadmap completed-count, e.g. { 3: 1, 4: 6, 5: 33 }. */
  readonly finalCountDistribution: Readonly<Record<number, number>>;
  /** Mean sprint index at which a run first reached its final roadmap count. */
  readonly meanCompletionSprint: number | null;
  readonly achievable: boolean;
  readonly trivial: boolean;
}

/** The earliest sprint index whose summary shows the run's final roadmap count. */
function sprintReachingFinal(record: RunRecord): number | null {
  const finalDone = record.outcome.roadmap.completed;
  if (finalDone === 0) return null;
  const hit = record.history.find((s) => s.roadmap.completed >= finalDone);
  return hit ? hit.sprintIndex : null;
}

/**
 * Is the roadmap tight-but-achievable? Feed it a reasonable strategy's records (one that
 * actually pursues the roadmap). It passes when the roadmap is both approachable (mean
 * completion fraction above the achievable floor) and NOT trivial — where trivial means
 * the run reaches its final roadmap count with too much of the run still to spare. The
 * distribution and the mean completion sprint are reported so a "too loose" or
 * "impossible" verdict is backed by the shape, not just a flag.
 */
export function roadmapBar(
  records: readonly RunRecord[],
  runLength: number,
  config: BarConfig = DEFAULT_BAR_CONFIG,
): RoadmapResult {
  const { minAchievableFraction, earlyCompletionFraction } = config.roadmap;
  const runs = records.length;

  const avgFraction =
    runs === 0 ? 0 : records.reduce((s, r) => s + roadmapFraction(r), 0) / runs;
  const fullCompletions = records.filter((r) => roadmapFraction(r) >= 1).length;
  const fullCompletionRate = runs === 0 ? 0 : fullCompletions / runs;

  const finalCountDistribution: Record<number, number> = {};
  for (const record of records) {
    const done = record.outcome.roadmap.completed;
    finalCountDistribution[done] = (finalCountDistribution[done] ?? 0) + 1;
  }

  const completionSprints = records
    .map(sprintReachingFinal)
    .filter((s): s is number => s !== null);
  const meanCompletionSprint =
    completionSprints.length === 0
      ? null
      : completionSprints.reduce((a, b) => a + b, 0) / completionSprints.length;

  const achievable = avgFraction >= minAchievableFraction;
  const earlyThreshold = runLength * earlyCompletionFraction;
  const trivial =
    meanCompletionSprint !== null && meanCompletionSprint < earlyThreshold;
  const pass = achievable && !trivial;

  const summary = pass
    ? `roadmap tight-but-achievable — mean ${(avgFraction * 100).toFixed(0)}% done, final count reached around sprint ${meanCompletionSprint?.toFixed(2)}`
    : !achievable
      ? `roadmap barely reachable — mean only ${(avgFraction * 100).toFixed(0)}% completed`
      : `roadmap too loose — final count reached around sprint ${meanCompletionSprint?.toFixed(2)} of ${runLength}, well before the run ends`;

  return {
    bar: 'roadmap-achievability',
    pass,
    summary,
    runs,
    avgFraction,
    fullCompletionRate,
    finalCountDistribution,
    meanCompletionSprint,
    achievable,
    trivial,
  };
}
