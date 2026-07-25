import { describe, it, expect } from 'vitest';
import { listEvents } from '../src/content/events';

// Events are declarative data: an id, a description, a selection rule, and a
// list of effect descriptors the engine interprets. Nothing here is behavior —
// no functions reaching into engine internals. This test pins that shape and
// keeps the seed set tiny (the library only grows much later).

const VALID_TARGETS = new Set(['one-engineer', 'whole-team']);
const VALID_ATTRIBUTES = new Set(['morale', 'burnout']);

describe('event set', () => {
  const events = listEvents();

  it('is a tiny seed set, not a grown library', () => {
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.length).toBeLessThanOrEqual(5);
  });

  it('gives every event a unique id and a non-empty description', () => {
    const ids = events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const event of events) {
      expect(event.id.trim()).not.toBe('');
      expect(event.description.trim()).not.toBe('');
    }
  });

  it('gives every event a positive selection weight', () => {
    for (const event of events) {
      expect(event.trigger.weight).toBeGreaterThan(0);
    }
  });

  it('declares at least one well-formed effect per event', () => {
    for (const event of events) {
      expect(event.effects.length).toBeGreaterThan(0);
      for (const effect of event.effects) {
        expect(VALID_TARGETS.has(effect.target)).toBe(true);
        expect(VALID_ATTRIBUTES.has(effect.attribute)).toBe(true);
        expect(Number.isFinite(effect.delta)).toBe(true);
        // A zero-delta effect is dead data — every effect must move something.
        expect(effect.delta).not.toBe(0);
      }
    }
  });
});
