# 23 — [Inc 2 · MVP] View: Debt Meter & Paydown in Backlog

> ⚠ **VALIDATE-FIRST.** View-only; no parameters here. But confirm the Inc-1 view still reads cleanly with the added surface — the Debt Meter must not crowd out the Roster/Backlog that carry the core juggle.

## Context
Debt legibility data exists in the summary and main state (22). Now the thin view renders it: the **Debt Meter** on the main run surface and in the summary, and **paydown as an assignable target** in the backlog, visibly trading against feature work. This extends the Inc-1 view (prompts 13–14) and must hold the engine/view wall (I-3) — no debt math in components.

Read PRD §I2.4 (UX additions) and `CLAUDE.md` §12 (I-3 engine/view wall), §7 (preference translation: panels/numbers, desktop, keyboard).

## User Story
As a manager, I can see debt as a readable meter with its velocity drag, and assign engineers to paydown right in the backlog, so that the short-term-vs-long-term tradeoff is visible and actionable.

## Acceptance Criteria
- [ ] **The Debt Meter** appears in the main view and the Sprint Summary, showing level, trend, and current velocity drag in plain language (all from prompt 22 data — the view computes none of it).
- [ ] **Paydown appears in the Backlog** as an assignable target alongside feature tickets, visibly trading against them (assigning an engineer to paydown is the same interaction as assigning to a ticket — reuse Inc-1 assignment UI).
- [ ] The primary flow works end-to-end via UI: see debt in the red → assign engineers to paydown → resolve → summary shows recovery.
- [ ] Panels-and-numbers only; desktop; keyboard-operable (assign paydown, read meter); sufficient contrast (§7).
- [ ] **No debt logic in components** (I-3): level, penalty, trend, projection all come from engine-produced state.

## Technical Specs
- Extend the Inc-1 view; do not fork it. The Debt Meter is a new readable element; paydown is a new backlog target type rendered by the existing backlog list.
- Follow the `frontend-design` skill for baseline structure, but do not over-style — Inc 2 is still panels-and-numbers (art is Increment 9).

## Testing
Component:
- Debt Meter renders level/trend/drag from supplied state; no computation in the component.
- Backlog renders paydown as an assignable target; assigning dispatches the same action shape as feature assignment.
- Summary renders debt fields + projected benefit after a paydown sprint.
- Architecture check: no penalty/trend math in any component.

Manual verification checklist:
- [ ] Play a full Inc-2 sprint through the UI: debt visible, paydown assignable, recovery legible.
- [ ] Keyboard-only paydown assignment works.
- [ ] `npm test` green.

## Out of Scope
- Harness bars + retune + integration — prompts 24–25.
- Any art/theming — Increment 9.
