import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  attentionSpent,
  newRun,
  tick,
  validateActions,
  type GameState,
} from '../src/engine';
import {
  serialize,
  deserialize,
  saveRun,
  loadRun,
  createMemoryStore,
} from '../src/persistence';
import {
  materializePlan,
  playFrom,
  playRun,
  runArb,
  seedArb,
} from './support/arbitraries';

// Two guarantees hold up everything else in this project, and both are the kind that
// example tests can only sample: determinism (identical state and actions always produce
// an identical result) and save exactness (a resumed run is the run it was). The tuning
// harness's numbers mean nothing if a run is not reproducible, and a player who loses a
// save's worth of progress to a lossy round trip has lost the run.
//
// So they are stated here as properties over generated runs rather than as a handful of
// worked examples. Each generated case is a whole seeded run played through legal plans;
// the generators are in ./support/arbitraries.
//
// The single most important property is determinism. A failure there is not a bug in a
// feature — it means the harness has been measuring noise and every save is suspect.

/**
 * The property runner is seeded with a literal, not left to pick its own seed from the
 * clock. A suite that guards reproducibility should itself be reproducible: a failure
 * must be re-runnable exactly, and a green run must not be an accident of the day it
 * ran. Coverage comes from the case count instead — the same trade the engine makes.
 */
const PROPERTY_SEED = 20260730;
const RUNS = 100;
/** The keystone property gets a deeper sweep; it is the one whose failure invalidates
 *  the harness, every save, and every bug report reproduced from a seed. */
const KEYSTONE_RUNS = 400;

/** Run a property with the suite's fixed seed and case count. */
function check<T extends unknown[]>(property: fc.IProperty<T>, numRuns = RUNS): void {
  fc.assert(property, { seed: PROPERTY_SEED, numRuns });
}

describe('determinism: the same inputs always produce the same run', () => {
  it('builds an identical board from an identical seed', () => {
    check(
      fc.property(seedArb, (seed) => {
        expect(serialize(newRun(seed))).toBe(serialize(newRun(seed)));
      }),
    );
  });

  it('replays a whole run byte-for-byte from seed and plans alone', () => {
    check(
      fc.property(runArb, ({ seed, recipes }) => {
        const first = playRun(seed, recipes);
        const second = playRun(seed, recipes);

        // Vacuity guard: a property over runs that never resolved a sprint proves nothing.
        expect(first.summaries.length).toBeGreaterThan(0);

        expect(first.states.map(serialize)).toEqual(second.states.map(serialize));
        expect(JSON.stringify(first.summaries)).toBe(JSON.stringify(second.summaries));
      }),
      KEYSTONE_RUNS,
    );
  });

  it('advances the RNG only through the state it carries', () => {
    check(
      fc.property(runArb, ({ seed, recipes }) => {
        const played = playRun(seed, recipes);
        // Every sprint continues the one stream: the cursor only ever moves forward, and
        // the seed identifying the run never changes under it.
        played.states.forEach((state, index) => {
          expect(state.rngState.seed).toBe(played.states[0]!.rngState.seed);
          if (index > 0) {
            expect(state.rngState.cursor).toBeGreaterThanOrEqual(
              played.states[index - 1]!.rngState.cursor,
            );
          }
        });
      }),
    );
  });

  it('reproduces a sprint exactly when the same state is ticked twice', () => {
    check(
      fc.property(runArb, fc.nat(), ({ seed, recipes }, cut) => {
        const { states } = playRun(seed, recipes);
        const state = states[cut % states.length]!;
        if (state.status !== 'active') return;
        const plan = materializePlan(state, recipes[0]!);
        expect(JSON.stringify(tick(state, plan))).toBe(JSON.stringify(tick(state, plan)));
      }),
    );
  });
});

