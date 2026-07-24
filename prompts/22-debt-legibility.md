# 22 — [Inc 2 · MVP] Debt Legibility (Meter + Trend + Projection)

> ⚠ **VALIDATE-FIRST.** The qualitative bands and the plain-language projection wording are **decisions-to-validate** — they must make the tradeoff *feel* legible in play. The asymmetry decision (debt explicit, morale fuzzy) is locked by the PRD, but the exact thresholds/phrasing tune against Inc-1's readability feel.

## Context
Debt accrues (19), drags (20), and can be paid down (21) — but the player must be able to *read* the tradeoff, or the "invisible work made legible" thesis fails. This prompt builds **debt legibility**: debt rendered as a readable meter with a trend, plus a plain-language velocity projection. Crucially, this is a deliberate **asymmetry** with morale: debt is a systems property shown explicitly; people interiors stay fuzzy (I-7).

Read PRD §I2.2 (debt legibility), §I2.5 (asymmetry rationale), and `CLAUDE.md` §12 (I-7 fuzzy people-reads — debt is the exception).

## User Story
As a manager, I want the debt tradeoff made readable — to see that paydown, though it shipped nothing this sprint, measurably reduced future drag — so that invisible maintenance work feels satisfying rather than thankless. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] Debt is rendered (as *data* for the view; the visual is prompt 23) as a **readable meter with a trend** (level + direction) — explicit, not fuzzy (PRD §I2.5 decision).
- [ ] A **plain-language projection** accompanies it (e.g. "debt is dragging velocity ~15% and rising"). The percentage derives from the prompt-20 penalty; the "rising/falling" from the trend.
- [ ] **First-sprint debt shows level without trend** (no prior direction yet) — acceptable, mirroring Inc-1's first-summary rule.
- [ ] After a paydown sprint, the summary shows the **projected benefit** — the measurable future-drag reduction — so the recovery is legible and satisfying.
- [ ] `SprintSummary` gains debt level, debt trend, current velocity penalty, and projected paydown benefit (PRD §I2.3 SprintSummary changed).
- [ ] The **asymmetry is preserved**: debt is explicit; morale/burnout remain fuzzy (I-7). This prompt does not make people-reads numeric.

## Technical Specs
- All derivation happens in the engine's summary step (Inc-1 prompt 10), which now also emits debt legibility fields. The view only renders them (prompt 23) — engine/view wall (I-3).
- Qualitative bands / projection phrasing live in content data where reasonable (I-6) so tuning adjusts legibility without engine edits.
- The projection percentage must match the actual penalty applied (single source of truth — reuse `velocityPenaltyFor`).

## Testing
Unit:
- Summary contains debt level, trend, current velocity penalty, and (after paydown) projected benefit.
- Projection percentage equals the penalty actually applied by prompt 20 (no divergent second calculation).
- First-sprint debt shows level, no trend.
- A paydown sprint surfaces a legible projected-benefit figure.
- Debt is explicit while morale/burnout remain fuzzy in the same summary (asymmetry holds).

Manual verification checklist:
- [ ] Read a summary after paydown: "velocity recovered ~N points" reads clearly and matches the mechanics.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- The visual Debt Meter component — prompt 23.
- Harness debt bars / retune — prompt 24.
