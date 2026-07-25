import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from '../src/persistence/serialization';
import { createRng, nextUint32, type GameState } from '../src/engine';

// Advance the stream a few draws so the persisted cursor is non-zero — a save made
// mid-run must resume from where it left off, not from the seed.
function advancedRng(seed: number, draws: number) {
  let state = createRng(seed);
  for (let i = 0; i < draws; i += 1) state = nextUint32(state).next;
  return state;
}

// A hand-built, fully-populated run: every optional present (engineer flags, run
// history, a fired event) so the round trip is exercised across the whole shape.
function fullyPopulatedState(): GameState {
  return {
    seed: 12345,
    rngState: advancedRng(12345, 3),
    sprintIndex: 2,
    runLength: 6,
    roster: [
      {
        id: 'e1',
        name: 'Priya Nair',
        flavor: 'Ships quietly.',
        skills: { frontend: 70, backend: 40, infra: 20, debugging: 55 },
        morale: 60,
        burnout: 30,
        assignment: { ticketIds: ['t1'], crunch: false },
      },
      {
        id: 'e2',
        name: 'Kelvin Osei',
        flavor: 'Great in a crunch, which is the problem.',
        skills: { frontend: 30, backend: 65, infra: 50, debugging: 45 },
        morale: 35,
        burnout: 78,
        assignment: { ticketIds: ['t2', 't3'], crunch: true },
        flags: { atRiskSprints: 1 },
      },
    ],
    backlog: [
      { id: 't1', size: 3, requiredSkill: 'frontend', progress: 3, status: 'done' },
      { id: 't2', size: 5, requiredSkill: 'backend', progress: 2, status: 'in-progress' },
      { id: 't3', size: 2, requiredSkill: 'infra', progress: 0, status: 'open' },
    ],
    roadmap: { ticketIds: ['t1', 't2'] },
    attention: { capacity: 3, remaining: 1 },
    manager: { reputation: 0, burnout: 0 },
    status: 'active',
    history: [
      {
        sprintIndex: 1,
        shipped: ['t1'],
        roadmap: { completed: 1, total: 2 },
        reads: [
          { engineerId: 'e1', note: 'steady as ever', atRisk: false },
          { engineerId: 'e2', note: 'looking worn down lately', atRisk: true },
        ],
        event: {
          id: 'demo-scramble',
          description: 'A last-minute demo request lands at 4pm.',
          affectedEngineerIds: ['e2'],
        },
      },
    ],
  };
}

// Walk the object graph and fail on anything that is not plain, JSON-safe data:
// functions, class instances, Map/Set, undefined. This is what guarantees the
// state can serialize losslessly and port to another language.
function assertPlainData(value: unknown, path = '$'): void {
  if (value === null) return;
  const t = typeof value;
  if (t === 'number' || t === 'string' || t === 'boolean') return;
  if (t === 'function' || t === 'undefined' || t === 'bigint' || t === 'symbol') {
    throw new Error(`non-plain value (${t}) at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertPlainData(v, `${path}[${i}]`));
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(`non-plain object (class/Map/Set) at ${path}`);
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    assertPlainData(v, `${path}.${k}`);
  }
}

describe('serialize / deserialize', () => {
  it('round-trips a fully-populated state to a deeply-equal value', () => {
    const state = fullyPopulatedState();
    const revived = deserialize(serialize(state));
    expect(revived).toEqual(state);
  });

  it('round-trips the RNG cursor so the revived stream matches exactly', () => {
    const state = fullyPopulatedState();
    const revived = deserialize(serialize(state));

    // The RNG state itself must survive intact...
    expect(revived.rngState).toEqual(state.rngState);

    // ...and continuing the stream from each must produce the same draws.
    const fromOriginal: number[] = [];
    const fromRevived: number[] = [];
    let a = state.rngState;
    let b = revived.rngState;
    for (let i = 0; i < 5; i += 1) {
      fromOriginal.push(nextUint32(a).value);
      fromRevived.push(nextUint32(b).value);
      a = nextUint32(a).next;
      b = nextUint32(b).next;
    }
    expect(fromRevived).toEqual(fromOriginal);
  });

  it('carries only plain, JSON-safe data — no functions or class instances', () => {
    const state = fullyPopulatedState();
    expect(() => assertPlainData(state)).not.toThrow();
    expect(() => assertPlainData(deserialize(serialize(state)))).not.toThrow();
  });

  it('is idempotent — re-serializing the revived state yields the same string', () => {
    const first = serialize(fullyPopulatedState());
    expect(serialize(deserialize(first))).toBe(first);
  });

  it('rejects a payload that is not a JSON object', () => {
    expect(() => deserialize('42')).toThrow(TypeError);
    expect(() => deserialize('"nope"')).toThrow(TypeError);
    expect(() => deserialize('[1,2,3]')).toThrow(TypeError);
    expect(() => deserialize('null')).toThrow(TypeError);
  });
});