// A property is only as good as the space it draws from. These two check the generator
// itself: that what it produces is the legal plan space rather than garbage the engine
// would never see, and that the space it reaches includes the run endings that carry the
// most state — a loss, with its departure trace, is the case a round trip can most
// plausibly lose.
describe('the generated space is the real one', () => {
  it('only ever produces plans the game would accept', () => {
    check(
      fc.property(runArb, ({ seed, recipes }) => {
        let state = newRun(seed);
        for (const recipe of recipes) {
          if (state.status !== 'active') break;
          const plan = materializePlan(state, recipe);
          expect(validateActions(state, plan).problems).toEqual([]);
          // Attention is a hard cap, unlike assignment; a generated plan must respect it.
          expect(attentionSpent(plan)).toBeLessThanOrEqual(state.attention.capacity);
          state = tick(state, plan).state;
        }
      }),
    );
  });

  it('reaches both endings, and the states a loss leaves behind', () => {
    const played = fc
      .sample(runArb, { numRuns: RUNS, seed: PROPERTY_SEED })
      .map(({ seed, recipes }) => playRun(seed, recipes));
    const endings = played.map((run) => run.states.at(-1)!.status);

    expect(endings).toContain('completed');
    expect(endings).toContain('failed');
    // The heaviest state a save has to carry: a run that ended in attrition, whose final
    // state holds a departure trace and a full history of reads.
    expect(
      played.some((run) => run.states.at(-1)!.departure !== undefined),
      'no generated run ended in attrition — the loss path is untested',
    ).toBe(true);
  });
});

describe('purity: a tick reads its input and writes nothing to it', () => {
  it('leaves the state and the plan it was handed untouched', () => {
    check(
      fc.property(runArb, fc.nat(), ({ seed, recipes }, cut) => {
        const { states } = playRun(seed, recipes);
        const state = states[cut % states.length]!;
        if (state.status !== 'active') return;
        const plan = materializePlan(state, recipes[0]!);

        const stateBefore = structuredClone(state);
        const planBefore = structuredClone(plan);
        const result = tick(state, plan);

        expect(state).toEqual(stateBefore);
        expect(plan).toEqual(planBefore);
        // A new state, not the old one edited — the caller's reference stays valid.
        expect(result.state).not.toBe(state);
      }),
    );
  });
});

describe('save: a resumed run is the run it was', () => {
  it('round-trips any reachable state, RNG cursor included', () => {
    check(
      fc.property(runArb, fc.nat(), ({ seed, recipes }, cut) => {
        const { states } = playRun(seed, recipes);
        const state = states[cut % states.length]!;

        const revived = deserialize(serialize(state));
        expect(revived).toEqual(state);
        expect(revived.rngState).toEqual(state.rngState);
      }),
    );
  });

  it('serializes stably, so a re-saved run is the same bytes', () => {
    check(
      fc.property(runArb, fc.nat(), ({ seed, recipes }, cut) => {
        const { states } = playRun(seed, recipes);
        const state = states[cut % states.length]!;
        const saved = serialize(state);
        // Object key order survives the trip. If any state object were ever keyed by
        // something integer-like, a round trip would silently reorder it and two saves
        // of the same run would differ.
        expect(serialize(deserialize(saved))).toBe(saved);
      }),
    );
  });

  it('carries no key that JSON would reorder', () => {
    check(
      fc.property(runArb, ({ seed, recipes }) => {
        for (const state of playRun(seed, recipes).states) {
          expect(integerLikeKeys(state)).toEqual([]);
        }
      }),
    );
  });

  it('holds nothing JSON cannot express — no Map, Set, class, or hole', () => {
    check(
      fc.property(runArb, ({ seed, recipes }) => {
        for (const state of playRun(seed, recipes).states) {
          expect(nonJsonValues(state)).toEqual([]);
        }
      }),
    );
  });

  it('finishes a run identically whether or not it was saved and resumed mid-run', () => {
    check(
      fc.property(runArb, fc.nat(), ({ seed, recipes }, rawCut) => {
        const uninterrupted = playRun(seed, recipes);
        const ticksPlayed = uninterrupted.states.length - 1;
        const cut = rawCut % (ticksPlayed + 1);

        // Put the run down mid-flight, through the real save path, and pick it up again.
        const store = createMemoryStore();
        expect(saveRun(store, uninterrupted.states[cut]!).ok).toBe(true);
        const loaded = loadRun(store);
        if (!loaded.ok) throw new Error(`resume failed: ${loaded.message}`);

        const resumed = playFrom(loaded.state, recipes.slice(cut));

        expect(serialize(resumed.states.at(-1)!)).toBe(
          serialize(uninterrupted.states.at(-1)!),
        );
        expect(JSON.stringify(resumed.summaries)).toBe(
          JSON.stringify(uninterrupted.summaries.slice(cut)),
        );
      }),
    );
  });
});

