import { describe, it, expect } from 'vitest';
import { sweepParameter, formatSweep } from '../harness/sweep';

// A sweep re-measures the whole design across a range of one parameter. Its value is that
// the bars respond monotonically and sensibly — that is what lets the tuning pass read a
// column and choose a value.

const OPTS = { seedCount: 8 };

describe('sweepParameter', () => {
  it('is deterministic', () => {
    const run = () =>
      sweepParameter('crunchAccrual', [12, 20], (v) => ({ burnout: { crunchAccrual: v } }), OPTS);
    expect(run()).toEqual(run());
  });

  it('carries one point per value, each with its value, override, and report', () => {
    const result = sweepParameter(
      'crunchAccrual',
      [12, 15, 20],
      (v) => ({ burnout: { crunchAccrual: v } }),
      OPTS,
    );
    expect(result.points.map((p) => p.value)).toEqual([12, 15, 20]);
    expect(result.points[0]!.override).toEqual({ burnout: { crunchAccrual: 12 } });
    expect(result.points[0]!.report.echo.bar).toBe('echo-timing');
  });

  it('moves the echo earlier as crunch accrual rises (monotonic, sensible response)', () => {
    // Values chosen to all produce losses, so every point has a mean quit sprint.
    const result = sweepParameter(
      'crunchAccrual',
      [12, 15, 20, 25],
      (v) => ({ burnout: { crunchAccrual: v } }),
      OPTS,
    );
    const means = result.points.map((p) => p.report.echo.meanQuitSprint!);
    for (let i = 1; i < means.length; i += 1) {
      expect(means[i]!).toBeLessThanOrEqual(means[i - 1]!);
    }
  });

  it('drives the echo bar from free → passing → premature across the range', () => {
    const result = sweepParameter(
      'crunchAccrual',
      [8, 15, 35],
      (v) => ({ burnout: { crunchAccrual: v } }),
      OPTS,
    );
    const [free, good, premature] = result.points.map((p) => p.report.echo);
    expect(free!.pass).toBe(false); // crunch effectively free
    expect(good!.pass).toBe(true); // lands in the window
    expect(premature!.pass).toBe(false); // returns too early
    expect(premature!.prematureQuits).toBeGreaterThan(0);
  });

  it('keeps fairness intact across the whole sweep (the guarantee is structural)', () => {
    const result = sweepParameter(
      'crunchAccrual',
      [8, 15, 25, 35],
      (v) => ({ burnout: { crunchAccrual: v } }),
      OPTS,
    );
    for (const point of result.points) {
      expect(point.report.fairness.unforeseeableLosses).toBe(0);
    }
  });
});

describe('formatSweep', () => {
  it('renders a header and one line per value', () => {
    const result = sweepParameter(
      'crunchAccrual',
      [12, 20],
      (v) => ({ burnout: { crunchAccrual: v } }),
      OPTS,
    );
    const lines = formatSweep(result);
    expect(lines[0]).toBe('Managed — sweep of crunchAccrual');
    // header row + two value rows
    expect(lines).toHaveLength(2 + 2);
    expect(lines.at(-1)).toMatch(/^\s+20 \|/);
  });
});
