import { describe, it, expect } from 'vitest';
import {
  shouldFireEvent,
  pickWeightedEvent,
  fireEvent,
  createRng,
  type Engineer,
  type EventFiring,
} from '../src/engine';
import { getTuning, listEvents } from '../src/content';
import type { RngState } from '../src/engine';

// Event firing is the one randomized step in a sprint. These tests fix its three
// deterministic pieces — the chance gate, the weighted pick, and the effect
// application — and the invariants the tick relies on: at most one event, chosen
// seeded, its effects landing on the whole team or a single engineer, always in range.

const t = getTuning();
const CHANCE = t.events.perSprintChance;
const EVENT_IDS = new Set(listEvents().map((e) => e.id));

function engineer(id: string, morale = 60, burnout = 20): Engineer {
  const skills = { frontend: 50, backend: 50, infra: 50, debugging: 50 } as const;
  return { id, name: id, flavor: 'vibe', skills: { ...skills }, morale, burnout, assignment: null };
}

const ROSTER: readonly Engineer[] = [engineer('a'), engineer('b'), engineer('c'), engineer('d')];

/** A raw RNG state at a chosen cursor for the given seed (seeds here are small uints). */
function at(seed: number, cursor: number): RngState {
  return { seed: createRng(seed).seed, cursor };
}

/** Scan cursors for the first state whose fired event satisfies `want`. */
function findFiring(seed: number, want: (f: EventFiring) => boolean): RngState {
  for (let cursor = 0; cursor < 50_000; cursor += 1) {
    const state = at(seed, cursor);
    const fired = fireEvent(ROSTER, state);
    if (fired.report && want(fired)) return state;
  }
  throw new Error('no firing state found');
}

/** Scan cursors for the first state that stays quiet (no event fires). */
function findQuiet(seed: number): RngState {
  for (let cursor = 0; cursor < 50_000; cursor += 1) {
    const state = at(seed, cursor);
    if (fireEvent(ROSTER, state).report === null) return state;
  }
  throw new Error('no quiet state found');
}

describe('shouldFireEvent — the chance gate', () => {
  it('fires below the per-sprint chance and stays quiet at or above it', () => {
    expect(shouldFireEvent(0)).toBe(true);
    expect(shouldFireEvent(CHANCE - 0.001)).toBe(true);
    expect(shouldFireEvent(CHANCE)).toBe(false);
    expect(shouldFireEvent(0.999)).toBe(false);
  });
});

describe('pickWeightedEvent — seeded weighted selection', () => {
  const events = listEvents();

  it('maps p=0 to the first event and the top of the range to the last', () => {
    expect(pickWeightedEvent(events, 0).id).toBe(events[0]!.id);
    expect(pickWeightedEvent(events, 0.999999).id).toBe(events[events.length - 1]!.id);
  });

  it('is a pure function of p — the same p always selects the same event', () => {
    for (const p of [0, 0.1, 0.37, 0.5, 0.8, 0.95]) {
      expect(pickWeightedEvent(events, p).id).toBe(pickWeightedEvent(events, p).id);
    }
  });

  it('gives a heavier-weighted event a wider slice of the range', () => {
    // green-ci (weight 3) should claim more of [0,1) than either weight-2 event.
    const samples = 1000;
    const counts = new Map<string, number>();
    for (let i = 0; i < samples; i += 1) {
      const id = pickWeightedEvent(events, i / samples).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect(counts.get('green-ci')!).toBeGreaterThan(counts.get('demo-scramble')!);
  });
});

describe('fireEvent — at most one event, seeded and in range', () => {
  it('a quiet gate leaves the roster untouched and advances the RNG by one draw', () => {
    const state = findQuiet(1);
    const fired = fireEvent(ROSTER, state);
    expect(fired.report).toBeNull();
    expect(fired.roster).toBe(ROSTER); // identity: nothing moved
    expect(fired.rng.cursor).toBe(state.cursor + 1);
  });

  it('a firing gate reports exactly one event, drawn from the content set', () => {
    const state = findFiring(1, () => true);
    const fired = fireEvent(ROSTER, state);
    expect(fired.report).not.toBeNull();
    expect(EVENT_IDS.has(fired.report!.id)).toBe(true);
  });

  it('is fully deterministic — same roster and RNG state reproduce the result', () => {
    const state = findFiring(7, () => true);
    expect(fireEvent(ROSTER, state)).toEqual(fireEvent(ROSTER, state));
  });

  it('applies a whole-team event to every engineer', () => {
    const state = findFiring(1, (f) => f.report!.id === 'green-ci'); // whole-team morale
    const fired = fireEvent(ROSTER, state);
    expect(fired.report!.affectedEngineerIds).toEqual(ROSTER.map((e) => e.id));
    for (const e of fired.roster) expect(e.morale).toBeGreaterThan(60); // lifted from 60
  });

  it('applies a one-engineer event to exactly one engineer', () => {
    const state = findFiring(1, (f) => f.report!.id === 'all-hands-shoutout'); // one-engineer
    const fired = fireEvent(ROSTER, state);
    expect(fired.report!.affectedEngineerIds).toHaveLength(1);
    const movedId = fired.report!.affectedEngineerIds[0];
    const moved = fired.roster.filter((e) => e.morale !== 60);
    expect(moved.map((e) => e.id)).toEqual([movedId]);
  });

  it('keeps every attribute in range when applying effects', () => {
    // A whole-team morale bump on an already-high team must clamp, never overflow.
    const high = ROSTER.map((e) => ({ ...e, morale: 99 }));
    const state = findFiring(1, (f) => f.report!.id === 'green-ci');
    for (const e of fireEvent(high, state).roster) {
      expect(e.morale).toBeLessThanOrEqual(100);
      expect(e.morale).toBeGreaterThanOrEqual(0);
    }
  });
});
