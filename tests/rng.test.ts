import { describe, it, expect } from 'vitest';
import {
  createRng,
  nextUint32,
  nextFloat,
  nextInt,
  type RngState,
} from '../src/engine/rng';

const SEED = 12345;

// Locked reference stream. These are the first eight uint32 draws for seed 12345
// and are bit-identical to reference mulberry32(12345). If a change to the RNG
// alters these, that is a determinism-breaking change and must fail loudly.
const EXPECTED_UINT32: readonly number[] = [
  4207900869, 1317490944, 2079646450, 3513001552, 2187978186, 1492380277,
  316786230, 3291647763,
];

function drawUint32Sequence(seed: number, count: number): number[] {
  let state = createRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const { value, next } = nextUint32(state);
    out.push(value);
    state = next;
  }
  return out;
}

describe('createRng', () => {
  it('starts at cursor 0 and coerces the seed to a uint32', () => {
    expect(createRng(12345)).toEqual({ seed: 12345, cursor: 0 });
    // Negative / oversized seeds normalize into uint32 space.
    expect(createRng(-1)).toEqual({ seed: 0xffffffff, cursor: 0 });
  });
});

describe('determinism', () => {
  it('same state in yields identical value and next state out', () => {
    const state = createRng(SEED);
    const a = nextUint32(state);
    const b = nextUint32(state);
    expect(a.value).toBe(b.value);
    expect(a.next).toEqual(b.next);
  });

  it('a fixed seed produces a fixed, asserted first-N sequence', () => {
    expect(drawUint32Sequence(SEED, EXPECTED_UINT32.length)).toEqual([
      ...EXPECTED_UINT32,
    ]);
  });

  it('reproduces the same sequence on a fresh run with the same seed', () => {
    expect(drawUint32Sequence(SEED, 16)).toEqual(drawUint32Sequence(SEED, 16));
  });

  it('different seeds produce different streams', () => {
    expect(drawUint32Sequence(1, 8)).not.toEqual(drawUint32Sequence(2, 8));
  });
});

describe('purity', () => {
  it('does not mutate the input state', () => {
    const state = createRng(SEED);
    const snapshot: RngState = { seed: state.seed, cursor: state.cursor };
    nextUint32(state);
    expect(state).toEqual(snapshot);
  });

  it('returns a new state object advanced by exactly one position', () => {
    const state = createRng(SEED);
    const { next } = nextUint32(state);
    expect(next).not.toBe(state);
    expect(next.seed).toBe(state.seed);
    expect(next.cursor).toBe(state.cursor + 1);
  });
});

describe('nextFloat', () => {
  it('stays within [0, 1)', () => {
    let state = createRng(SEED);
    for (let i = 0; i < 1000; i += 1) {
      const { value, next } = nextFloat(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      state = next;
    }
  });

  it('is deterministic', () => {
    expect(nextFloat(createRng(SEED)).value).toBe(
      nextFloat(createRng(SEED)).value,
    );
  });
});

describe('nextInt', () => {
  it('stays within [min, max) across many draws', () => {
    let state = createRng(SEED);
    for (let i = 0; i < 1000; i += 1) {
      const { value, next } = nextInt(state, 3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThan(9);
      expect(Number.isInteger(value)).toBe(true);
      state = next;
    }
  });

  it('can produce both endpoints of the range', () => {
    // Over enough draws a d6 hits both 0 and 5; guards against off-by-one bounds.
    let state = createRng(999);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i += 1) {
      const { value, next } = nextInt(state, 0, 6);
      seen.add(value);
      state = next;
    }
    expect(seen.has(0)).toBe(true);
    expect(seen.has(5)).toBe(true);
    expect(seen.has(6)).toBe(false);
  });

  it('throws when the range is empty or inverted', () => {
    const state = createRng(SEED);
    expect(() => nextInt(state, 5, 5)).toThrow(RangeError);
    expect(() => nextInt(state, 9, 3)).toThrow(RangeError);
  });

  it('is deterministic', () => {
    expect(nextInt(createRng(SEED), 0, 100).value).toBe(
      nextInt(createRng(SEED), 0, 100).value,
    );
  });
});

describe('serialization', () => {
  it('round-trips through JSON and resumes an identical stream', () => {
    // Advance a few draws, serialize the mid-stream state, then confirm the
    // deserialized state resumes the exact same continuation.
    let live = createRng(SEED);
    for (let i = 0; i < 3; i += 1) {
      live = nextUint32(live).next;
    }

    const revived: RngState = JSON.parse(JSON.stringify(live));
    expect(revived).toEqual(live);

    const fromLive: number[] = [];
    const fromRevived: number[] = [];
    let a = live;
    let b = revived;
    for (let i = 0; i < 5; i += 1) {
      fromLive.push(nextUint32(a).value);
      fromRevived.push(nextUint32(b).value);
      a = nextUint32(a).next;
      b = nextUint32(b).next;
    }
    expect(fromRevived).toEqual(fromLive);
  });

  it('a serialized cursor points at the same place as an uninterrupted draw', () => {
    // Drawing 6 straight equals drawing 3, serializing, then drawing 3 more.
    const straight = drawUint32Sequence(SEED, 6);

    let state = createRng(SEED);
    const split: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const { value, next } = nextUint32(state);
      split.push(value);
      state = next;
    }
    let resumed: RngState = JSON.parse(JSON.stringify(state));
    for (let i = 0; i < 3; i += 1) {
      const { value, next } = nextUint32(resumed);
      split.push(value);
      resumed = next;
    }
    expect(split).toEqual(straight);
  });
});
