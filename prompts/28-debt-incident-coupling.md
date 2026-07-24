# 28 — [Inc 3 · MVP] Debt ↔ Incident Coupling

> ⚠ **VALIDATE-FIRST.** The debt-weighting of incident probability is a **decision-to-validate**: the correlation must be *perceptible across a run but not deterministic* (PRD §I3.6) — it should read as risk, not punishment. Trustworthy only once Inc-2 debt rates are settled (prompt 24).

## Context
Incidents generate (26) and are responded to (27); generation already reads debt (26). This prompt makes the **debt→incident loop legible and correctly calibrated** — the neglect the player accrued in Increment 2 comes back as fires in Increment 3, closing the loop. The coupling must be perceptible but probabilistic.

Read PRD §I3.2 (debt↔incident coupling), §I3.6 (tuning), and `CLAUDE.md` §12 (I-4, I-5).

## User Story
As a manager, I want neglected technical debt to raise incident probability, so that the debt I ignored comes back as fires, closing the loop with Increment 2. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] Incident probability (and optionally severity) reads current `TechDebt` when computing generation (PRD §I3.2), making Inc-2 neglect legible as Inc-3 fires.
- [ ] **Perceptible but not deterministic** (PRD §I3.2 edge case): high debt raises the odds, never *guarantees* a fire — it reads as elevated risk, not a scripted punishment.
- [ ] The coupling strength (debt-weighting factor) is a **tuning constant** (I-6).
- [ ] The loop is closed both ways at the mechanic level: unresolved incidents can *increase* debt (prompt 27), which raises future incident odds — but this compounding is bounded by the per-sprint cap (prompt 26) and never soft-locks (I-5).
- [ ] Determinism (I-4): same seed + same debt trajectory ⇒ identical incident pattern.

## Technical Specs
- This is primarily a calibration + legibility prompt: the mechanic exists from prompt 26, but here it is tuned to perceptibility and the summary makes the link readable (e.g. the summary can note when debt elevated incident risk, without claiming determinism).
- Keep the coupling in engine logic reading data constants; the view only renders any resulting summary note (I-3).

## Testing
Unit / statistical:
- Across many seeds, higher sustained debt yields more incidents (perceptible correlation).
- No single seed shows debt *guaranteeing* a fire (non-deterministic — there exist high-debt sprints with no incident).
- Coupling factor reads from tuning constants.
- The debt→incident→debt loop stays bounded (cap holds; no runaway).
- Determinism holds.

Manual verification checklist:
- [ ] Over a run, a player who ignored debt visibly faces more fires — and can feel the causal link without it being a rigged sequence.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Silent-success beat — prompt 30.
- On-call — prompt 31.
- Final incident tuning + bars — prompt 32.
