import { describe, it, expect } from 'vitest';
import {
  newRun,
  attentionCapacityFor,
  roadmapProgress,
} from '../src/engine';
import { serialize, deserialize } from '../src/persistence/serialization';
import { getTuning, listSkills, isSkill } from '../src/content';

const t = getTuning();

describe('newRun — determinism', () => {
  it('produces identical serialized state for the same seed', () => {
    expect(serialize(newRun(7))).toBe(serialize(newRun(7)));
  });

  it('produces a different run for a different seed', () => {
    expect(serialize(newRun(7))).not.toBe(serialize(newRun(8)));
  });

  it('starts an active run at sprint zero', () => {
    const state = newRun(1);
    expect(state.status).toBe('active');
    expect(state.sprintIndex).toBe(0);
  });

  it('round-trips a fresh run through serialization unchanged', () => {
    const state = newRun(99);
    expect(deserialize(serialize(state))).toEqual(state);
  });
});

describe('newRun — roster', () => {
  const state = newRun(42);

  it('fields a team of the tuned size, within the 3–4 band', () => {
    expect(state.roster).toHaveLength(t.run.teamSize);
    expect(t.run.teamSize).toBeGreaterThanOrEqual(3);
    expect(t.run.teamSize).toBeLessThanOrEqual(4);
  });

  it('gives every engineer a name, flavor, all four skills, and no assignment', () => {
    const expectedSkills = [...listSkills()].sort();
    for (const e of state.roster) {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.flavor.length).toBeGreaterThan(0);
      expect(Object.keys(e.skills).sort()).toEqual(expectedSkills);
      expect(e.assignment).toBeNull();
    }
  });

  it('starts everyone at the tuned baseline, morale and burnout as separate values', () => {
    for (const e of state.roster) {
      // Two distinct fields set from two distinct constants — not one number.
      expect(e.morale).toBe(t.roster.startingMorale);
      expect(e.burnout).toBe(t.roster.startingBurnout);
    }
  });

  it('draws distinct engineers — no name or id appears twice', () => {
    const names = state.roster.map((e) => e.name);
    const ids = state.roster.map((e) => e.id);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every skill proficiency within the 0–100 scale', () => {
    for (const e of state.roster) {
      for (const v of Object.values(e.skills)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('leaves poor-fit possible — some engineer is genuinely weak at some skill', () => {
    // "Possible, not forbidden": across many seeds the construction space produces
    // at least one low proficiency, so a poor-fit assignment can exist. Deterministic
    // over a fixed seed range, so this is stable, not flaky.
    const POOR_FIT = 25;
    let sawPoorFit = false;
    for (let seed = 1; seed <= 60 && !sawPoorFit; seed += 1) {
      for (const e of newRun(seed).roster) {
        if (Object.values(e.skills).some((v) => v < POOR_FIT)) {
          sawPoorFit = true;
          break;
        }
      }
    }
    expect(sawPoorFit).toBe(true);
  });
});

describe('newRun — backlog', () => {
  const state = newRun(42);
  const expectedSize = Math.ceil(
    t.backlog.overCapacityRatio * t.run.teamSize * t.run.sprints,
  );

  it('is sized over capacity from tuning, never balanced down to fit', () => {
    expect(state.backlog).toHaveLength(expectedSize);
    // Comfortably beyond a single sprint's plausible capacity (~one per engineer).
    expect(state.backlog.length).toBeGreaterThan(t.run.teamSize);
  });

  it('gives every ticket a valid skill, a sized effort, and a fresh open status', () => {
    for (const tk of state.backlog) {
      expect(isSkill(tk.requiredSkill)).toBe(true);
      expect(tk.size).toBeGreaterThanOrEqual(t.backlog.ticketSizeMin);
      expect(tk.size).toBeLessThanOrEqual(t.backlog.ticketSizeMax);
      expect(tk.progress).toBe(0);
      expect(tk.status).toBe('open');
    }
  });

  it('uses distinct ticket ids', () => {
    const ids = state.backlog.map((tk) => tk.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('newRun — roadmap', () => {
  const state = newRun(42);

  it('designates the tuned number of roadmap tickets', () => {
    expect(state.roadmap.ticketIds).toHaveLength(t.roadmap.size);
  });

  it('draws roadmap tickets as a distinct subset of the backlog', () => {
    const backlogIds = new Set(state.backlog.map((tk) => tk.id));
    const roadmapIds = state.roadmap.ticketIds;
    expect(new Set(roadmapIds).size).toBe(roadmapIds.length);
    for (const id of roadmapIds) expect(backlogIds.has(id)).toBe(true);
  });

  it('starts a fresh run with zero roadmap progress', () => {
    expect(roadmapProgress(state.roadmap, state.backlog)).toEqual({
      completed: 0,
      total: t.roadmap.size,
    });
  });
});

describe('newRun — run shape, attention, manager, rng', () => {
  const state = newRun(42);

  it('sets the run length from tuning, in the load-bearing 5–6 band', () => {
    expect(state.runLength).toBe(t.run.sprints);
    expect(state.runLength).toBeGreaterThanOrEqual(5);
    expect(state.runLength).toBeLessThanOrEqual(6);
  });

  it('derives attention capacity from the manager, not a literal', () => {
    expect(state.attention.capacity).toBe(attentionCapacityFor(state.manager));
    expect(state.attention.remaining).toBe(state.attention.capacity);
  });

  it('seeds an inert manager container', () => {
    expect(state.manager).toEqual({ reputation: 0, burnout: 0 });
  });

  it('advances the RNG to a well-defined position, keeping the seed as identity', () => {
    expect(state.rngState.seed).toBe(state.seed);
    expect(state.rngState.cursor).toBeGreaterThan(0);
  });
});
