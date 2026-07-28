import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SAVE_VERSION,
  DEFAULT_SAVE_KEY,
  createMemoryStore,
  saveRun,
  loadRun,
  hasSave,
  clearRun,
  type KeyValueStore,
} from '../src/persistence/storage';
import { newRun } from '../src/engine';

// A store whose operations throw, standing in for a browser localStorage that is out
// of quota or otherwise unavailable — the failure path save/load must survive plainly.
function throwingStore(): KeyValueStore {
  return {
    getItem: () => {
      throw new Error('storage unavailable');
    },
    setItem: () => {
      throw new Error('quota exceeded');
    },
    removeItem: () => {
      throw new Error('storage unavailable');
    },
  };
}

describe('saveRun / loadRun round trip', () => {
  it('saves a run and loads it back deeply-equal', () => {
    const store = createMemoryStore();
    const state = newRun(20260728);

    expect(saveRun(store, state)).toEqual({ ok: true });

    const loaded = loadRun(store);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.state).toEqual(state);
  });

  it('writes a versioned envelope, not the bare state', () => {
    const store = createMemoryStore();
    saveRun(store, newRun(1));
    const raw = store.getItem(DEFAULT_SAVE_KEY)!;
    const envelope = JSON.parse(raw) as { v: number; state: string };
    expect(envelope.v).toBe(SAVE_VERSION);
    expect(typeof envelope.state).toBe('string'); // the serialized state lives inside
  });

  it('saves under a caller-supplied key', () => {
    const store = createMemoryStore();
    saveRun(store, newRun(1), 'managed:slot-2');
    expect(hasSave(store, 'managed:slot-2')).toBe(true);
    expect(hasSave(store, DEFAULT_SAVE_KEY)).toBe(false);
  });
});

describe('loadRun failure and empty states', () => {
  it('reports absence plainly when there is no save — not an error', () => {
    const result = loadRun(createMemoryStore());
    expect(result).toEqual({
      ok: false,
      kind: 'absent',
      message: expect.any(String),
    });
  });

  it('reports a corrupt blob as an error with a plain message, without throwing', () => {
    const store = createMemoryStore();
    store.setItem(DEFAULT_SAVE_KEY, 'this is not json');
    const result = loadRun(store);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('error');
      expect(result.message).toEqual(expect.any(String));
    }
  });

  it('declines a save from a different format version', () => {
    const store = createMemoryStore();
    store.setItem(DEFAULT_SAVE_KEY, JSON.stringify({ v: SAVE_VERSION + 1, state: '{}' }));
    const result = loadRun(store);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('error');
  });

  it('reports an envelope missing its fields as an error', () => {
    const store = createMemoryStore();
    store.setItem(DEFAULT_SAVE_KEY, JSON.stringify({ nope: true }));
    const result = loadRun(store);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('error');
  });
});

describe('storage-failure resilience (no crash)', () => {
  it('returns a plain message when the store cannot be written', () => {
    const result = saveRun(throwingStore(), newRun(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toEqual(expect.any(String));
  });

  it('returns an error result when the store cannot be read', () => {
    const result = loadRun(throwingStore());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('error');
  });

  it('treats an unreadable store as having no save', () => {
    expect(hasSave(throwingStore())).toBe(false);
  });

  it('swallows a failing clear rather than surfacing it', () => {
    expect(() => clearRun(throwingStore())).not.toThrow();
  });
});

describe('hasSave / clearRun', () => {
  it('reflects whether a save is present and clears it', () => {
    const store = createMemoryStore();
    expect(hasSave(store)).toBe(false);

    saveRun(store, newRun(1));
    expect(hasSave(store)).toBe(true);

    clearRun(store);
    expect(hasSave(store)).toBe(false);
    expect(loadRun(store).ok).toBe(false);
  });
});

// Architecture check: the persistence layer holds no game rules. It may know the state
// *type* (`../engine/state`) but must never import an engine rule module or the engine
// barrel, which would pull simulation logic across the Layer-4 boundary.
describe('persistence layer imports no engine rules', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const persistenceDir = join(here, '..', 'src', 'persistence');
  const ALLOWED_ENGINE_IMPORTS = new Set(['../engine/state']);

  const files = readdirSync(persistenceDir).filter((f) => f.endsWith('.ts'));

  it('finds persistence source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s imports only serialization + the state type from the engine', (file) => {
    const source = readFileSync(join(persistenceDir, file), 'utf8');
    const specifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);
    const engineImports = specifiers.filter((s) => s.startsWith('../engine'));
    const disallowed = engineImports.filter((s) => !ALLOWED_ENGINE_IMPORTS.has(s));
    expect(disallowed, `${file} reaches into engine rules: ${disallowed.join(', ')}`).toEqual([]);
  });
});
