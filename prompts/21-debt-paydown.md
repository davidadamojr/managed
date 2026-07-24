# 21 — [Inc 2 · MVP] Debt Paydown (Assignable Work Target)

> ⚠ **VALIDATE-FIRST.** Paydown efficiency per capacity unit is a **decision-to-validate**: paydown must produce a *legible, satisfying recovery* (harness bar, prompt 24) without being so cheap it removes the tradeoff. Only trustworthy once Inc-1 capacity/throughput and prompt-20's penalty curve are settled.

## Context
Debt accrues (19) and drags velocity (20). Now the player gets the lever to fight it: **paydown**, modeled as an assignable work target that competes for the same capacity as feature/roadmap work. Spending capacity here ships nothing this sprint but reduces future drag — the canonical "invisible work made legible" tradeoff.

Read PRD §I2.2 (debt paydown), §I2.3 (Ticket changed), and §I2.5 (paydown costs capacity, not attention).

## User Story
As a manager, I want to allocate capacity to paying down debt instead of shipping features, so that I face the core tradeoff of short-term output versus long-term health. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Ticket` gains a type** distinguishing *feature* work (advances backlog/roadmap) from *paydown* work (reduces `TechDebt`) (PRD §I2.3). A paydown allocation is an assignable work target competing for the same engineer capacity as features.
- [ ] Assigning engineer capacity to paydown **reduces debt** proportional to skill-fit and capacity assigned, on resolution.
- [ ] **Paydown costs capacity, not attention** (PRD §I2.5) — it belongs to the assignment/juggle economy, keeping the two economies distinct. Do not deduct attention for paydown.
- [ ] The system **never auto-schedules** paydown. Assigning zero paydown across a whole run is a **legal (and eventually punishing) strategy** (PRD §I2.2).
- [ ] Paydown **competes with the backlog and roadmap** — it is meant to hurt in the moment (shipping nothing now).
- [ ] Paydown efficiency comes from **tuning constants** (I-6); deterministic (I-4).

## Technical Specs
- Reuse the Inc-1 assignment model (prompt 05): a paydown target is just another assignable work item, so the juggle UI and logic treat it uniformly. Do not build a parallel assignment path.
- Debt reduction is applied in the tick's work-resolution step, symmetric with feature progress but decreasing debt instead of advancing a ticket.
- Skill-fit still matters (a debugging/infra-fit engineer pays down more efficiently, if the design says so — parameterize, don't hardcode).

## Testing
Unit:
- A paydown allocation reduces debt proportional to skill-fit × capacity.
- Paydown deducts **capacity** (the engineer isn't shipping features that sprint), not attention.
- Zero-paydown for a whole run is legal (no error, no auto-schedule) and leaves debt to compound.
- Paydown competes with features: assigning to paydown means those engineers don't advance roadmap tickets.
- Efficiency reads from tuning constants; determinism holds.

Integration:
- A sprint of heavy paydown ships little but measurably lowers debt and eases next sprint's penalty.

Manual verification checklist:
- [ ] Assign two engineers to paydown: roadmap slips, debt drops, next sprint's velocity recovers.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- The projected-benefit copy and Debt Meter — prompts 22–23.
- Per-area debt / targeted paydown — deferred.
