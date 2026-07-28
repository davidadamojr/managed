/**
 * Layer 4 — persistence barrel. The single import surface for save/load: the pure
 * (de)serialization codec plus the store-backed run save/resume built on top of it.
 * Downstream layers import from here so internal file layout can change without
 * churning call sites.
 */

export { serialize, deserialize } from './serialization';

export {
  SAVE_VERSION,
  DEFAULT_SAVE_KEY,
  createMemoryStore,
  saveRun,
  loadRun,
  hasSave,
  clearRun,
  type KeyValueStore,
  type SaveResult,
  type LoadResult,
} from './storage';
