# 25 — [Inc 2 · polish] Run-Length Extension & Debt Arc Integration Test

> ⚠ **VALIDATE-FIRST.** How much to extend the run for the debt arc to breathe is a **decision-to-validate** — it depends on the retuned debt rates (prompt 24) and on Inc-1's settled run length. Confirm by playing that the longer run doesn't dilute the Inc-1 echo.

## Context
Increment 2 is tuned (24). The debt arc (accrue → compound → paydown recovery) needs enough sprints to complete and matter — Increment 1's 5–6 sprints may be too short for debt to breathe (PRD §I2.1 `[ENHANCE]`, §I2.6). This prompt extends run length as needed and adds the capstone integration test proving the debt arc lands, while confirming the Inc-1 echo still lands within the longer run.

Read PRD §I2.6 and `CLAUDE.md` §12 (I-1 fairness, I-9 harness).

## User Story
As a manager, I want runs long enough for debt to complete its accrue→compound→paydown arc, so that the system has room to matter. `[ENHANCE]` — and as the builder, I have an automated test proving that arc lands without breaking Inc 1.

## Acceptance Criteria
- [ ] Run length is extended (value from the retune, prompt 24) so the debt arc completes; the extension is a tuning constant, not hardcoded.
- [ ] **Debt arc integration test** (seeded): a scripted run accrues debt, lets it compound to visible drag, then pays it down and shows measurable recovery — asserted on engine-derived facts (debt level, penalty, projected benefit).
- [ ] **Inc-1 echo still lands** within the longer run: a crunch-heavy scripted run still produces a foreseeable, warned attrition (I-1 fairness intact; echo timing re-validated against the new length).
- [ ] **No-paydown run** integration test: becomes visibly painful by late game but does not soft-lock (I-5).
- [ ] All Inc-1 + Inc-2 harness bars green together (I-9).
- [ ] Determinism + save/resume still exact across the longer run (I-4).

## Technical Specs
- Reuse the Inc-1 full-run integration harness (prompt 18); add debt assertions rather than a parallel test rig.
- The longer run must not dilute the echo — if extension weakens Inc-1's punch, that is a finding to flag and retune, not to paper over (honesty, §2).

## Testing
Integration:
- Debt arc: accrue → compound → paydown recovery, all asserted.
- Echo run: foreseeable warned attrition still occurs in a crunch-heavy run at the new length.
- No-paydown run: painful-not-soft-locked.
- Determinism + mid-run save/resume exact.
- Combined harness bar suite green.

Manual verification checklist:
- [ ] **Play a full Inc-2 run.** Does debt feel like a real tradeoff, and does losing someone still hurt within the longer run? If the echo dilutes, retune before Increment 3.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 3 (incidents) — next increment; do not build here.
