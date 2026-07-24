# 31 — [Inc 3 · polish] On-Call (Minimal, One Burnout Vector)

> ⚠ **VALIDATE-FIRST.** On-call burnout rate is a **decision-to-validate** against the settled Inc-1 burnout curve — on-call adds a burnout vector, so it must not silently overwhelm the people system. Keep it minimal; rotation-scheduling depth is deferred as potential over-modeling (PRD §I3.5).

## Context
The chaos engine works and mines its comedy (26–30). This prompt adds **on-call** — a minimal per-sprint assignment that feeds burnout, coupling the chaos engine back into the people system rather than sitting apart from it. Deliberately minimal (one burnout vector, no rotation depth) per the anti-over-modeling guardrail (I-8).

Read PRD §I3.2 (on-call optional), §I3.3 (Engineer changed — on-call flag), §I3.5 (on-call minimal), and `CLAUDE.md` §12 (I-8 depth from interaction).

## User Story
As a manager, I want on-call load to feed burnout, so that the chaos engine couples back into the people system rather than sitting apart from it. `[ENHANCE]`

## Acceptance Criteria
- [ ] A **per-sprint on-call assignment**: one engineer can be assigned on-call, adding a burnout vector to them (PRD §I3.2).
- [ ] The on-call burnout cost is **visible in the people read** (fuzzy, I-7 — the read reflects the added strain).
- [ ] **Minimal only** (PRD §I3.5): no rotation scheduling, no multi-week rotation modeling — just the assignable flag and its burnout vector. Do not over-build (I-8).
- [ ] On-call burnout rate is a **tuning constant** (I-6); deterministic (I-4).
- [ ] `Engineer` gains the transient on-call flag (PRD §I3.3); it serializes.
- [ ] On-call couples cleanly with Inc-1 burnout → attrition and the fairness guarantee (I-1): on-call-driven burnout still surfaces as a foreseeable warning before any quit.

## Technical Specs
- On-call is an assignment flag processed in the tick alongside other burnout inputs (Inc-1 prompt 07) — reuse the burnout accrual path; don't build a separate one.
- Because it feeds burnout, it feeds attrition — verify the fairness guarantee still holds with on-call as a burnout source (a warned quit, never a surprise).

## Testing
Unit:
- Assigning on-call adds burnout to that engineer at the configured rate.
- The people read reflects the added strain (fuzzy).
- No rotation-scheduling surface exists (minimal-scope assertion).
- Rate reads from tuning constants; determinism holds.
- **Fairness with on-call:** an engineer pushed toward attrition partly by on-call still gets the fuzzy warning first (I-1).

Manual verification checklist:
- [ ] Keep one engineer on-call across sprints: their burnout climbs and reads accordingly, with a warning before any quit.
- [ ] `npm test` green; fairness harness bar green with on-call active.

## Out of Scope
- Rotation scheduling / on-call depth — deferred (over-modeling).
- Harness + retune + integration — prompt 32.
