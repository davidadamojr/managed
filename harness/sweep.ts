/**
 * Parameter sweep — run the full report across a range of values for one tuning
 * parameter and capture how each bar responds. This is the instrument the tuning pass
 * (prompt 17) leans on: watch a bar move as a constant changes, then pick the value that
 * lands every bar in its intended regime.
 *
 * The parameter is named by a *lens* — a function that turns a swept value into the
 * override that sets it — rather than a string path, so it stays type-checked against the
 * real tuning shape and a typo is a compile error, not a silent no-op. Each point carries
 * its full report, so a caller (or a test) can read any bar's numbers across the sweep
 * and confirm the response is monotonic and sensible.
 *
 * Deterministic throughout: the same values, lens, and options always yield the same
 * sweep, because each point is just a deterministic report under a fixed override.
 */

import type { TuningOverride } from '../src/content';
import { runReport, type ReportOptions, type TuningReport } from './report';

/** Report options minus the override — the sweep supplies the override from its lens. */
export type SweepOptions = Omit<ReportOptions, 'override'>;

/** One value's place in a sweep: the value, the override it produced, and the report. */
export interface SweepPoint {
  readonly value: number;
  readonly override: TuningOverride;
  readonly report: TuningReport;
}

/** A whole sweep: the parameter's label, the values tried, and a point for each. */
export interface SweepResult {
  readonly parameter: string;
  readonly values: readonly number[];
  readonly points: readonly SweepPoint[];
}

/**
 * Sweep one parameter across `values`. `overrideFor` maps a value to the complete tuning
 * override for that point (e.g. `(v) => ({ burnout: { crunchAccrual: v } })`), so any
 * parameter — even a deeply nested one — is swept the same way. Every point runs the same
 * seed set, isolating the one changed parameter as the only difference between reports.
 */
export function sweepParameter(
  parameter: string,
  values: readonly number[],
  overrideFor: (value: number) => TuningOverride,
  options: SweepOptions = {},
): SweepResult {
  const points = values.map((value) => {
    const override = overrideFor(value);
    const report = runReport({ ...options, override });
    return { value, override, report };
  });
  return { parameter, values, points };
}

/**
 * Render a sweep as greppable console lines — one line per value with each bar's verdict
 * and its most telling number, so the response reads down the column at a glance.
 */
export function formatSweep(result: SweepResult): string[] {
  const lines: string[] = [];
  lines.push(`Managed — sweep of ${result.parameter}`);
  lines.push('  value | echo             | fairness      | dominant        | roadmap');
  for (const { value, report } of result.points) {
    const echo = `${report.echo.pass ? 'ok ' : 'BAD'} meanQuit=${report.echo.meanQuitSprint?.toFixed(2) ?? 'n/a'}`;
    const fairness = `${report.fairness.pass ? 'ok ' : 'BAD'} unf=${report.fairness.unforeseeableLosses}`;
    const dominant = `${report.dominant.pass ? 'ok ' : 'BAD'} triv=${report.dominant.trivializing.length}`;
    const roadmap = `${report.roadmap.pass ? 'ok ' : 'BAD'} avg=${report.roadmap.avgFraction.toFixed(2)}`;
    lines.push(
      `  ${String(value).padStart(5)} | ${echo.padEnd(16)} | ${fairness.padEnd(13)} | ${dominant.padEnd(15)} | ${roadmap}`,
    );
  }
  return lines;
}
