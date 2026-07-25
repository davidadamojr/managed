/**
 * Pure (de)serialization of a run to and from a JSON string. This is the whole of
 * save/load's data path: because `GameState` is plain data end to end — objects,
 * arrays, numbers, strings, booleans, null, and nothing else — a round trip loses
 * nothing, including the RNG cursor, so a resumed run replays exactly.
 *
 * No storage and no rules live here. Where the string is kept, and any deep
 * validation of untrusted saves, are separate concerns handled elsewhere.
 */

import type { GameState } from '../engine/state';

/** Serialize a run to a JSON string. */
export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Parse a run back from a JSON string. Guards only that the payload is a JSON
 * object — enough to fail loudly on obviously wrong input rather than hand back
 * something that isn't a state; structural validation of the fields is a later
 * concern.
 */
export function deserialize(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('deserialize expected a JSON object for GameState');
  }
  return parsed as GameState;
}
