import { describe, it, expect } from 'vitest';
import { listAtRiskWarnings } from '../src/content/reads';

// The at-risk warning is the one place in the MVP where tone carries weight: it must
// read as a human observation ("seems checked out lately"), never a health-bar alert,
// and it must never leak a raw number — the whole point is a fuzzy read. This test
// pins the shape and guards those two rules against a phrasing that drifts into
// system-speak or exposes an interior value.

describe('at-risk warning phrasings', () => {
  const warnings = listAtRiskWarnings();

  it('offers a small pool of phrasings, not a single canned line', () => {
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    // A tiny seed set, like the event library — voice grows much later, not here.
    expect(warnings.length).toBeLessThanOrEqual(12);
  });

  it('gives every phrasing distinct, non-empty text', () => {
    expect(new Set(warnings).size).toBe(warnings.length);
    for (const warning of warnings) {
      expect(warning.trim()).not.toBe('');
    }
  });

  it('reads as observation, not a system alert', () => {
    // No klaxon words — the read is something a manager notices, not something the
    // system announces.
    const alarmish = /\b(alert|warning|error|critical|risk|attrition|burnout|status)\b/i;
    for (const warning of warnings) {
      expect(warning).not.toMatch(alarmish);
    }
  });

  it('never exposes a raw number — the read stays fuzzy', () => {
    for (const warning of warnings) {
      expect(warning).not.toMatch(/\d/);
    }
  });
});
