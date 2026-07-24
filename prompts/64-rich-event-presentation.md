# 64 — [Inc 8 · polish] Rich Event Presentation (Primary Narrative/Comedy Surface)

> ⚠ **VALIDATE-FIRST.** View-oriented; still panels-and-numbers (visual art is Increment 9). Confirm the richer event presentation carries the comedy without obscuring legibility (I-7) — flavor amplifies, never buries, the signal.

## Context
The library is large, voiced, and validated (61–63). This polish prompt makes **events the primary narrative/comedy surface** — well-presented so the writing lands, while staying within Inc-8's still-unstyled panels-and-numbers (visual identity is Increment 9). This is presentation of *text*, not art.

Read PRD §I8.4 (content-rich event presentation) and `CLAUDE.md` §12 (I-3, I-7), §8.

## User Story
As a manager, I want the recognizable absurdities of tech-org life rendered specifically and presented well, so that authenticity earns the comedy. `[ENHANCE]`

## Acceptance Criteria
- [ ] Events are presented as the **primary narrative/comedy surface** (PRD §I8.4): the voiced text (prompt 62) is given room to land — good typography of *content*, clear framing of choices and consequences.
- [ ] **Legibility preserved** (I-7): the presentation amplifies the writing without obscuring the numbers/reads the player needs.
- [ ] Still **panels-and-numbers** — no visual art/theming yet (that's Increment 9); this is layout and text presentation only.
- [ ] Engine-derived content; **no event logic in components** (I-3).
- [ ] Keyboard-operable, desktop, sufficient contrast (§7).

## Technical Specs
- Extend the event interrupt/summary presentation; give voiced text and choices clear structure. Reuse existing interrupt/choice components.
- Resist scope creep into Increment 9 art — this is text presentation, not visual identity.

## Testing
Component:
- Events render voiced text + choices + consequences clearly, from engine state.
- Legibility check: required numbers/reads remain clearly present alongside the flavor.
- Architecture check: no event logic in components.

Manual verification checklist:
- [ ] Read events in play: the comedy lands, the choices are clear, and you never lose track of the mechanics.
- [ ] `npm test` green.

## Out of Scope
- Visual art/identity — Increment 9.
- Harness bars + integration — prompt 65.
