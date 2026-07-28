import { describe, it, expect } from 'vitest';
import {
  deriveSummary,
  atRiskWarning,
  type Engineer,
  type EngineerRead,
  type SummaryInputs,
  type SkillProficiencies,
} from '../src/engine';
import {
  listAtRiskWarnings,
  atRiskPersistenceRead,
  moodRead,
  getTuning,
  listSkills,
} from '../src/content';

// The sprint summary is the game's most important surface: it makes the invisible
// state of the team legible at the one moment the player most needs to read it. These
// tests hold the four rules that matter. The read is fuzzy — a band and a direction,
// never a raw number. Trends are first-class — direction reads across sprints, and the
// first sprint honestly shows none. A 1:1 sharpens the read on its target. And the
// at-risk warning surfaces as a human observation, unconditionally.

const t = getTuning();

// ---- fixtures -------------------------------------------------------------

function flatSkills(value = 50): SkillProficiencies {
  const map = {} as Record<string, number>;
  for (const s of listSkills()) map[s] = value;
  return map as SkillProficiencies;
}

/** An engineer at chosen morale/burnout, with optional at-risk streak. */
function person(
  over: { id?: string; name?: string; morale?: number; burnout?: number; atRiskSprints?: number } = {},
): Engineer {
  const base: Engineer = {
    id: over.id ?? 'e',
    name: over.name ?? 'Priya',
    flavor: 'vibe',
    skills: flatSkills(),
    morale: over.morale ?? 65,
    burnout: over.burnout ?? 10,
    assignment: null,
  };
  return over.atRiskSprints
    ? { ...base, flags: { atRiskSprints: over.atRiskSprints } }
    : base;
}

/** Build derivation inputs over a roster, with sensible defaults for the rest. */
function inputs(roster: readonly Engineer[], over: Partial<SummaryInputs> = {}): SummaryInputs {
  return {
    sprintIndex: 0,
    shipped: [],
    roadmap: { completed: 0, total: 0 },
    roster,
    priorMoraleById: {},
    oneOnOneIds: [],
    ...over,
  };
}

/** The single read for a single-engineer derivation. */
function onlyRead(over: Partial<SummaryInputs> & { roster: readonly Engineer[] }): EngineerRead {
  return deriveSummary(inputs(over.roster, over)).reads[0]!;
}

// ---- shape: the summary carries what the manager reads --------------------

describe('deriveSummary — the readable account', () => {
  it('populates what shipped, roadmap progress, a read per engineer, and the fired event', () => {
    const roster = [person({ id: 'a', name: 'Ada' }), person({ id: 'b', name: 'Ben' })];
    const summary = deriveSummary(
      inputs(roster, {
        shipped: ['k1'],
        roadmap: { completed: 1, total: 3 },
        event: { id: 'demo', description: 'A demo lands at 4pm.', affectedEngineerIds: ['a'] },
      }),
    );

    expect(summary.shipped).toEqual(['k1']);
    expect(summary.roadmap).toEqual({ completed: 1, total: 3 });
    expect(summary.event?.id).toBe('demo');
    expect(summary.reads.map((r) => r.engineerId)).toEqual(['a', 'b']);
    for (const read of summary.reads) {
      expect(read).toMatchObject({
        note: expect.any(String),
        atRisk: expect.any(Boolean),
        mood: expect.any(String),
        trend: expect.any(String),
        sharpened: expect.any(Boolean),
      });
    }
  });

  it('is a pure function of its inputs — derived twice, identical', () => {
    const roster = [person({ id: 'a' }), person({ id: 'b', atRiskSprints: 2 })];
    expect(deriveSummary(inputs(roster))).toEqual(deriveSummary(inputs(roster)));
  });
});

// ---- the hard privacy line: no raw interior crosses the boundary ----------

describe('deriveSummary — never leaks a raw morale or burnout number', () => {
  it('carries no morale/burnout value or key anywhere in the serialized summary', () => {
    // Distinctive interiors that would be easy to spot if they leaked.
    const roster = [person({ id: 'a', morale: 63, burnout: 77, atRiskSprints: 1 })];
    const summary = deriveSummary(inputs(roster, { priorMoraleById: { a: 71 } }));

    const json = JSON.stringify(summary);
    expect(json).not.toContain('63');
    expect(json).not.toContain('77');
    expect(json).not.toContain('71');

    // And no interior field ever rides along under its own name.
    const keys = new Set<string>();
    JSON.stringify(summary, (key, value) => (keys.add(key), value));
    expect(keys.has('morale')).toBe(false);
    expect(keys.has('burnout')).toBe(false);
  });
});

// ---- the fuzzy mood band reflects state qualitatively ---------------------

