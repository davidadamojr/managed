# 02 — Content-as-Data Layer

## Context
The scaffold, seeded RNG, and headless harness stub exist (prompt 01). Now we build **Layer 2** (§4 of CLAUDE.md): the content/data files that the engine reads but never hardcodes. Per the locked content-as-data rule (§6), even Increment 1's tiny content set — four skills, a name list, a minimal event set, and all tuning constants — lives in data, not engine logic. This separation is the primary enabler of the whole roadmap; we establish it now while the content is small.

Read `CLAUDE.md` §6 (content-as-data) and §9 (candidate parameters).

## User Story
As the builder, I can adjust game content and tuning by editing data files without touching engine logic, so that content grows and parameters tune without engine churn.

## Acceptance Criteria
- [ ] **Skill taxonomy** as data: exactly four skills — `frontend`, `backend`, `infra`, `debugging` (§9). Defined as a typed enum/union sourced from a data file, not scattered string literals.
- [ ] **Name list** as data: enough grounded, recognizable engineer names to build a 3–4 person roster with a per-engineer flavor field (a short "vibe" string). Wry, grounded, recognizable tone (§8).
- [ ] **Minimal event set** as data: a tiny seed set (even 2–3 events) each with a selection/trigger rule, a description string, and a declarative effect-on-state descriptor. **The event mechanism is data-driven now**; the library grows in Increment 8. Increment 1 fires at most one event per sprint.
- [ ] **Tuning constants** as a single data file: run length, team size, attention pool size + per-action costs, burnout accrual rate, morale-throughput coefficients, attrition threshold + warning lead-time, roadmap size, crunch multipliers, backlog-over-capacity ratio. All seeded from §9 candidate values, each clearly labeled as a tunable starting point.
- [ ] Typed loaders/accessors in `/src/content` expose this data to the engine via plain data structures. The engine will read these; it must not embed the values.
- [ ] Event **effects are declarative data interpreted by the engine**, not functions embedded in content that reach into engine internals (keep content as data, not logic).

## Technical Specs
- Files live in `/src/content` as JSON or TS-as-data (plain exported objects/arrays — no logic, no functions with behavior beyond pure declarative shape).
- All values JSON-serializable-friendly (they feed a serializable `GameState` and a deterministic tick).
- Tuning constants file is the **single source** for §9 parameters — no duplicated magic numbers in the engine. The tuning harness (prompt 12) and tuning pass (prompt 17) both read/rewrite this file.
- Tone for flavor strings: wry, grounded, recognizable (§8). The at-risk warning phrasings will be added when the warning is built (prompt 09), but if any warning-adjacent copy lives here, keep it human, not system-alert.

## Testing
Unit:
- Skill taxonomy loads and contains exactly the four expected skills.
- Name list loads and has enough entries for a 3–4 roster; each has a flavor field.
- Event set loads; each event has a trigger rule, description, and declarative effect descriptor.
- Tuning constants load; every §9 parameter is present and typed; values match the documented candidate set.
- Content is pure data: no executable game logic imported from `/src/content` into `/src/engine` beyond declarative structures.

Manual verification checklist:
- [ ] Changing a tuning constant value changes nothing structurally (no engine edit needed to retune).
- [ ] `npm test` green.

## Out of Scope
- Consuming this content in a tick — prompt 08.
- Building the roster/backlog/roadmap from it — prompt 04.
- Growing the event library — Increment 8 (do not add more than the tiny seed set).
- Archetype-driven differentiated reactions — deferred (Inc 1 stubs personality to one reaction model).
