# 46 — [Inc 6 · MVP] Org Pressure & Mandates (OrgEvent Entity)

> ⚠ **VALIDATE-FIRST.** Org-event frequency and severity are **decisions-to-validate** — the org layer must pressure without eclipsing the core juggle+people loop (PRD §I6 depends-on). Trustworthy only once the Manager entity + standing (prompt 45) are settled.

## Context
The manager is now a modeled character with standing (45). This prompt adds the **force from above**: data-driven org events (priority changes, imposed deadlines, hiring freezes, reorgs) that the manager must absorb or pass through to the team. This is the source of org narrative and dark comedy.

Read PRD §I6.2 (org pressure & mandates), §I6.3 (OrgEvent entity), and `CLAUDE.md` §12 (I-4, I-5, I-6).

## User Story
As a manager, I want leadership to change priorities, impose deadlines, and trigger reorgs, so that org chaos becomes a force I have to absorb or pass through to my team. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`OrgEvent` entity** (PRD §I6.3): data-driven; contains the pressure it applies, the shield options and their costs (shielding is prompt 47), and downstream consequences.
- [ ] Org events **fire from a data-driven set** (I-6) via seeded RNG (I-4): priority changes, imposed deadlines, hiring freezes, reorgs.
- [ ] The player can **respond**: absorb the hit, shield the team (prompt 47), or comply and pass it down.
- [ ] **Cruel couplings are possible** (PRD §I6.2 edge cases): a hiring freeze mid-recovery (couples to Increment 5's pipeline) is a deliberate cruelty the system can deploy; a mandate shift can **invalidate roadmap work already in progress** (the "we're pivoting" gut-punch).
- [ ] Org events **never directly end the run on a metric** (I-5) — they apply pressure and consequences routed through team morale / manager standing, and can only contribute to a run's end via the human-outcome fail state (Inc 5).
- [ ] Frequency/severity read from tuning constants (I-6); events serialize.

## Technical Specs
- OrgEvent generation slots into the tick's fixed order at a documented point (e.g. alongside incident/event firing). Reuse the data-driven event mechanism (Inc 1) — org events are a category of data-driven event, not a new pipeline.
- A hiring-freeze org event reads/affects the Inc-5 `HiringPipeline`; a pivot invalidates in-progress roadmap tickets — both are couplings to existing systems.

## Testing
Unit:
- Org events fire from data via seeded RNG; same seed ⇒ same events.
- A hiring-freeze event blocks pipeline advancement (couples to Inc 5).
- A pivot event invalidates in-progress roadmap work.
- Org events route consequences through morale/standing, never a direct metric fail (I-5).
- Frequency/severity read from constants; serialization holds.

Manual verification checklist:
- [ ] Get hit with a mid-recovery hiring freeze and a pivot: feel the org chaos land on a plan you'd carefully made.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Shielding mechanic — prompt 47.
- Standing accrual detail — prompt 48.
- Org event UI — prompt 49.
- Episodic branching reorgs — prompt 50.
