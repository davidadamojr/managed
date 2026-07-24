# 19 — [Inc 2 · MVP] TechDebt Entity & Accrual

> ⚠ **VALIDATE-FIRST.** Do not start Increment 2 until Increment 1 is built AND played, and the burnout curve *feels* right. Debt's entire calibration is **relative to burnout** (PRD §I2 depends-on): debt must accrue **slower** than burnout and read as a longer-horizon threat, or it will overpower the people story that is the heart. Every rate in this prompt is a **decision-to-validate** against the settled Inc-1 burnout curve (prompt 17).

## Context
Increment 1 is complete and its echo validated by play. This begins Increment 2, which deepens the delayed echo on the *systems* side and introduces the first canonical "invisible work made legible" tradeoff. This prompt adds the **TechDebt entity** and its **accrual** — debt silently accumulates from rushed/crunched/poor-fit work, mirroring the burnout echo. This is a delta on Inc 1; it adds/changes only what it needs (PRD §11 convention).

Read `CLAUDE.md` §11 (dependency chain), §12 (I-4 determinism, I-5 fail-axis, I-6 content-as-data), and PRD §I2.2/§I2.3 (debt accrual + entity).

## User Story
As a manager, I want rushed and crunched work to silently accrue technical debt, so that cutting corners has a delayed cost, mirroring the burnout echo on the systems side. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`TechDebt` entity** (PRD §I2.3): belongs to `GameState`; a single team-level aggregate for this increment (per-area debt deferred — do not build it). Contains current level and a derived current velocity penalty (penalty computed in prompt 20).
- [ ] **Accrual on resolution:** the tick adds debt proportional to rushed/crunched/poor-fit work — a sprint run hot (crunch on, poor fit) generates more debt than clean work. A clean sprint may add **zero** debt.
- [ ] **Debt never decreases except via paydown** (prompt 21). It only goes up here.
- [ ] Debt is **bounded with a high ceiling** (clamped, not overflowing).
- [ ] **Accrual rate strictly slower than burnout accrual** (PRD §I2.3 key constraint) — a hard relationship, validated in the harness (prompt 24). Encode the intended relationship in tests/comments so it can't silently drift.
- [ ] All accrual rates come from **tuning constants** (content-as-data, I-6) — no hardcoded debt math in engine logic.
- [ ] Accrual is **deterministic** (I-4): threads the seeded RNG only if any stochastic component exists; prefer deterministic accrual for tuning clarity.
- [ ] The GameState serialization round-trip (Inc 1 prompt 03) now includes `TechDebt` losslessly.

## Technical Specs
- Accrual is a pure function called from the fixed tick order (Inc 1 prompt 08). Insert it at a documented point (after work resolution, alongside/adjacent to burnout update) without reordering existing steps.
- Debt is a *systems* property, so unlike morale/burnout it will later be shown explicitly (prompt 22) — but this prompt only accrues and stores it; legibility is separate.
- Do not add any fail path from debt (I-5): debt makes the juggle harder, never ends the run.

## Testing
Unit:
- Rushed/crunch/poor-fit sprint adds more debt than a clean sprint; a fully clean sprint adds zero.
- Debt only increases here (no path decreases it yet).
- Debt clamps at its ceiling; never overflows.
- **Relative-rate invariant:** over matched scenarios, debt accrues slower than burnout (guards the heart-protection constraint).
- Rates read from tuning constants (changing a constant changes accrual with no engine edit).
- Determinism: same seeded run + actions ⇒ identical debt level.
- Serialization round-trip includes debt.

Manual verification checklist:
- [ ] Simulate a crunch-heavy run: debt climbs but stays behind burnout on the timeline.
- [ ] `npm test` green; Inc-1 echo-timing + fairness harness bars still green (I-9 — no regression).

## Out of Scope
- Velocity penalty / compounding — prompt 20.
- Paydown — prompt 21.
- Debt meter UI — prompt 23.
- Per-area (per-skill) debt — deferred as over-modeling.
