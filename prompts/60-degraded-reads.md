# 60 — [Inc 8 · MVP] Degraded Reads Under Manager Burnout

> ⚠ **VALIDATE-FIRST.** The read-degradation mapping is a **decision-to-validate**: degraded reads must **impair without fully blinding** (PRD §I8.6) — the player should see the team *less clearly*, not lose all information. This is the game's signature thematic effect; get it evocative but fair.

## Context
Manager burnout shrinks capacity (59). This prompt adds its signature effect: **a burned-out manager literally sees the team less clearly.** The people-reads — already fuzzy (I-7) — get *fuzzier* as manager burnout rises. This is, per the PRD, "the sharpest thematic statement the game makes": the exhausted manager has nothing left to see their people with.

Read PRD §I8.2 (degrades reads), §I8.3 (reads changed), §I8.4 (degraded-reads UI effect), §I8.5, and `CLAUDE.md` §12 (I-1, I-7).

## User Story
As a manager, I want my burnout to visibly shrink my effectiveness — worse reads — so that running myself into the ground is a legible, self-inflicted spiral. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] As manager burnout rises, **people-reads degrade in fidelity** (PRD §I8.3): the qualitative reads get fuzzier (e.g. a card that once gave a usable read now says "hard to tell lately").
- [ ] **Impairs without fully blinding** (PRD §I8.6): even at high burnout, the player retains *some* signal — degraded, not zero. Total blindness would break fairness.
- [ ] **The fairness guarantee survives** (I-1, critical): degraded reads must NOT hide an at-risk warning so thoroughly that a loss becomes unforeseeable. The at-risk signal must remain perceptible (perhaps itself fuzzier) even under maximum manager burnout — losses stay foreseeable on every path, always.
- [ ] The degradation is **the manager's state, not the engineer's** — the UI communicates that "this is *you*, not them" (the poignant realization).
- [ ] Read-degradation mapping reads from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Read degradation is applied in the engine's read-derivation step (Inc-1 summary/detail derivation) as a function of manager burnout — the engine produces already-degraded reads; the view just displays them (I-3).
- **Hard constraint + dedicated test:** the at-risk warning remains perceptible at maximum manager burnout (fairness floor). This is the single most important guard in this prompt.

## Testing
Unit:
- Rising manager burnout produces progressively fuzzier people-reads.
- Even at max burnout, reads retain some signal (not fully blinded).
- **Fairness floor:** at maximum manager burnout, an at-risk engineer's warning is still perceptible — no unforeseeable loss (I-1). Dedicated test.
- The degradation attaches to manager state (recovering the manager sharpens the reads again).
- Mapping reads from constants; determinism holds.

Manual verification checklist:
- [ ] Run yourself into the ground: the team's cards go vague — "hard to tell lately" — and you realize that's *you*, not them. But you can still tell someone's about to walk.
- [ ] `npm test` green; fairness harness bar green under maximum manager burnout.

## Out of Scope
- Event library expansion — prompt 61.
- Voice/tone — prompt 62.
- Manager state read UI — prompt 63.
