# 49 — [Inc 6 · MVP] View: Manager Panel, Org Event Interrupt & Shield Decision

> ⚠ **VALIDATE-FIRST.** View-only. Confirm the Manager panel makes *you* legible as a character with state without eclipsing the Roster — the team must remain the emotional center (PRD §I6 depends-on: org is a secondary note).

## Context
The manager, standing, org events, and shielding all function in the engine (45–48). Now the thin view surfaces them: the **Manager panel** (making the player legible as a character), the **Org Event interrupt**, and the **Shield decision**. Extends prior views; engine/view wall holds (I-3).

Read PRD §I6.4 (UX additions) and `CLAUDE.md` §12 (I-3, I-7), §7.

## User Story
As a manager, I can see my own standing with team and leadership, respond to org mandates, and choose whether to shield the team or pass a hit down, so that managing up is a legible, spendable part of play.

## Acceptance Criteria
- [ ] **The Manager panel** (PRD §I6.4): a new first-class surface showing the player's standing with team and leadership — making *you* legible as a character with state. Standing is shown at the design's chosen fidelity; the manager's own interior (later burnout) stays fuzzy (I-7).
- [ ] **The Org Event interrupt:** episodic mandate/reorg events with visible choices and costs (from prompt 46).
- [ ] **The Shield decision:** spend your own standing/capacity to protect the team, or let it through (from prompt 47) — with the "can't fully shield when depleted" state shown plainly.
- [ ] The **team (Roster) remains the emotional center** — the Manager panel is a secondary surface, not the headline (PRD §I6 depends-on).
- [ ] All data engine-derived; **no standing/org logic in components** (I-3).
- [ ] Panels-and-numbers, desktop, keyboard-operable, sufficient contrast (§7).

## Technical Specs
- Extend prior views. Manager panel is a new surface; org interrupt reuses the interrupt pattern from Inc-3's Fire Alert; shield decision reuses the choice-interaction pattern.
- Layout keeps the Roster primary; the Manager panel is present but not dominant.

## Testing
Component:
- Manager panel renders team + leadership standing from state; no computation in component.
- Org Event interrupt renders choices + costs; selecting dispatches a response.
- Shield decision renders; depleted-standing state shows the team taking the hit.
- Roster remains visually primary (layout check).
- Architecture check: no standing/org math in components.

Manual verification checklist:
- [ ] Take an org hit: read your standing, choose to shield or pass down, and see the consequence — while the team still feels like the point.
- [ ] `npm test` green.

## Out of Scope
- Episodic branching reorgs — prompt 50.
- Harness org bars + integration — prompt 51.
