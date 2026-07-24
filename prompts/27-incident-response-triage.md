# 27 — [Inc 3 · MVP] Incident Response & Triage

> ⚠ **VALIDATE-FIRST.** Consequence magnitudes for neglect and capacity-demand-per-severity are **decisions-to-validate**: incidents must *meaningfully disrupt without making planning pointless* (harness bar, prompt 32). Trustworthy only once Inc-1/Inc-2 baseline pressure is settled.

## Context
Incidents erupt (26). Now the player must respond: divert engineer capacity to a fire (pulling them off planned/roadmap work) or under-respond and accept consequences. This is the real-time triage that makes incidents a *juggle*, not a side-channel — they consume the **same** engineer capacity as planned work.

Read PRD §I3.2 (incident response), §I3.3 (Incident consumes same capacity), and `CLAUDE.md` §12 (I-5 fail-axis).

## User Story
As a manager, I want incidents to pull engineers off their planned work, so that responding has a real opportunity cost against the roadmap. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Divert capacity:** the player can pull an engineer off planned/paydown/roadmap work onto an incident (reducing that engineer's planned throughput this sprint — flagged "pulled to incident").
- [ ] **Resolution:** the system resolves the incident based on assigned skill-fit and capacity; unresolved/under-resourced incidents inflict **escalating consequences** (morale hit, debt increase, roadmap slip) per the incident's `consequence-if-unresolved`.
- [ ] **Shared scarcity:** incidents consume the same capacity pool as planned work (PRD §I3.3 key constraint) — diverting to a fire means the roadmap feature that engineer would have advanced now slips.
- [ ] **No-matching-skill crisis:** an incident requiring a skill no available engineer has is deliberately possible ("we have no one who knows that system") and resolves *poorly but not fatally* (I-5 — incidents don't directly end the run).
- [ ] **Ignoring an incident entirely is legal and consequential.**
- [ ] Consequence magnitudes + capacity demands read from tuning constants / incident data (I-6); deterministic (I-4).

## Technical Specs
- Reuse the Inc-1 assignment/capacity model: incident response is a capacity allocation, so it flows through the same juggle economy (like paydown in Inc 2). Do not build a parallel capacity system.
- Consequences apply in the tick's resolution step; a fire that increases debt loops back into Inc-2's compounding (and thus future incident probability — the loop closes in prompt 28).
- Incidents never set `status: 'failed'` directly (I-5).

## Testing
Unit:
- Diverting an engineer to a fire reduces their planned throughput; the roadmap feature slips accordingly.
- A well-resourced, good-fit response resolves the incident; an under-resourced one escalates with the declared consequences.
- No-matching-skill incident resolves poorly, not fatally.
- Ignoring an incident applies its unresolved consequences and does not end the run.
- Magnitudes/demands read from data; determinism holds.

Manual verification checklist:
- [ ] Pull the best backend engineer onto a sev-1: fire handled, but the roadmap feature they'd have shipped slips.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Debt↔incident coupling tuning + perceptibility — prompt 28.
- Silent-success beat — prompt 30.
- On-call — prompt 31.
- Incident UI — prompt 29.
