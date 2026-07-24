# 36 — [Inc 4 · MVP] Growth & Relationship Legibility + Expanded Detail View

> ⚠ **VALIDATE-FIRST.** View + summary derivation; no core parameters. Confirm the deepened Engineer Detail view doesn't bury the fuzzy at-risk warning that the fail state depends on (I-1) — legibility of *risk* must stay primary.

## Context
People are individual (33), grow (34), and relate (35). Now make the compounding reward **legible**: growth/level-ups surfaced as a satisfying beat, relationships shown as fuzzy hints, and the Engineer Detail view deepened into a character surface. Engine derives the reads; the view displays (I-3).

Read PRD §I4.2 (growth legible), §I4.4 (UX additions), and `CLAUDE.md` §12 (I-1 fairness stays primary, I-3, I-7).

## User Story
As a manager, I want growth to be legible — to see an engineer leveling up because of my investment — so that the compounding reward for gardening humans is visible and satisfying. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Growth surfacing in the Sprint Summary:** level-ups and growth progress appear as a satisfying, legible reward beat (PRD §I4.4).
- [ ] **Expanded Engineer Detail view:** shows archetype-flavored read, growth progress, and key relationships — deepening the person into a character (PRD §I4.4).
- [ ] **Relationship hints:** fuzzy indications of strong pairings or friction (I-7), consistent with qualitative people-reads.
- [ ] **The at-risk warning stays primary** (I-1): the deepened detail view and richer summary must not bury or de-emphasize the fuzzy at-risk read the fail state depends on. Risk legibility is non-negotiable.
- [ ] All reads/beats are engine-derived (extends Inc-1 summary derivation, prompt 10); **no derivation in components** (I-3).
- [ ] Panels-and-numbers, desktop, keyboard-operable, sufficient contrast (§7).

## Technical Specs
- Extend the Inc-1 summary derivation and Engineer Detail view; do not fork. Growth/relationship reads are new fields on the derived summary/detail data.
- Keep the at-risk warning visually prioritized — a deliberate layout constraint, since more information now competes for the player's attention.

## Testing
Unit:
- Summary includes growth progress + level-up beats.
- Detail data includes archetype-flavored read, growth, key relationships — all fuzzy where they're people-reads.
- At-risk warning remains present and prioritized in the derived summary.

Component:
- Detail view renders the deepened character surface; growth beat renders in summary; relationship hints render fuzzily.
- At-risk warning is not buried by the added detail.
- Architecture check: no derivation math in components.

Manual verification checklist:
- [ ] A coached junior's level-up reads as "something I built"; an at-risk engineer's warning is still the first thing you notice.
- [ ] `npm test` green.

## Out of Scope
- Contagion — prompt 37.
- Harness + retune + integration — prompt 38.
