# 45 — [Inc 6 · MVP] Manager Entity Promoted to First-Class (Attention Hook Cashed)

> ⚠ **VALIDATE-FIRST.** Do not start Increment 6 until Increments 1–5 are built and played. The org layer is a **secondary emotional note under the primary juggle+people core and must not eclipse it** (PRD §I6 depends-on). Standing accrual/decay rates are **decisions-to-validate**. **This is where the depletable-attention hook (I-2), built in Increment 1, finally pays off** — verify the Inc-1 forward-hook code path was preserved before relying on it here.

## Context
Increments 1–5 are built and played; the people core is complete and survivable. This begins Increment 6, which introduces the world *above* the manager and — structurally important — **makes the manager a modeled character**. This prompt promotes the `Manager` entity (a container since Inc 1, prompt 03) to first-class, with **team standing** and **leadership standing**, and **finally makes attention capacity a live function of manager state** (I-2, cashing the hook).

Read PRD §I6.2 (reputation), §I6.3 (Manager entity), §I6.5 (decisions), and `CLAUDE.md` §12 (I-2 the payoff, I-5 fail-axis, I-7).

## User Story
As a manager, I want standing with my team and standing with leadership that evolve with how I treat them and how I deliver, so that my past choices change how much each will give me now. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Manager` entity promoted to first-class** (PRD §I6.3): contains team standing, leadership standing, and (reserved for Inc 8) manager burnout. It already existed as an inert container since Inc 1 — this activates its fields.
- [ ] **The attention hook is cashed** (I-2): `attentionCapacityFor(manager)` now actually reads manager state (rather than returning a bare constant). **Verify the Inc-1 hook was preserved** — if attention was ever hardcoded, that is a regression to fix here first.
- [ ] **Team standing:** raised by shielding/recognition/delivering-on-promises, lowered by repeated crunch and broken commitments; **modulates how much the team responds** to the manager's asks (high-standing crunch request costs less morale; low-standing manager is believed less) (PRD §I6.2).
- [ ] **Leadership standing:** raised by reliable delivery, lowered by missed commitments; **gates headcount, autonomy, protection** during reorgs (PRD §I6.2).
- [ ] **Both standings slow-moving** (like burnout, for the manager) — can't be bought back instantly (PRD §I6.2, §I6.5).
- [ ] **Leadership standing must be earnable through human-sustainable delivery, not only crunch** (PRD §I6.2, §I6.5) — otherwise the org layer re-incentivizes the exact behavior the game condemns (I-5 spirit).
- [ ] Standing rates read from tuning constants (I-6); deterministic (I-4); Manager serializes with active fields.

## Technical Specs
- This is the architectural payoff prompt. The single most important check: attention capacity flows through `attentionCapacityFor(manager)` and manager state now changes it. Add a test proving standing (later burnout) modulates capacity.
- Standing modulates existing mechanics (morale cost of crunch, headcount access) — it does not add new per-standing subsystems (I-8).
- Keep standing dual-track and capable of *conflicting* (pleasing leadership by crunching spends team standing) — the tension is the org layer's core fun (prompt 48 develops it).

## Testing
Unit:
- `attentionCapacityFor(manager)` reads manager state (regression test: it is NOT a bare constant).
- High team standing lowers the morale cost of a crunch ask; low standing raises it.
- Leadership standing gates a headcount/protection perk at a threshold.
- Both standings move slowly and can't be restored instantly.
- Leadership standing is reachable via sustainable delivery (a no-crunch scripted run can still earn it) — guards against re-importing the crunch incentive.
- Rates read from constants; determinism + serialization hold.

Manual verification checklist:
- [ ] Build team standing by shielding/recognizing, then spend it on a crunch ask that's forgiven — and feel the well thinning.
- [ ] `npm test` green; all prior harness bars green (I-9), especially Inc-1 echo/fairness with attention now manager-modulated.

## Out of Scope
- Org events / mandates — prompt 46.
- Shielding — prompt 47.
- Manager burnout — Increment 8 (the entity reserves the field; do not activate burnout here).
- Manager panel UI — prompt 49.
