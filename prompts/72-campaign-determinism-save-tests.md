# 72 — [Inc 9 · polish] Determinism & Save Property Tests Across the Whole Campaign

> ⚠ **VALIDATE-FIRST.** Enforces I-4 (determinism) and lossless persistence across every system built in nine increments. No parameters — this is a correctness net over the complete feature set, extending the Inc-1 property tests (prompt 15) to everything added since.

## Context
The full game passes its bars together (71). This prompt extends the Increment-1 determinism/save property tests (prompt 15) to cover **every system in the campaign** — people depth, debt, incidents, hiring, org, peers, manager burnout, and the expanded event library — so determinism and lossless save/resume hold across the whole feature set.

Read `CLAUDE.md` §12 (I-4 determinism) and PRD §I9.5 (save format).

## User Story
As the builder, I want property tests proving determinism and lossless persistence across every campaign system, so that no system added over nine increments quietly introduced nondeterminism or a save-corruption path.

## Acceptance Criteria
- [ ] **Determinism property tests** across the full feature set (I-4): for arbitrary seeds and action sequences exercising all systems, identical inputs reproduce identical runs — including debt accrual, incident generation, org/peer events, negotiations, transfers, and manager burnout.
- [ ] **Save/resume property tests** across the full feature set (PRD §I9.5): serialize → deserialize at arbitrary points yields an identical, resumable state for every system; export→import (prompt 67) round-trips losslessly.
- [ ] **No hidden nondeterminism**: every stochastic system threads the single seeded RNG in `GameState` — a property test/audit confirms no system uses `Math.random` or unseeded time (I-4).
- [ ] Mid-run save/resume across a long campaign produces bit-identical continuation.
- [ ] Tests are themselves deterministic and reproducible.

## Technical Specs
- Extend the Inc-1 property-test rig (prompt 15) with generators that exercise the later systems; do not build a parallel rig.
- Add a static/dynamic audit for unseeded randomness or time-dependence across the whole engine.

## Testing
Integration / property:
- Determinism holds under randomized action sequences across all systems.
- Save/resume and export/import round-trip losslessly at arbitrary points across the full feature set.
- RNG audit: no unseeded randomness/time anywhere in the engine.
- Long-campaign mid-run save/resume is bit-identical.

Manual verification checklist:
- [ ] Save mid-campaign at several points, resume, and confirm identical continuation; export/import a long run losslessly.
- [ ] `npm test` + full harness green.

## Out of Scope
- Campaign framing decision — prompt 73.
- Final integration run — prompt 74.
