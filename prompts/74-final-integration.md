# 74 — [Inc 9 · polish] Final Integration (Long Campaign Exercises Every System; All Invariants Asserted)

> ⚠ **VALIDATE-FIRST.** The capstone. No parameters — this is the single end-to-end proof that the assembled game embodies every cross-increment invariant (§12) at once. It is the last automated gate before the game is considered done (`CLAUDE.md` §14 definition-of-done, campaign scale).

## Context
Everything is built, polished, verified, and framed (01–73). This final prompt is the **capstone integration test**: one long, seeded campaign run that exercises every system, asserting all cross-increment invariants (I-1…I-9) hold together in the finished game.

Read `CLAUDE.md` §12 (all invariants) and §14 (definition of done).

## User Story
As the builder, I want one long campaign integration run that exercises every system and asserts every cross-increment invariant, so that "done" is proven, not assumed. `[polish]`

## Acceptance Criteria
- [ ] A **long seeded campaign run** exercises every system: the juggle, crunch→burnout→attrition echo, tech debt accrue/compound/paydown, incidents + triage + silent successes, archetypes/growth/relationships/contagion, multi-dimensional survivable loss + hiring + ramp, org events + shielding + dual-track standing, peer negotiation + dependencies + peer reputation + internal transfer, manager burnout + degraded reads + the expanded voiced event library.
- [ ] **Every cross-increment invariant is asserted** (§12):
  - **I-1** every people-loss path (attrition, cascade, transfer) is foreseeably warned — even under manager-burnout degraded reads.
  - **I-2** attention capacity reads manager standing *and* burnout.
  - **I-3** the engine has zero view dependencies (structural audit).
  - **I-4** the whole run is deterministic and save/resume-exact.
  - **I-5** the only run-ending conditions are human-outcome-based (no metric fail anywhere).
  - **I-6** all events/archetypes/org-events/negotiations/tuning are data.
  - **I-7** people-reads (and the manager's own) stay fuzzy throughout.
  - **I-8** no over-modeled subsystem crept in (the gated depths are present only where earned).
  - **I-9** the full harness bar suite is green on this run.
- [ ] The **core thesis is demonstrably intact**: the run shows the delayed echo landing, prevention rewarded over churn, and the team remaining the emotional center under all the org/peer/manager machinery.
- [ ] Runs deterministically and reproducibly; documented as the campaign's definition-of-done gate.

## Technical Specs
- This is the top-level orchestration test composing the per-increment integration tests + the meta-bars (prompts 71–72) into one campaign run with invariant assertions. Reuse everything; add the invariant-assertion harness.
- The I-3 audit and I-6/I-8 structural checks run as part of this gate.

## Testing
Integration:
- The long campaign run completes deterministically and exercises every system (coverage asserted).
- Each invariant I-1…I-9 has an explicit assertion that passes.
- The thesis checks (echo lands, prevention > churn, team stays central) pass.
- A deliberately-introduced violation of any invariant is caught by its assertion, then fixed.

Manual verification checklist:
- [ ] **Play a long campaign end-to-end.** Every system is present and coupled; every guarantee holds; the game feels like the PRD's vision — the Football-Manager-of-engineering-management with a soul.
- [ ] `npm test` + full harness + this capstone gate all green.

## Out of Scope
- Nothing deferred within the campaign remains for this series — this is the final gate. (Future work: a full scenario content library per prompt 73, and executing a Unity port if prompt 70 recommended it — both explicitly outside this build series.)
