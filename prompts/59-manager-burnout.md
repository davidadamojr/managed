# 59 — [Inc 8 · MVP] Manager Burnout (Second Cash-In of the Attention Hook)

> ⚠ **VALIDATE-FIRST.** Do not start Increment 8 until Increment 7 is built and played. Manager-burnout accrual rates and the attention-capacity penalty curve are **decisions-to-validate**. **Manager burnout must be recoverable and foreseeable** — a poignant spiral you can pull out of, not a trap (PRD §I8.5, I-1 applied to the player). This is the **second cash-in of the depletable-attention hook (I-2)** — verify the hook (cashed for standing in Inc 6) accepts a burnout term cleanly.

## Context
Increments 1–7 are built and played; the whole system works in raw form. This begins Increment 8, which lands the truest emotional note the design has built toward: **manager burnout** — the person absorbing everyone else's chaos has no one absorbing theirs. This prompt activates the `Manager.burnout` field (reserved since Inc 6) and makes it **reduce attention capacity** via the §4.3 hook (I-2), sitting directly on the Inc-6 Manager entity and the Inc-1 hook.

Read PRD §I8.2 (manager burnout), §I8.3 (Manager changed), §I8.5, and `CLAUDE.md` §12 (I-1 fairness for the player, I-2 second payoff).

## User Story
As a manager, I want my own finite attention to deplete when I over-shield, over-firefight, and over-invest in a collapsing team, so that the cost of absorbing everyone's chaos falls on me, too. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Manager burnout activates** (PRD §I8.3): accrues from sustained **over-shielding** (Inc 6), heavy **firefighting** (Inc 3), and **over-investment in failing situations** — the manager self-spending actions seamed in earlier (esp. prompt 47).
- [ ] **Reduces attention capacity** via `attentionCapacityFor(manager)` (I-2, the §4.3 hook) — the **second cash-in**. High manager burnout shrinks the attention pool, so a fried manager can do less for the team (a self-inflicted spiral).
- [ ] **Recoverable** (PRD §I8.5, non-negotiable): stepping back (not shielding, easing off firefighting) restores capacity — it must not be an unfixable death spiral.
- [ ] **Foreseeable** (I-1 applied to the player, PRD §I8.2): a read on the manager's own state precedes the spiral, mirroring the engineers' fairness guarantee. The player is warned about themselves.
- [ ] **The player can choose *not* to shield** to preserve themselves (PRD §I8.2) — the poignant real choice.
- [ ] Accrual rates + capacity-penalty curve read from tuning constants (I-6); deterministic (I-4); recovery rate tunable.

## Technical Specs
- Activate the reserved `Manager.burnout` field (Inc 6 prompt 45). Wire accrual to the manager self-spending actions already tagged in Inc 6 (prompt 47's seam) plus firefighting (Inc 3) and over-investment.
- The capacity penalty composes into `attentionCapacityFor(manager)` alongside the Inc-6 standing term — the hook now reads *both* standing and burnout. Add a test that burnout shrinks capacity.
- Recovery is the inverse: easing off self-spending reduces burnout over sprints.

## Testing
Unit:
- Sustained over-shielding/firefighting/over-investment accrues manager burnout.
- Manager burnout reduces attention capacity via the hook (second cash-in verified).
- Easing off recovers capacity (recoverable — no unfixable spiral).
- A read on the manager's own state precedes the spiral (foreseeable — I-1 for the player).
- Choosing not to shield preserves the manager (the real choice exists).
- Rates/curve/recovery read from constants; determinism holds.

Manual verification checklist:
- [ ] Shield through everything for many sprints: watch your own capacity shrink, get the warning, then pull out of it by easing off.
- [ ] `npm test` green; all prior harness bars green (I-9), especially the attention hook now reading standing + burnout.

## Out of Scope
- Degraded reads under burnout — prompt 60.
- Event library expansion — prompt 61.
- Voice/tone — prompt 62.
- Manager state read UI — prompt 63.