describe('deriveSummary — the mood read reflects state qualitatively', () => {
  it('reads a low-morale engineer in a worn-down band, not a number', () => {
    const read = onlyRead({ roster: [person({ morale: t.reads.moodBands.dipping - 1 })] });
    expect(read.mood).toBe('struggling');
    expect(read.note).toContain(moodRead('struggling'));
    expect(read.note).not.toMatch(/\d/);
  });

  it('reads a fresh, steady engineer as steady', () => {
    const read = onlyRead({ roster: [person({ morale: t.roster.startingMorale })] });
    expect(read.mood).toBe('steady');
    expect(read.note).toContain(moodRead('steady'));
  });
});

// ---- trends are first-class: direction over sprints -----------------------

describe('deriveSummary — trends read across sprints', () => {
  const p = (morale: number) => person({ id: 'e', name: 'Ada', morale });

  it('the first sprint shows state without a direction', () => {
    // Even with a 1:1 and a prior morale to compare, sprint 0 has no prior sprint to
    // have moved from — the read is honest state, no trend.
    const read = onlyRead({
      roster: [p(60)],
      sprintIndex: 0,
      oneOnOneIds: ['e'],
      priorMoraleById: { e: 70 },
    });
    expect(read.trend).toBe('unknown');
    expect(read.note).not.toMatch(/slipping/);
  });

  it('a second declining sprint reads as slipping', () => {
    const read = onlyRead({
      roster: [p(60)],
      sprintIndex: 1,
      oneOnOneIds: ['e'],
      priorMoraleById: { e: 70 },
    });
    expect(read.trend).toBe('falling');
    expect(read.note).toContain('slipping');
    expect(read.note).not.toContain('again');
  });

  it('a third declining sprint reads as slipping again — two sprints running', () => {
    const priorReads: EngineerRead[] = [
      { engineerId: 'e', note: 'Ada seems a little flat lately, and slipping.', atRisk: false, mood: 'dipping', trend: 'falling', sharpened: true },
    ];
    const read = onlyRead({
      roster: [p(50)],
      sprintIndex: 2,
      oneOnOneIds: ['e'],
      priorMoraleById: { e: 60 },
      priorReads,
    });
    expect(read.trend).toBe('falling');
    expect(read.note).toContain('slipping again');
  });
});

// ---- a 1:1 sharpens the read on its target --------------------------------

describe('deriveSummary — a 1:1 sharpens the read', () => {
  it('resolves a direction for the 1:1’d engineer that the un-attended one does not get', () => {
    const sharp = person({ id: 'seen', name: 'Seen', morale: 55 });
    const plain = person({ id: 'unseen', name: 'Unseen', morale: 55 });
    const summary = deriveSummary(
      inputs([sharp, plain], {
        sprintIndex: 1,
        oneOnOneIds: ['seen'],
        priorMoraleById: { seen: 68, unseen: 68 }, // both fell the same amount
      }),
    );
    const [seen, unseen] = summary.reads;

    // Same underlying decline, but only the checked-in engineer's trajectory is legible.
    expect(seen!.sharpened).toBe(true);
    expect(seen!.trend).toBe('falling');
    expect(seen!.note).toContain('slipping');

    expect(unseen!.sharpened).toBe(false);
    expect(unseen!.trend).toBe('unknown');
    expect(unseen!.note).not.toContain('slipping');
  });
});

// ---- the at-risk warning surfaces as human observation --------------------

describe('deriveSummary — the at-risk read is a human observation', () => {
  it('surfaces the fairness warning phrasing for an at-risk engineer', () => {
    const read = onlyRead({ roster: [person({ id: 'e', name: 'Priya', atRiskSprints: 1 })] });
    expect(read.atRisk).toBe(true);
    expect(read.note).toBe(`Priya ${atRiskWarning('e')}`);
    // The phrasing comes from the content pool, not a system string.
    expect(listAtRiskWarnings().some((w) => read.note.endsWith(w))).toBe(true);
  });

  it('adds a persistence line when the warning has held more than a sprint', () => {
    const read = onlyRead({ roster: [person({ id: 'e', name: 'Priya', atRiskSprints: 2 })] });
    expect(read.note).toContain(atRiskPersistenceRead());
  });

  it('shows the at-risk warning over the mood read even when morale looks fine', () => {
    // Morale and burnout are distinct: a high-morale engineer can still be burning out.
    // The at-risk warning must win — the fairness surface is never masked by good mood.
    const read = onlyRead({
      roster: [person({ id: 'e', name: 'Priya', morale: t.reads.moodBands.thriving + 5, atRiskSprints: 1 })],
    });
    expect(read.atRisk).toBe(true);
    expect(read.note).not.toContain(moodRead('thriving'));
    expect(read.note).toContain(atRiskWarning('e'));
  });
});
