import { describe, it, expect } from 'vitest';
import { runReport, formatReport, DEFAULT_SEED_COUNT } from '../harness/report';

// The report assembles the four bars into one verdict and a greppable rendering. It must
// be deterministic, honest (overall pass is exactly the conjunction of the bars), and
// keep the fun-estimate strictly separate from the mechanical pass/fail.

// A small seed set for the structural checks — enough runs to exercise every path, few
// enough to stay instant. Verdicts about the *settled parameters* use the full default
// instead: per-strategy averages need a few hundred runs before they stop wandering
// across a bar's threshold, and a verdict read off a noisy sample is not a verdict.
const OPTS = { seedCount: 8 };

describe('runReport', () => {
  it('is deterministic for a given seed set and params', () => {
    expect(runReport(OPTS)).toEqual(runReport(OPTS));
  });

  it('carries all four bars and the run length', () => {
    const report = runReport(OPTS);
    expect(report.echo.bar).toBe('echo-timing');
    expect(report.fairness.bar).toBe('fairness');
    expect(report.dominant.bar).toBe('dominant-strategy');
    expect(report.roadmap.bar).toBe('roadmap-achievability');
    expect(report.runLength).toBe(6);
    expect(report.seeds).toHaveLength(8);
  });

  it('overall pass is exactly the conjunction of the four bars (no hidden inputs)', () => {
    const r = runReport(OPTS);
    expect(r.pass).toBe(
      r.echo.pass && r.fairness.pass && r.dominant.pass && r.roadmap.pass,
    );
  });

  it('holds the fairness guarantee on the settled params', () => {
    expect(runReport(OPTS).fairness.pass).toBe(true);
  });

  it('lands the delayed echo in its window on the settled params', () => {
    expect(runReport(OPTS).echo.pass).toBe(true);
  });

  it('passes all four mechanical bars on the settled constants', () => {
    // The settled values are exactly the ones that clear every bar; this is the assertion
    // that keeps them honest. A future retune that reopens one of them fails here first,
    // naming which property was traded away.
    const report = runReport({ seedCount: DEFAULT_SEED_COUNT });
    expect(report.echo.pass).toBe(true);
    expect(report.fairness.pass).toBe(true);
    expect(report.dominant.pass).toBe(true);
    expect(report.roadmap.pass).toBe(true);
    expect(report.pass).toBe(true);
  });

  it('still fails a roadmap the team clears with the run to spare', () => {
    // The teeth behind the pass above. A roadmap sized for a single sprint's output is
    // finished early and by everyone, which is precisely the state the settled size was
    // chosen to leave: both the roadmap bar and the free-lunch check must reopen.
    const report = runReport({ seedCount: DEFAULT_SEED_COUNT, override: { roadmap: { size: 5 } } });
    expect(report.roadmap.pass).toBe(false);
    expect(report.dominant.pass).toBe(false);
    expect(report.pass).toBe(false);
  });

  it('keeps the fun-estimate a labelled hypothesis, out of the mechanical verdict', () => {
    const report = runReport(OPTS);
    expect(report.funHypothesis).toMatch(/^HYPOTHESIS \(not measured\)/);
  });

  it('threads a tuning override through the whole report', () => {
    // Making crunch nearly free should flip the echo bar to a failure.
    const report = runReport({ ...OPTS, override: { burnout: { crunchAccrual: 8 } } });
    expect(report.echo.pass).toBe(false);
    expect(report.echo.lossRate).toBeLessThan(0.8);
  });
});

describe('formatReport', () => {
  it('renders a header, an overall line, a line per bar, and the hypothesis', () => {
    const lines = formatReport(runReport(OPTS));
    expect(lines[0]).toBe('Managed — mechanical tuning report');
    expect(lines.some((l) => l.startsWith('overall:'))).toBe(true);
    expect(lines.some((l) => l.includes('echo-timing'))).toBe(true);
    expect(lines.some((l) => l.includes('fairness'))).toBe(true);
    expect(lines.some((l) => l.includes('dominant-strategy'))).toBe(true);
    expect(lines.some((l) => l.includes('roadmap-achievability'))).toBe(true);
    expect(lines.at(-1)).toMatch(/^HYPOTHESIS/);
  });

  it('tags each bar with PASS or FAIL', () => {
    const lines = formatReport(runReport(OPTS));
    const barLines = lines.filter((l) => l.startsWith('['));
    expect(barLines).toHaveLength(4);
    for (const line of barLines) expect(line).toMatch(/^\[(PASS|FAIL)]/);
  });
});
