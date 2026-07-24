# 34 — [Inc 4 · MVP] Growth / Leveling (Coaching + Stretch)

> ⚠ **VALIDATE-FIRST.** Growth rate and stretch-assignment risk/reward are **decisions-to-validate**: growth must be *earned-not-grindy within a run* (PRD §I4.6). Trustworthy only once run length (extended in Inc 2) and the attention economy feel are settled.

## Context
Archetypes make people individual (33). Now investing in them must pay off: engineers **grow skills over time** when the manager invests via coaching (attention) and stretch assignments (assigning slightly-above-skill work). This makes good long-term management compound — the emotional payoff of "gardening humans." Growth deliberately touches **both economies** (attention and assignment) so investing is woven through the whole loop, not a side menu (PRD §I4.5).

Read PRD §I4.2 (growth/leveling), §I4.3 (Engineer changed — growth per skill), §I4.5, and `CLAUDE.md` §12.

## User Story
As a manager, I want engineers to grow skills over time when I invest in them, so that good long-term management compounds into a stronger team. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Growth via attention:** a coaching/mentorship attention action accrues growth toward skill level-ups (extends the Inc-1 action set — coaching is a new attention action, or 1:1 gains a coaching facet; keep the action set disciplined, I-8).
- [ ] **Growth via stretch assignment:** assigning slightly-above-skill work accrues growth, at the cost of **slightly worse throughput now** (a small echo of the core tradeoff — growth later for output now) (PRD §I4.2).
- [ ] `Engineer` gains **growth progress per skill** (PRD §I4.3); skills now change over time; level-ups surface in the summary (prompt 36).
- [ ] **Gradual, earned-not-grindy** (PRD §I4.2): growth feels earned within a longer run, not a grind.
- [ ] **Un-invested engineer stagnates but does not regress** (PRD §I4.2 edge case).
- [ ] Archetypes modulate growth rate (prompt 33 — the ambitious junior grows faster under investment, etc.).
- [ ] Growth rates + stretch risk/reward read from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Growth accrual is a pure function in the tick's resolution; stretch is detected from assignment (skill required > engineer proficiency by a small margin) reusing the Inc-1 assignment/skill-fit model.
- Level-ups change the engineer's skill proficiency — the same field Inc-1 uses — so downstream throughput improves naturally.
- Keep the new attention action minimal; do not balloon the action set.

## Testing
Unit:
- Coaching attention accrues growth; sustained coaching yields a level-up.
- Stretch assignment accrues growth at a throughput cost this sprint.
- An un-invested engineer stagnates (no growth) but never loses proficiency.
- Archetype modulates growth rate.
- Growth is gradual (a level-up takes multiple sprints of investment — not instant).
- Rates read from constants; determinism holds.

Manual verification checklist:
- [ ] Coach a junior across several sprints: they level up a skill, and it feels earned.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Relationships — prompt 35.
- Growth surfacing UI — prompt 36.
- Contagion — prompt 37.
