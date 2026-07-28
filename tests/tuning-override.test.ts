import { describe, it, expect } from 'vitest';
import { getTuning, withTuning } from '../src/content/tuning';

// The scoped tuning override is the seam the harness sweeps through. These tests hold
// its two load-bearing properties: a merge that touches only what it names, and a scope
// that restores cleanly so determinism outside it is never disturbed.

describe('withTuning — scoped override', () => {
  it('merges a single leaf and leaves every sibling untouched', () => {
    const base = getTuning();
    withTuning({ burnout: { crunchAccrual: 99 } }, () => {
      const t = getTuning();
      expect(t.burnout.crunchAccrual).toBe(99);
      // Siblings within the patched section survive the merge.
      expect(t.burnout.overloadAccrual).toBe(base.burnout.overloadAccrual);
      expect(t.burnout.restfulRecovery).toBe(base.burnout.restfulRecovery);
      // Untouched sections are unchanged.
      expect(t.attrition.burnoutThreshold).toBe(base.attrition.burnoutThreshold);
    });
  });

  it('merges deeply nested leaves without dropping their siblings', () => {
    const base = getTuning();
    withTuning({ morale: { response: { recognize: 42 } } }, () => {
      const t = getTuning();
      expect(t.morale.response.recognize).toBe(42);
      expect(t.morale.response.oneOnOne).toBe(base.morale.response.oneOnOne);
      expect(t.morale.throughputAtHundred).toBe(base.morale.throughputAtHundred);
    });
  });

  it('restores the base constants after the scope ends', () => {
    const before = getTuning().burnout.crunchAccrual;
    withTuning({ burnout: { crunchAccrual: 1 } }, () => {
      expect(getTuning().burnout.crunchAccrual).toBe(1);
    });
    expect(getTuning().burnout.crunchAccrual).toBe(before);
  });

  it('restores even when the body throws', () => {
    const before = getTuning().burnout.crunchAccrual;
    expect(() =>
      withTuning({ burnout: { crunchAccrual: 7 } }, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(getTuning().burnout.crunchAccrual).toBe(before);
  });

  it('nests: an inner override layers onto the outer and unwinds to it', () => {
    const base = getTuning();
    withTuning({ burnout: { crunchAccrual: 20 } }, () => {
      expect(getTuning().burnout.crunchAccrual).toBe(20);
      withTuning({ burnout: { overloadAccrual: 30 } }, () => {
        const t = getTuning();
        expect(t.burnout.crunchAccrual).toBe(20); // outer still in force
        expect(t.burnout.overloadAccrual).toBe(30); // inner layered on
      });
      // Inner unwinds; outer remains.
      expect(getTuning().burnout.crunchAccrual).toBe(20);
      expect(getTuning().burnout.overloadAccrual).toBe(base.burnout.overloadAccrual);
    });
    expect(getTuning().burnout.crunchAccrual).toBe(base.burnout.crunchAccrual);
  });

  it('returns the body result, so a run can be simulated under alternate params inline', () => {
    const captured = withTuning({ run: { sprints: 3 } }, () => getTuning().run.sprints);
    expect(captured).toBe(3);
  });

  it('does not mutate the base constants', () => {
    const snapshot = getTuning().burnout.crunchAccrual;
    withTuning({ burnout: { crunchAccrual: 1234 } }, () => {});
    expect(getTuning().burnout.crunchAccrual).toBe(snapshot);
  });
});
