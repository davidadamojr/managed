# 15 — [polish] Determinism & Save-Compat Property Tests, RNG Audit

## Context
The full game plays end-to-end through the UI (13–14) on a proven engine. This polish prompt **hardens the two load-bearing guarantees** with property-based testing rather than only example tests: determinism (§5.2 of CLAUDE.md) and save/resume exactness (prompt 11). It also audits the codebase for any ambient nondeterminism that slipped in. These guarantees underpin the tuning harness *and* player trust — they deserve stronger-than-unit coverage.

Read `CLAUDE.md` §5.2 (determinism) and §5.7 (harness depends on it).

## User Story
As the builder, I have property-based guarantees that any run is perfectly reproducible and any save resumes exactly, so that the tuning harness and player trust rest on a proven foundation, not a few examples.

## Acceptance Criteria
- [ ] **Property test — determinism:** for many random seeds and many random-but-legal action sequences, `tick`-driven full runs are byte-identical on replay (same seed + same actions ⇒ deeply-equal final state + summaries).
- [ ] **Property test — purity:** for arbitrary states + actions, `tick` never mutates its input (input deeply-equal before/after).
- [ ] **Property test — save round-trip:** for arbitrary in-progress states, `serialize`→`deserialize` is deeply equal including `rngState`, and resuming from a mid-run save produces a run identical to the uninterrupted one.
- [ ] **RNG audit:** an automated check (grep/lint/test) that fails if `Math.random`, `Date.now`, `performance.now`, or any wall-clock/ambient nondeterminism appears in `/src/engine`, `/src/content`, or `/harness` game logic.
- [ ] **No ambient nondeterminism** anywhere in the engine path is confirmed (object key ordering in serialization, Set/Map iteration, etc. — anything that could vary a serialized result is ruled out or normalized).
- [ ] Any issue the audit finds is fixed, honestly reported (§2), and covered by a regression test.

## Technical Specs
- Use a property-testing approach (e.g. fast-check with Vitest) with enough cases to be meaningful but bounded for CI time.
- Generators produce *legal* action sequences (valid assignments, affordable attention spends) so the properties test the real space, not garbage inputs.
- The determinism property is the single most important one — if it ever fails, the whole tuning approach and save system are compromised. Treat a failure here as blocking.

## Testing
Property / integration:
- Determinism holds across generated seeds + action sequences.
- Purity holds across generated inputs.
- Save round-trip + mid-run resume exactness hold across generated states.
- RNG audit passes (no ambient nondeterminism); a deliberately-inserted `Math.random` is caught (proves the audit works), then removed.

Manual verification checklist:
- [ ] Run the property suite; it's green with a meaningful case count.
- [ ] Temporarily insert `Date.now()` into the engine; the audit fails; remove it.
- [ ] `npm test` green.

## Out of Scope
- New gameplay — none in a polish prompt.
- Parameter tuning — prompt 17.
