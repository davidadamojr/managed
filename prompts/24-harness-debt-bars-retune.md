# 24 — [Inc 2 · polish] Harness Debt Bars & Retune

> ⚠ **VALIDATE-FIRST.** This prompt *is* the validation instrument for Increment 2's parameters — but its pass/fail only means "mechanically sound." Whether debt *feels* like a satisfying tradeoff is builder-validated by play afterward (PRD §10). The final debt rates chosen here remain decisions-to-validate until you've played them.

## Context
Increment 2 plays end-to-end (19–23). Now extend the tuning harness (Inc-1 prompt 12) with **debt-specific mechanical bars** and run the retune, following the same fun-tuning workflow: Claude Code owns mechanical suitability + offers a best-estimate of fun; the builder validates fun by playing.

Read PRD §I2.6 (tuning outputs) and `CLAUDE.md` §5.7 + §12 (I-9 harness grows with the engine).

## User Story
As the builder, I can run seeded simulations that report whether debt meets its mechanical bars, so that I tune debt from a sound baseline before validating the tradeoff by playing.

## Acceptance Criteria
- [ ] The harness gains bars for Increment 2 (PRD §I2.6):
  1. **Ignorable-but-not-forever:** debt is safely ignorable for a while but a no-paydown run becomes visibly painful by late game.
  2. **No soft-lock:** a no-paydown run never reaches zero velocity / unwinnable stall (I-5).
  3. **Legible recovery:** paydown produces a measurable, satisfying velocity recovery.
  4. **Debt slower than burnout** (the heart-protection constraint from prompt 19) holds across seeds.
- [ ] The full **Inc-1 bar suite still passes** alongside the new ones (I-9 — echo timing + fairness must not regress now that debt drags velocity).
- [ ] Sweeps over debt accrual rate, penalty curve, and paydown efficiency report how each bar responds; Claude Code proposes passing parameter sets with rationale and a labeled best-estimate-of-fun pick (kept separate from mechanical pass/fail, per PRD §10).
- [ ] Chosen values written back to **tuning constants** (I-6); rationale documented; PRD §I2.6 candidate values updated to reflect what was settled (living-document discipline).

## Technical Specs
- Add debt-strategy drivers (always-paydown, never-paydown, balanced) to the existing harness strategy set — reuse the prompt-12 framework, don't fork it.
- Honesty over impressiveness (§2): if no parameter set passes all bars, report the tradeoff; don't fudge, and don't change engine logic to force a pass (flag a design finding instead).

## Testing
Integration:
- Each new bar computes deterministically and is reproducible.
- A deliberately-broken debt rate (e.g. accrual faster than burnout, or a soft-locking penalty) is caught by the relevant bar (proves the bars have teeth), then reverted.
- Inc-1 bars re-run green with debt active.

Manual verification checklist:
- [ ] Read the retune report; each bar's numbers are plausible and honestly reported; the fun-pick is labeled as a hypothesis.
- [ ] `npm test` + harness green.
- [ ] **Then play** the chosen set to feel whether paydown is a satisfying tradeoff (builder-owned).

## Out of Scope
- Run-length extension + integration test — prompt 25.
- Increment 3 systems.
