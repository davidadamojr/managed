import { describe, it, expect } from 'vitest';
import {
  listAtRiskWarnings,
  listAllReadPhrasings,
  moodRead,
  trendClause,
} from '../src/content/reads';

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

// The mood reads and trend clauses are the everyday, not-yet-at-risk half of the same
// legibility surface, and they live under the same two rules: observation over alarm,
// and no raw number ever. Holding the whole phrasing set to those rules at once keeps a
// new mood band or trend clause from drifting into system-speak or leaking an interior.
describe('all read phrasings', () => {
  const phrasings = listAllReadPhrasings();
  const alarmish = /\b(alert|warning|error|critical|risk|attrition|burnout|status)\b/i;

  it('gives every phrasing distinct, non-empty text', () => {
    expect(new Set(phrasings).size).toBe(phrasings.length);
    for (const phrasing of phrasings) {
      expect(phrasing.trim()).not.toBe('');
    }
  });

  it('reads as observation, never a system alert, and never a raw number', () => {
    for (const phrasing of phrasings) {
      expect(phrasing).not.toMatch(alarmish);
      expect(phrasing).not.toMatch(/\d/);
    }
  });

  it('offers a read for each mood band and a clause for each direction', () => {
    for (const band of ['thriving', 'steady', 'dipping', 'struggling'] as const) {
      expect(moodRead(band).trim()).not.toBe('');
    }
    for (const direction of ['rising', 'falling'] as const) {
      // The "again" reading must differ from the first-time one, or a sustained trend
      // would read no differently from a one-sprint move.
      expect(trendClause(direction, true)).not.toBe(trendClause(direction, false));
    }
  });
});
