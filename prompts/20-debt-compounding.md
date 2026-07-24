# 20 — [Inc 2 · MVP] Debt Compounding (Velocity-Penalty Curve)

> ⚠ **VALIDATE-FIRST.** The penalty curve shape (gentle→steep) and its magnitudes are **decisions-to-validate** against how the Inc-1 run economy actually feels. Debt must be *ignorable for a while but not forever* — a bar the harness checks in prompt 24, but the shape is set here and only trustworthy once Inc-1 velocity/throughput is settled.

## Context
TechDebt accrues and is stored (prompt 19). Now debt must *bite*: accumulated debt applies a **velocity penalty** that scales with the current level, recomputed each tick, so ignored debt makes every future sprint quietly less productive. This is the compounding that makes neglect (not mere existence) hurt.

Read PRD §I2.2 (debt compounding) and `CLAUDE.md` §12 (I-5 fail-axis).

## User Story
As a manager, I want accumulated debt to visibly slow my team's velocity over time, so that neglect compounds and I feel the drag I created. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] A **velocity penalty** is derived from current debt level and applied during work resolution in the tick, reducing throughput.
- [ ] **Curve shape:** gentle at low debt (early game isn't punished for merely existing), steepening as debt grows (so *neglect* is what hurts, PRD §I2.2).
- [ ] **Never total:** at maximum debt the penalty is severe but the team never reaches zero velocity (that would soft-lock the run — I-5, no debt-driven fail path).
- [ ] Penalty is **recomputed each tick** from the current level (not a stored stale value), so paying debt down (prompt 21) immediately eases the drag next sprint.
- [ ] Curve parameters live in **tuning constants** (I-6).
- [ ] Deterministic (I-4); pure function of debt level.

## Technical Specs
- The penalty function is a pure function `velocityPenaltyFor(debtLevel): factor`, called inside the tick's work resolution. Keep it separate and testable.
- Compose with Inc-1's existing throughput math (skill-fit × morale × crunch) as a multiplicative drag — document the composition order so it doesn't drift.
- The "never total" floor is a hard invariant with a test.

## Testing
Unit:
- Penalty increases with debt; curve is gentle low / steep high (assert convexity at sampled points).
- At max debt, penalty is severe but velocity floor > 0 (no soft-lock).
- Penalty recomputes from current level (reducing debt reduces penalty next tick).
- Curve reads from tuning constants.
- Determinism holds.

Integration:
- A no-paydown crunch-heavy run shows steadily dropping effective velocity across sprints.

Manual verification checklist:
- [ ] Early small debt barely stings; late large debt clearly drags but never zeroes output.
- [ ] `npm test` green; Inc-1 + prompt-19 harness bars still green.

## Out of Scope
- Paydown (the way to reduce debt) — prompt 21.
- Debt meter UI / projection copy — prompts 22–23.
