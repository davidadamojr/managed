# 18 — [polish] Full-Run Integration Test (the echo lands, fairness holds)

## Context
Everything is built, hardened, onboarded, and tuned (13–17). This final Increment-1 polish prompt writes the **capstone integration test**: a seeded 5–6 sprint run that exercises the *entire* loop end-to-end and asserts the two things Increment 1 exists to guarantee — **the delayed echo completes its round trip** (crunch early → at-risk mid → loss late) and **the fairness guarantee holds** (warning precedes attrition). This is the automated proof that the core coupling is present; the *felt* punch remains builder-validated by play (§0 of CLAUDE.md, PRD §14).

Read `CLAUDE.md` §0 (the one thing to get right) and §5.5/§5.7, and PRD §14 (handoff — the single most important thing).

## User Story
As the builder, I have an automated end-to-end test proving that a crunch-heavy run produces a foreseeable, warned attrition in the intended window, so that the core coupling can't silently regress as later increments are built.

## Acceptance Criteria
- [ ] A **seeded full-run integration test** drives `newRun` → scripted sprints (assign, attend, crunch, resolve) → terminal state, deterministically.
- [ ] **Echo assertion:** a scripted crunch-heavy run produces the canonical arc — crunch ~sprint 2 → at-risk read surfaces ~sprint 4 → attrition ~sprint 5 (within the tuned window from prompt 17). The test asserts the quit lands in the intended window, not earlier (unforeseeable) or never (crunch free).
- [ ] **Fairness assertion:** the at-risk warning appears at least one sprint before the quit (the guarantee, §5.5), and the summary/post-mortem exposes it.
- [ ] **Contrast run:** a scripted *humane* run (no reckless crunch, attention spent on at-risk engineers) reaches completion with the team intact — proving the loss is a consequence of choices, not inevitability.
- [ ] **Post-mortem assertion:** on the loss run, the post-mortem trace names the crunch sprints and the ignored warning (the lesson is legible).
- [ ] **Determinism assertion:** the whole integration run is reproducible (same seed + script ⇒ identical outcome), and survives a mid-run save/resume unchanged.
- [ ] The test is part of the standard suite (`npm test`) and gated in CI as a regression guard for every future increment.

## Technical Specs
- Drives the **same pure engine + real tick** the view uses (composed as in the harness, prompt 12) — no bespoke logic.
- Uses tuned parameters from prompt 17 so the asserted windows match the settled design.
- Keep assertions on *engine-derived* facts (quit sprint, at-risk sprint, post-mortem trace, status), not on view rendering — this proves the *coupling*, which is engine-owned.
- Document clearly that this proves the echo is **present and fair**, but that whether it *hurts* is builder-validated by play (PRD §10/§14) — do not overclaim (§2).

## Testing
This prompt *is* the test, but it must itself be verified:
- Echo run: quit occurs in the tuned window; assert the sprint index.
- Fairness: at-risk sprint index < quit sprint index (outside the bounded fast-burnout exception).
- Contrast/humane run: reaches `status: 'completed'`, team intact.
- Post-mortem: trace contains the crunch sprints + ignored warning.
- Determinism + save/resume: identical outcome on replay and across a mid-run save.

Manual verification checklist:
- [ ] The integration test is green and lives in the standard suite.
- [ ] **Builder play-validation (the real test, per PRD §14):** play the loss run yourself. Does losing the engineer *land as a punch, not a shrug*? If it shrugs, the core needs fixing before any Increment 2 work — that is exactly what this smallest-honest-test was built to reveal cheaply. Flag this as the gate to proceeding.
- [ ] `npm test` green including this capstone.

## Out of Scope
- Any Increment 2+ system (tech debt, incidents, etc.) — Increment 1 is complete when the echo is proven present (here) and felt (by play).
- View-level assertions — this proves the engine coupling; view behavior was covered in 13–14.
- Art/polish beyond what raw legibility requires — deferred until fun is confirmed.
