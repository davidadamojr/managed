# 26 — [Inc 3 · MVP] Incident Entity & Generation

> ⚠ **VALIDATE-FIRST.** Do not start Increment 3 until Increments 1–2 are built and played. Incident frequency and severity are tuned **against how tight the juggle already feels** (PRD §I3 depends-on): you cannot set disruption levels until baseline pressure (capacity scarcity + debt drag) is known, or incidents feel trivial or crush the run. Every rate here is a **decision-to-validate** against settled Inc-1/Inc-2 pressure.

## Context
Increments 1–2 are built and played. This begins Increment 3, the juggle's chaos engine: unplanned work that erupts mid-plan and pulls capacity off what the player intended. This prompt adds the **Incident entity** and **data-driven, seeded generation** with debt-weighted probability and an anti-frustration per-sprint cap.

Read PRD §I3.2 (incident generation), §I3.3 (Incident entity), §I3.5 (decisions), and `CLAUDE.md` §12 (I-4 determinism, I-5 fail-axis, I-6 content-as-data).

## User Story
As a manager, I want incidents to erupt during a sprint and demand immediate attention, so that my careful plan gets disrupted and I feel the chaos of the job. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Incident` entity** (PRD §I3.3): data-driven, drawn from a defined set; belongs to the active sprint; contains severity, required skill, capacity demand, and consequence-if-unresolved.
- [ ] **Generation on tick:** may fire one or more incidents via seeded RNG (I-4), with probability **raised by current debt** (couples to Increment 2).
- [ ] **Per-sprint cap** (PRD §I3.5): rate-limited so a debt-heavy run can't be instantly buried — chaos pressures, doesn't grief. Cap is a tuning constant.
- [ ] **Baseline chaos is never zero:** a debt-free team still faces a low baseline incident rate.
- [ ] Incidents are **content, not code** (I-6): the set lives in data files, like Inc-1 events.
- [ ] Determinism: same seeded run ⇒ identical incidents fired.
- [ ] Serialization round-trip includes active incidents.

## Technical Specs
- Incident generation slots into the tick's fixed order at a documented point (e.g. after work resolution / alongside event firing) without reordering existing steps.
- Reuse the Inc-1 data-driven event mechanism pattern where possible — incidents are a specialized data-driven interrupt, not a wholly new content pipeline.
- Debt-weighting reads the Inc-2 `TechDebt` level; keep the coupling perceptible-not-deterministic (full coupling logic in prompt 28, but generation reads debt here).

## Testing
Unit:
- Incidents fire from the data set via seeded RNG; same seed ⇒ same incidents.
- Higher debt raises incident probability (statistically across seeds).
- Per-sprint cap holds: never more than the cap in one sprint.
- Debt-free baseline rate > 0 (chaos never zero).
- Incident set is data (no hardcoded incidents in engine logic).
- Serialization includes active incidents.

Manual verification checklist:
- [ ] A high-debt run sees more fires than a clean one, but never an unmanageable pile in one sprint.
- [ ] `npm test` green; all Inc-1/Inc-2 harness bars still green (I-9).

## Out of Scope
- Response / triage — prompt 27.
- The full debt↔incident coupling tuning — prompt 28.
- On-call — prompt 31.
- Incident UI — prompt 29.
