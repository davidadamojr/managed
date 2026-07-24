# 41 — [Inc 5 · MVP] Hiring Pipeline (Attention-Costed, Laggy, Fallible)

> ⚠ **VALIDATE-FIRST.** Hiring lag length and fall-through probability are **decisions-to-validate**: the lag must make attrition genuinely painful and prevention clearly worthwhile (PRD §I5.6 — "prevention must be numerically cheaper than recovery"). Trustworthy only once the revised fail state (prompt 40) and run economy are settled.

## Context
Loss is now survivable (40). This prompt gives the player a path to recover or expand: a **hiring pipeline**. Crucially, **advancing it costs the same scarce attention that people-care needs** — so crisis-hiring starves the very care that prevents the next departure, the deliberate vicious cycle that is the emotional truth of understaffing (PRD §I5.5).

Read PRD §I5.2 (hiring pipeline), §I5.3 (HiringPipeline entity), §I5.5 (hiring costs attention), and `CLAUDE.md` §12 (I-2 attention hook, I-4, I-6).

## User Story
As a manager, I want to open a hiring pipeline to backfill or grow the team, so that I have a path to recover from loss and to expand. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`HiringPipeline` entity** (PRD §I5.3): belongs to `GameState`; contains candidates in progress, each with a stage, an ETA (the lag), and a prospective profile.
- [ ] **Opening/advancing costs attention** (PRD §I5.5): interviewing competes for the scarce attention pool that people-care also needs — the vicious-cycle trap. Hiring spends attention, not a separate currency.
- [ ] **Multi-sprint lag:** candidates advance over multiple sprints before a hire lands (PRD §I5.2).
- [ ] **Fallible:** a hire can decline / fall through (seeded), so hiring isn't a guarantee (PRD §I5.2).
- [ ] The attention spent on hiring is drawn from the **same pool** modulated by manager state (I-2) — so it correctly competes with 1:1/Recognize/coaching.
- [ ] Lag length + fall-through probability read from tuning constants (I-6); deterministic (I-4).
- [ ] Pipeline serializes losslessly.

## Technical Specs
- Hiring actions are new attention actions in the Inc-1 attention economy (prompt 06) — reuse the pool and the `attentionCapacityFor(manager)` capacity (I-2). Do not create a parallel hiring currency.
- Candidate advancement happens in the tick; fall-through is a seeded roll at the appropriate stage.
- The new hire lands on the roster but does not yet ramp — ramp is prompt 42.

## Testing
Unit:
- Opening a pipeline and advancing candidates costs attention from the shared pool (competing with people-care).
- Candidates advance over multiple sprints (lag); a hire lands only after the ETA.
- Fall-through occurs (seeded) at the configured probability — hiring is not guaranteed.
- Lag/fall-through read from constants; determinism + serialization hold.

Manual verification checklist:
- [ ] Open a req mid-crisis: notice you're now spending attention on interviews that you're not spending keeping the rest of the team from following the leaver out.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Onboarding drag / ramp — prompt 42.
- Hiring UI — prompt 43.
- Prevention-vs-recovery tuning — prompt 44.
