# 07 — People Model: Morale (within-sprint) & Burnout (across-sprint)

## Context
Assignment/crunch intent (05) and the attention economy (06) exist. Now we build the **people model** — the pure functions that shift morale and burnout in response to how the player worked and treated each engineer. This is one half of the core coupling. **Morale is a fast within-sprint mood; burnout is a slow across-sprint accumulation** (§5.4 of CLAUDE.md) — they must remain distinct. This prompt builds the *response functions* as pure, tested units; the tick (prompt 08) wires them into resolution.

Read `CLAUDE.md` §5.4 (morale vs burnout — must not collapse) and PRD §4.1 (people model).

## User Story
As a manager, I want each engineer's morale and burnout to shift based on how I worked them, so that my choices have human consequences, not just output consequences.

## Acceptance Criteria
- [ ] Pure functions compute morale and burnout deltas from sprint inputs: workload (assigned vs idle vs over-loaded), poor-fit, crunch, and attention actions received (1:1 lift, Recognize boost, Unblock relief).
- [ ] **Morale** responds *within-sprint*: it moves meaningfully in a single sprint based on treatment/workload, and can go both up (recognition, unblock, reasonable load) and down (overload, neglect, poor-fit frustration).
- [ ] **Burnout** *accumulates across sprints*: sustained overload and crunch add burnout that persists and compounds; it moves slowly relative to morale and does not fully reset each sprint. **This slowness is what makes the echo delayed** — do not let a single sprint's burnout swing be as large as morale's.
- [ ] **Crunch cost is deferred in felt effect, immediate in bookkeeping** (PRD §4.2): crunch adds burnout *now*, deterministically — the delay is that burnout doesn't *surface* as attrition risk until it accumulates (prompt 09), not that the bookkeeping waits.
- [ ] **Idle is not necessarily neutral** (PRD §4.2): an unattended/idle engineer has a defined morale/burnout response (to be tuned), not a no-change stub.
- [ ] **Unattended drift** (PRD §4.3): engineers who receive no attention over time drift (morale erosion), giving the no-op sprint real consequences.
- [ ] Both values are **clamped 0–100** (§5.4) — the functions clamp rather than overflow.
- [ ] Morale and burnout are updated through **separate code paths** and never merged into one value.
- [ ] All coefficients (accrual rates, crunch burnout cost, morale swings, idle response, drift rate) come from tuning constants (prompt 02).

## Technical Specs
- Pure functions over state + inputs; no mutation, no RNG unless a coefficient is explicitly stochastic (prefer deterministic here for tuning clarity — if any randomness, it threads the seeded RNG).
- The **relative rates matter more than absolute values**: burnout accrual must be slow enough that a sprint-~2 crunch surfaces as risk around sprint ~4–5 (this is validated in the harness, prompt 12 — but the *shape* is set here). Document the intended relationship in comments/tests.
- Keep morale's throughput effect (morale modulates throughput) as a defined function the tick will call — but apply it in the tick (prompt 08), not here.

## Testing
Unit:
- Morale moves within a single sprint from treatment (up on Recognize/Unblock/reasonable load; down on overload/neglect/poor-fit).
- Burnout accumulates across simulated sequential sprints and does **not** fully reset each sprint.
- Burnout per-sprint swing is smaller than morale's per-sprint swing (the slowness invariant — guards the delayed echo).
- Crunch adds burnout immediately and deterministically.
- Idle engineer has a non-zero defined response (not a neutral stub).
- Unattended-over-time engineer drifts (morale erodes across sprints with no attention).
- Both clamp at 0 and 100; no overflow.
- Morale and burnout never collapse into one value (separate fields, separate paths).
- Coefficients read from tuning constants.

Manual verification checklist:
- [ ] Simulate: crunch at sprint 2, then observe burnout still elevated at sprint 4 (slow decay/accumulation) while morale has swung around freely — the two behave on different timescales.
- [ ] `npm test` green.

## Out of Scope
- Wiring these into full sprint resolution — prompt 08.
- The attrition threshold and at-risk warning — prompt 09.
- Fuzzy reads / trends in the summary — prompt 10.
- Personality-differentiated reactions — deferred (Inc 1 is one reaction model).
