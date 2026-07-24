# 47 — [Inc 6 · MVP] Shielding (Buffer the Team at a Cost to Yourself)

> ⚠ **VALIDATE-FIRST.** Shield cost and efficacy are **decisions-to-validate**: shielding must be *valuable but not free* (PRD §I6.6). Trustworthy only once org-event severity (prompt 46) and standing rates (prompt 45) are settled. Repeated shielding depletes the manager — but the *depletion* (manager burnout) is fully realized in Increment 8; here shielding spends standing/attention.

## Context
Org events apply pressure (46). This prompt adds the invisible work of **buffering**: spending manager capacity/standing to convert org chaos into a cost borne by *the manager* instead of the team. This makes shielding — one of the most thankless real parts of the job — a real, spendable choice, with limits.

Read PRD §I6.2 (shielding), §I6.5, and `CLAUDE.md` §12 (I-2, I-8; manager burnout is Inc 8).

## User Story
As a manager, I want to shield my team from org noise at a cost to myself, so that the invisible work of buffering is a real, spendable choice. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Shielding converts org chaos into a manager cost** (reputation/attention) instead of a team cost (morale) (PRD §I6.2).
- [ ] **Shielding has limits** (PRD §I6.2 edge cases): a manager with depleted standing **can't fully shield**, so the team takes the hit — the "I couldn't protect them" beat.
- [ ] **Repeated shielding depletes the manager** — in Increment 6 this is spent standing/attention; the prompt leaves the explicit **manager-burnout coupling to Increment 8** (do not build manager burnout here, but structure shielding so Inc 8 can attach a burnout vector cleanly, mirroring the Inc-1 attention hook discipline).
- [ ] Shield options + costs come from the OrgEvent data (prompt 46) and tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Shielding spends from the manager's standing/attention — reuse the attention economy (I-2) and the standing tracks (prompt 45). Do not invent a separate shielding resource.
- The "can't fully shield when depleted" behavior is a hard, tested rule — it's the emotional core of the mechanic.
- Leave a clean seam for Inc 8: shielding is a "manager self-spending action," the exact category Inc 8's manager burnout will accrue from.

## Testing
Unit:
- Shielding routes an org hit's cost to the manager (standing/attention) instead of the team (morale).
- A depleted-standing manager cannot fully shield; the team takes the residual hit (the "couldn't protect them" beat).
- Shield costs/efficacy read from OrgEvent data + constants; determinism holds.
- Seam check: shielding is tagged as a manager self-spending action (so Inc 8 can attach burnout without refactor).

Manual verification checklist:
- [ ] Shield the team through several hits, then hit one you can't fully absorb — and feel the team take it because you're spent.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Manager burnout from over-shielding — Increment 8 (prompt 59).
- Standing accrual/decay full tuning — prompt 48.
- Shield decision UI — prompt 49.
