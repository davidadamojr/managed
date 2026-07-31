# Layer 2 — Content / Data

Data files only: skills, name lists, events, tuning constants. **No logic.** The
engine (Layer 1) consumes this data; this layer never imports the engine. Both
rules are enforced by `tests/content-purity.test.ts`.

Everything is authored as typed TS-as-data (plain exported objects/arrays) rather
than JSON, so the skill union derives from its data and every value is type-checked
at the point of use.

| File         | What lives here                                                              |
| ------------ | --------------------------------------------------------------------------- |
| `skills.ts`  | The four canonical skills; the `Skill` union is derived from the data.       |
| `names.ts`   | Engineer name pool + per-engineer `vibe` flavor string.                     |
| `events.ts`  | Tiny seed event set: id, description, selection weight, declarative effects. |
| `reads.ts`   | Fuzzy people-read phrasings: mood bands, trend clauses, at-risk warnings.    |
| `copy.ts`    | Player-facing chrome copy: the framing line, panel labels, control words.    |
| `tuning.ts`  | The single source of every game parameter. Candidate values, all tunable.   |
| `index.ts`   | Barrel: the one seam the engine imports content through.                    |

The engine reads content only through the exported accessors (`listSkills`,
`listNames`, `listEvents`, `getTuning`). Event effects are **declarative
descriptors** (target + attribute + signed delta) interpreted by the engine, never
callbacks that reach into engine internals — this is what lets content grow without
widening the engine's surface.

`copy.ts` is the one file **not** exported from the barrel. Voice is data, so the
game's labels belong in this layer — but the barrel is the seam the *engine* reads
content through, and the engine has no business knowing what a panel is called. Only
the view imports it, directly.
