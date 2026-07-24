# 33 — [Inc 4 · MVP] Archetype Entity & Differentiated Reactions

> ⚠ **VALIDATE-FIRST.** Do not start Increment 4 until Increments 1–3 are built and played. Archetype modifier magnitudes are **decisions-to-validate**: divergent enough to feel individual, not so divergent that some archetypes are unmanageable (PRD §I4.6). The exact archetype set/count is itself a decision-to-validate (PRD §I4.5). This increment must **deepen people through interaction with existing systems, not overwhelm the now-established juggle** (PRD §I4 depends-on).

## Context
Increments 1–3 are built and played. This begins Increment 4, which turns "named engineers with numbers" into "characters who react like themselves." This prompt adds the **Archetype entity** — data-driven personalities that modulate how existing actions/events affect each engineer's state. Archetypes modulate *magnitudes and directions of existing effects*; they add **no new per-archetype mechanics** (that would be over-modeling, I-8).

Read PRD §I4.2 (personality reactions), §I4.3 (Archetype entity), §I4.5 (fixed set decision), and `CLAUDE.md` §12 (I-6, I-7, I-8).

## User Story
As a manager, I want each engineer to react differently to the same action based on personality, so that they feel like individuals, not reskinned units. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Archetype` entity** (PRD §I4.3): data-driven definition (content, not code, I-6). Contains modifiers it applies to reaction magnitudes/directions across morale, burnout, growth, and relationship formation.
- [ ] **Fixed set, not trait composition** (PRD §I4.5): a small hand-authored set (candidate: workhorse, volatile 10x'er, ambitious junior, quiet flight risk, mentor). Set + count are decisions-to-validate.
- [ ] Each engineer has an archetype that **modulates existing effects** — the same 1:1 lifts the anxious junior more than the stoic senior; crunch breaks the flight-risk faster than the workhorse.
- [ ] **No new mechanics per archetype** (PRD §I4.2 edge case): archetypes only scale/redirect existing morale/burnout/growth/relationship effects.
- [ ] **Every archetype viable to manage, none a trap** (PRD §I4.2) — validated in the harness (prompt 38), but designed for here.
- [ ] **People-reads stay fuzzy** (I-7): archetypes are read qualitatively (the read is archetype-flavored, not a numeric personality stat).
- [ ] Modifiers read from archetype data (I-6); deterministic (I-4).

## Technical Specs
- Archetype modifiers wrap the Inc-1 people-model functions (prompt 07): the reaction functions take the engineer's archetype and scale/redirect their output. Do not duplicate the people model per archetype.
- `Engineer` gains an archetype reference (PRD §I4.3 Engineer changed); it serializes.
- Assign archetypes at new-run construction (extend prompt 04) via seeded RNG.

## Testing
Unit:
- The same action produces different morale/burnout deltas for different archetypes (individuality).
- Archetypes modulate only existing effects — no archetype introduces a new mechanic (structural check).
- Every archetype is manageable (no archetype makes an engineer impossible to keep under reasonable play — sampled).
- People-reads remain fuzzy and become archetype-flavored.
- Modifiers read from data; determinism holds.

Manual verification checklist:
- [ ] Run a 1:1 on an anxious junior vs a stoic senior: the junior lifts more; the reads feel like different people.
- [ ] `npm test` green; all prior harness bars green (I-9).

## Out of Scope
- Growth/leveling — prompt 34.
- Relationships — prompt 35.
- Contagion — prompt 37.
- Detail-view UI — prompt 36.
