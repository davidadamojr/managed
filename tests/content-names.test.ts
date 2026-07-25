import { describe, it, expect } from 'vitest';
import { listNames } from '../src/content/names';

// New-run construction seeds a 3–4 person roster by drawing from this pool.
// The pool must be larger than the roster so the draw has real variety, and
// every entry must carry a flavor "vibe" — the game's only prose in the MVP.

describe('name list', () => {
  const names = listNames();

  it('has more entries than the largest roster so selection has variety', () => {
    expect(names.length).toBeGreaterThanOrEqual(6);
  });

  it('gives every engineer a non-empty name and vibe', () => {
    for (const entry of names) {
      expect(entry.name.trim()).not.toBe('');
      expect(entry.vibe.trim()).not.toBe('');
    }
  });

  it('has no duplicate names', () => {
    const distinct = new Set(names.map((entry) => entry.name));
    expect(distinct.size).toBe(names.length);
  });
});
