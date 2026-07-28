import { describe, it, expect } from 'vitest';
import {
  generateSequence,
  printRngDemo,
  DEFAULT_SEED,
  DEFAULT_DRAWS,
} from '../harness/rngDemo';

describe('generateSequence', () => {
  it('draws the requested count of floats in [0, 1)', () => {
    const seq = generateSequence(DEFAULT_SEED, DEFAULT_DRAWS);
    expect(seq).toHaveLength(DEFAULT_DRAWS);
    for (const value of seq) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generateSequence(DEFAULT_SEED, 20)).toEqual(
      generateSequence(DEFAULT_SEED, 20),
    );
  });

  it('a prefix of a longer sequence matches a shorter one (stream continuity)', () => {
    const long = generateSequence(DEFAULT_SEED, 20);
    const short = generateSequence(DEFAULT_SEED, 5);
    expect(long.slice(0, 5)).toEqual(short);
  });
});

describe('printRngDemo (headless print)', () => {
  it('prints a header, the parameters, and one line per draw', () => {
    const lines: string[] = [];
    printRngDemo(DEFAULT_SEED, 3, (line) => lines.push(line));

    expect(lines[0]).toBe('Managed — headless RNG harness');
    expect(lines[1]).toBe(`seed=${DEFAULT_SEED} draws=3`);
    expect(lines).toHaveLength(2 + 3);
    expect(lines[2]).toMatch(/^ {2}\[0] 0\.\d+$/);
  });

  it('prints identical output on repeat runs (deterministic)', () => {
    const first: string[] = [];
    const second: string[] = [];
    printRngDemo(DEFAULT_SEED, 5, (line) => first.push(line));
    printRngDemo(DEFAULT_SEED, 5, (line) => second.push(line));
    expect(second).toEqual(first);
  });
});
