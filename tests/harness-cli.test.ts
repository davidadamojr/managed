import { describe, it, expect } from 'vitest';
import { runCli, SWEEPS } from '../harness/index';

// The CLI is the `npm run harness` surface. It is exercised through `runCli(args, log)`
// with a captured sink, so its dispatch is testable without spawning a process.

function capture(args: string[]): string[] {
  const lines: string[] = [];
  runCli(args, (line) => lines.push(line));
  return lines;
}

describe('runCli', () => {
  it('defaults to the tuning report', () => {
    const lines = capture(['--seeds', '4']);
    expect(lines[0]).toBe('Managed — mechanical tuning report');
    expect(lines[1]).toContain('seeds=4');
  });

  it('runs the report subcommand with a seed count', () => {
    const lines = capture(['report', '--seeds', '4']);
    expect(lines[1]).toContain('seeds=4');
  });

  it('runs a named sweep', () => {
    const lines = capture(['sweep', 'crunchAccrual', '--seeds', '4']);
    expect(lines[0]).toBe('Managed — sweep of crunchAccrual');
    // one value row per configured value
    expect(lines).toHaveLength(2 + SWEEPS.crunchAccrual!.values.length);
  });

  it('reports an unknown sweep with the available list', () => {
    const lines = capture(['sweep', 'nonsense']);
    expect(lines[0]).toMatch(/unknown sweep/);
    expect(lines[1]).toContain('crunchAccrual');
  });

  it('runs the RNG determinism smoke', () => {
    const lines = capture(['rng', '12345', '3']);
    expect(lines[0]).toBe('Managed — headless RNG harness');
    expect(lines).toHaveLength(2 + 3);
  });

  it('reports an unknown command with usage', () => {
    const lines = capture(['frobnicate']);
    expect(lines[0]).toMatch(/unknown command/);
    expect(lines[1]).toMatch(/usage:/);
  });

  it('is deterministic — identical args ⇒ identical output', () => {
    expect(capture(['report', '--seeds', '4'])).toEqual(capture(['report', '--seeds', '4']));
  });
});
