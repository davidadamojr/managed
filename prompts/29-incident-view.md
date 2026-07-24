# 29 — [Inc 3 · MVP] View: Incident Banner / Fire Alert & Triage Decision

> ⚠ **VALIDATE-FIRST.** View-only. Confirm the interrupt reads as urgent without breaking the panels-and-numbers legibility of the core juggle; the Fire Alert is the "visual heartbeat" of the chaos engine but must not swamp the Roster/Backlog.

## Context
Incidents generate, resolve, and couple to debt (26–28). Now the thin view surfaces them: the **Incident Banner / Fire Alert** interrupt and the **Triage decision** where the player reallocates capacity from plan to fire. Extends the Inc-1/Inc-2 view; holds the engine/view wall (I-3).

Read PRD §I3.4 (UX additions) and `CLAUDE.md` §12 (I-3), §7 (translation).

## User Story
As a manager, I can see an erupting incident, its severity, and what it needs, and reallocate an engineer onto it, so that I feel and manage the chaos in real time.

## Acceptance Criteria
- [ ] **The Incident Banner / Fire Alert:** a prominent interrupt in the sprint surface communicating the incident, its severity, and what it needs (skill + capacity demand) — the visual heartbeat of the chaos engine (PRD §I3.4).
- [ ] **The Triage decision:** the interaction where the player pulls an engineer off planned work onto the fire (reusing Inc-1 assignment interaction), or chooses to under-respond / ignore.
- [ ] The banner reflects engine-produced incident state; consequences of the choice show in the summary (from prompt 27) — the view computes no resolution.
- [ ] Panels-and-numbers, desktop, keyboard-operable (accept triage, choose target, ignore), sufficient contrast (§7).
- [ ] **No incident logic in components** (I-3).

## Technical Specs
- Extend the Inc-1/Inc-2 view; the Fire Alert is a new interrupt element, triage reuses the assignment UI.
- Urgency is conveyed with layout/emphasis, not animation polish (art is Increment 9).

## Testing
Component:
- Fire Alert renders incident severity + required skill + capacity demand from supplied state.
- Triage dispatches a capacity reallocation (same action shape as assignment); ignore is a valid path.
- Summary renders incident outcomes after resolve.
- Architecture check: no resolution/consequence math in components.

Manual verification checklist:
- [ ] Play a sprint where a fire erupts: alert reads clearly, triage works, consequences show.
- [ ] Keyboard-only triage works.
- [ ] `npm test` green.

## Out of Scope
- Silent-success beat — prompt 30.
- On-call — prompt 31.
- Harness + retune + integration — prompt 32.
