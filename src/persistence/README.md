# Layer 4 — Persistence

Save and resume a run over a key-value store. This layer sits on top of the pure
`serialize` / `deserialize` codec and holds no game rules.

- **`serialization.ts`** — the pure state ⇄ JSON-string codec. Because `GameState` is
  plain data end to end, a round trip is lossless, including the RNG cursor.
- **`storage.ts`** — `saveRun` / `loadRun` / `hasSave` / `clearRun` over an injected
  `KeyValueStore`. Wraps the serialized state in a small versioned envelope and turns
  every storage failure (full quota, corrupt or wrong-version blob, unreadable store)
  into a plain result rather than a thrown crash.

The store is **injected, not reached for**. `KeyValueStore` is the slice of the Web
Storage API a run needs; the browser's `localStorage` satisfies it directly (the view
supplies it at its edge), and `createMemoryStore()` satisfies it for headless play and
tests. That keeps this layer exercisable with no DOM, so the engine's no-DOM wall and
the pure test suite both hold.

The version marker guards this save format only — a save from another version is
declined, never migrated. Runs are disposable; there is no cross-version save promise.

File export is deferred.
