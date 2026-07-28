/**
 * Layer 4 — the run's save/load, over a key-value store.
 *
 * This is the only layer that knows a run can be persisted at all. It does two small
 * jobs on top of the pure `serialize`/`deserialize` codec: it wraps the serialized
 * state in a thin envelope that carries a format version, and it turns the ways
 * storage can go wrong — a full quota, a corrupt blob, a save from another version —
 * into plain results a caller can show, never a thrown crash. Because a resumed run
 * replays bit-for-bit from its restored RNG cursor, load is genuinely lossless: the
 * continuation is indistinguishable from an uninterrupted play.
 *
 * The store is injected, not reached for. `KeyValueStore` is the shape of the slice of
 * the Web Storage API a run needs, which the browser's `localStorage` satisfies as-is
 * and which a plain in-memory map satisfies for headless play and tests. Keeping the
 * store a parameter is what lets this layer be exercised with no DOM while the engine's
 * no-DOM wall stays intact — the view supplies the real `localStorage` at its edge.
 *
 * The version marker guards this save format only; it is deliberately not a promise of
 * cross-version migration. Runs are disposable — a save written by a different version
 * is declined with a plain message rather than migrated.
 */

import type { GameState } from '../engine/state';
import { serialize, deserialize } from './serialization';

/** The current save-format version. A stored save from any other version is declined. */
export const SAVE_VERSION = 1;

/** The default localStorage key a run is saved under. */
export const DEFAULT_SAVE_KEY = 'managed:run';

/**
 * The slice of the Web Storage API persistence depends on. `localStorage` satisfies it
 * structurally, so the view passes it in directly; tests and headless play pass
 * `createMemoryStore()`. Nothing here assumes a browser.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The result of a save: ok, or a plain message explaining why it could not be written. */
export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/**
 * The result of a load. `absent` is the ordinary "no save yet" case — an empty state,
 * not an error — so a caller can offer a fresh run without alarm. `error` is a genuine
 * failure (unreadable storage, a corrupt or wrong-version blob); it carries a plain,
 * dismissible message and never a thrown exception.
 */
export type LoadResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly kind: 'absent'; readonly message: string }
  | { readonly ok: false; readonly kind: 'error'; readonly message: string };

/** The persisted envelope: a format version around the serialized state string. */
interface SaveEnvelope {
  readonly v: number;
  readonly state: string;
}

function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.v === 'number' && typeof record.state === 'string';
}

/**
 * A `KeyValueStore` backed by an in-memory map — the headless analog of `localStorage`.
 * It is what makes save/resume testable in Node and drivable by the harness, and it is
 * the store a run uses whenever there is no browser to persist to.
 */
export function createMemoryStore(): KeyValueStore {
  const cells = new Map<string, string>();
  return {
    getItem: (key) => cells.get(key) ?? null,
    setItem: (key, value) => {
      cells.set(key, value);
    },
    removeItem: (key) => {
      cells.delete(key);
    },
  };
}

/**
 * Serialize the run and write it to the store under `key`. Any storage failure — a
 * quota overflow being the realistic one — is caught and returned as a plain message
 * rather than thrown, so a save that cannot be written never takes the run down with
 * it; the game keeps playing from memory.
 */
export function saveRun(
  store: KeyValueStore,
  state: GameState,
  key: string = DEFAULT_SAVE_KEY,
): SaveResult {
  try {
    const envelope: SaveEnvelope = { v: SAVE_VERSION, state: serialize(state) };
    store.setItem(key, JSON.stringify(envelope));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'Could not save this run — the game will keep going, but progress may not persist.',
    };
  }
}

/**
 * Read and revive the run saved under `key`. Distinguishes three outcomes: a restored
 * state, the ordinary absence of any save, and a genuine failure (unreadable storage or
 * a corrupt / wrong-version blob). No path throws — every failure returns a plain,
 * dismissible message.
 */
export function loadRun(
  store: KeyValueStore,
  key: string = DEFAULT_SAVE_KEY,
): LoadResult {
  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return {
      ok: false,
      kind: 'error',
      message: 'Could not read the saved run.',
    };
  }

  if (raw === null) {
    return { ok: false, kind: 'absent', message: 'No saved run to resume.' };
  }

  try {
    const envelope: unknown = JSON.parse(raw);
    if (!isSaveEnvelope(envelope)) {
      throw new TypeError('save is not in the expected format');
    }
    if (envelope.v !== SAVE_VERSION) {
      return {
        ok: false,
        kind: 'error',
        message: "This saved run is from a different version and can't be resumed.",
      };
    }
    return { ok: true, state: deserialize(envelope.state) };
  } catch {
    return {
      ok: false,
      kind: 'error',
      message: "This saved run is corrupted and can't be resumed.",
    };
  }
}

/**
 * Whether a save exists under `key` — enough for a caller to choose between offering
 * "resume" and "new run" without paying to deserialize. An unreadable store reads as no
 * save, since a run that cannot be read cannot be resumed either.
 */
export function hasSave(store: KeyValueStore, key: string = DEFAULT_SAVE_KEY): boolean {
  try {
    return store.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Remove the save under `key` — used when starting a fresh run over an old one. A
 * best-effort clear: a store that refuses to remove cannot fail the run, so any error
 * is swallowed.
 */
export function clearRun(store: KeyValueStore, key: string = DEFAULT_SAVE_KEY): void {
  try {
    store.removeItem(key);
  } catch {
    // Clearing a stale save is best-effort; its failure must not surface to the player.
  }
}
