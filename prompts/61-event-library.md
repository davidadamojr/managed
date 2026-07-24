# 61 — [Inc 8 · MVP] Expanded Categorized Event Library

> ⚠ **VALIDATE-FIRST.** The **target count per category** is a content-planning **decision-to-validate** — enough for a full campaign to feel varied and non-repetitive (PRD §I8.5, §I8.6: "library must not repeat noticeably within a campaign"). Since campaigns are now long (Inc 5–7), the count needed is only knowable against actual campaign length.

## Context
Manager burnout and its signature effect are in (59–60). This prompt expands the game's soul-carrying content: a **substantially larger, categorized, data-driven event library** with richer branching and multi-system effects. Content, never code (I-6) — from Inc-1's tiny set to Inc-8's large library.

Read PRD §I8.2 (event library), §I8.3 (Event expanded), §I8.5, and `CLAUDE.md` §12 (I-6).

## User Story
As a manager, I want a rich library of events across personal, org, technical, and interpersonal categories, so that runs feel varied, specific, and alive. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] The event set is **substantially expanded and categorized** (PRD §I8.3): **personal / org / technical / interpersonal**, drawing from a data-driven set with richer branching and consequences that **ripple through all existing systems** (people, debt, incidents, standing, peers).
- [ ] Event definitions gain **richer preconditions and multi-system effects** (PRD §I8.3) — still pure data (I-6).
- [ ] **Target count per category** sufficient for a full (long) campaign to feel varied and non-repetitive (PRD §I8.5) — the count is a decision-to-validate against campaign length; the harness checks non-repetition (prompt 65).
- [ ] Events **respect current state** (precondition-gated; the incoherence guard is prompt 63) — no firing an event that contradicts state.
- [ ] The library remains **content, never code** (I-6, locked): no event logic hardcoded in the engine; the engine interprets event data.
- [ ] Event selection is deterministic (I-4).

## Technical Specs
- Extend the Inc-1 data-driven event mechanism and the Inc-6 OrgEvent branching schema into a single coherent categorized event schema. Do not fork per category — one schema, a category field.
- Multi-system effects reference existing systems by their established contracts (§5) — events are data that *triggers* existing mechanics, not new mechanics.
- Preconditions are declarative data evaluated by the engine.

## Testing
Unit:
- Events exist across all four categories, each meeting its target count.
- Events are precondition-gated and produce multi-system effects through existing contracts.
- The library is pure data (no hardcoded event logic — structural check).
- Event selection is deterministic.

Manual verification checklist:
- [ ] Play a long run: events feel varied and specific across categories, touching people/debt/incidents/org/peers.
- [ ] `npm test` green; prior harness bars green (I-9).

## Out of Scope
- Voice/tone pass — prompt 62.
- Data-validation (incoherence) pass — prompt 63.
- Rich event presentation — prompt 64.
- Non-repetition harness bar — prompt 65.