/**
 * Keys an array index could be confused with. JavaScript hoists these to the front of an
 * object in ascending numeric order regardless of insertion, so one of them anywhere in
 * the state would make serialization order depend on the values in it.
 */
function integerLikeKeys(value: unknown, path = 'state'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => integerLikeKeys(item, `${path}[${i}]`));
  }
  if (!isPlainObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const here = `${path}.${key}`;
    // Only a canonical array index is hoisted — a non-negative integer written plainly.
    const offending = /^(0|[1-9]\d*)$/.test(key) ? [here] : [];
    return [...offending, ...integerLikeKeys(child, here)];
  });
}

/**
 * Everything reachable in the state that JSON would lose or change: a Map or Set (which
 * becomes `{}`), a class instance or function, `undefined` (dropped from an object,
 * turned to null in an array), or a non-finite number (turned to null). Persisted state is
 * contracted to be plain objects and arrays only; this reads that contract back off a
 * real run rather than trusting the types, which cannot see what a round trip drops.
 */
function nonJsonValues(value: unknown, path = 'state'): string[] {
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => nonJsonValues(item, `${path}[${i}]`));
  }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return [];
    case 'number':
      return Number.isFinite(value) ? [] : [`${path}: non-finite number (${value})`];
    case 'object':
      return isPlainObject(value)
        ? Object.entries(value).flatMap(([key, child]) =>
            nonJsonValues(child, `${path}.${key}`),
          )
        : [`${path}: ${constructorName(value)} is not plain data`];
    default:
      return [`${path}: ${typeof value} is not plain data`];
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function constructorName(value: object): string {
  return Object.getPrototypeOf(value)?.constructor?.name ?? 'exotic object';
}

// The properties above are only worth their runtime if they would actually fail. These
// hand the same checks a state that has been broken on purpose, one failure mode each.
describe('the properties would catch a break', () => {
  const sample = (): GameState => newRun(1234);

  it('detects a Map smuggled into the state', () => {
    const broken = { ...sample(), roadmap: new Map([['a', 1]]) };
    expect(nonJsonValues(broken)).toEqual([expect.stringContaining('Map')]);
  });

  it('detects a key JSON would reorder', () => {
    const state = sample();
    const broken = { ...state, roster: [{ ...state.roster[0]!, skills: { 0: 5 } }] };
    expect(integerLikeKeys(broken)).toEqual(['state.roster[0].skills.0']);
  });

  it('detects a resume that dropped the RNG cursor', () => {
    const state = sample();
    const plan = materializePlan(state, {
      ticketPicks: [0, 1, 2, 3],
      crunch: false,
      attentionPicks: [],
    });
    const rewound = { ...state, rngState: { ...state.rngState, cursor: 0 } };
    // The cursor is the whole of what a resume has to carry. Restore a save without it
    // and the very next sprint diverges — which is exactly what the resume property
    // above asserts can never happen.
    expect(serialize(tick(rewound, plan).state)).not.toBe(
      serialize(tick(state, plan).state),
    );
  });
});
