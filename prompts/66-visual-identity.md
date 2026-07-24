# 66 — [Inc 9 · MVP] Visual Identity Across All Named Surfaces

> ⚠ **VALIDATE-FIRST.** Do not start Increment 9 until Increments 1–8 are built and played and the whole game is proven fun in raw form — this is the locked **"polish last"** principle (PRD §I9 depends-on). **Nothing in this increment changes simulation behavior** (I-3). There are no simulation parameters to validate here; the validation is qualitative — does it *look and feel* as good as it plays?

## Context
Increments 1–8 are built and played; the whole system is proven fun in raw panels-and-numbers form. This begins Increment 9, the final increment: make it *look and feel* as good as it plays. This first prompt applies a **coherent visual identity to every named surface** — the point where "panels and numbers" becomes a finished-feeling game. The engine/view wall holds absolutely (I-3); no simulation logic moves into the UI.

Read PRD §I9.2 (visual & UX polish), §I9.4, and `CLAUDE.md` §12 (I-3 — this is where the wall is most tested), §7. Read the `frontend-design` skill before building.

## User Story
As a player, I want a polished, readable, characterful interface, so that the game is a pleasure to look at and use, not just to think about. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] A **coherent visual design** is applied to every named surface (PRD §I9.2): Roster, Backlog, Roadmap Bar, Attention Tray, Debt Meter, Incident Banner, Manager panel, Peer Board, Sprint Summary, Post-Mortem.
- [ ] **The engine/view wall holds** (I-3, locked, PRD §I9.2): polish lives entirely in the view layer; **no simulation logic moves into UI**. The whole port strategy (prompt 70) depends on this.
- [ ] **No simulation behavior changes** (PRD §I9.2): the same seeded run produces the same outcomes before and after the visual pass — a determinism regression test proves it.
- [ ] Readability is preserved or improved — the fuzzy people-reads, at-risk warnings, and all the legibility surfaces stay clear (I-1, I-7 unaffected).
- [ ] Desktop; keyboard-operable throughout; WCAG AA contrast (§7).

## Technical Specs
- Follow the `frontend-design` skill for a distinctive, intentional visual direction — avoid templated defaults.
- All state still comes from the engine; components remain rendering-only. Add a test/architecture check that no new logic entered components during the visual pass.
- Determinism regression: a seeded run's outcome hash is identical pre/post visual pass.

## Testing
Component:
- Every named surface renders with the coherent visual identity from engine state.
- Architecture check: no simulation logic in any component after the pass.

Integration:
- Determinism regression: identical seeded-run outcomes before/after the visual pass (proves no behavior change).

Manual verification checklist:
- [ ] The game looks finished and reads clearly; nothing about how it *plays* changed.
- [ ] Keyboard-only navigation works across all surfaces; contrast passes AA.
- [ ] `npm test` + full harness green (I-9 — all bars, since behavior is unchanged).

## Out of Scope
- UI framework decision + save format — prompt 67.
- Engineer portraits — prompt 68.
- Moment-of-weight feedback — prompt 69.
- Unity eval — prompt 70.
