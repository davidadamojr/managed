# 35 — [Inc 4 · MVP] Relationships / Chemistry (Pairwise Rapport)

> ⚠ **VALIDATE-FIRST.** Rapport shift rate and collaboration bonus size are **decisions-to-validate** (PRD §I4.6). The model is deliberately the *simplest that produces emergent chemistry* — pairwise only, no chains/cliques (PRD §I4.5, I-8). Add richness only if play demands it.

## Context
People are individual (33) and grow (34). Now the team becomes a **social system**: pairwise **relationships** between engineers modulate collaborative throughput. This is depth through *interaction* with existing systems (co-assignment, mentorship), not a standalone subsystem (PRD §I4 depends-on, I-8).

Read PRD §I4.2 (relationships/chemistry), §I4.3 (Relationship entity), §I4.5, and `CLAUDE.md` §12 (I-7, I-8).

## User Story
As a manager, I want relationships between engineers to affect collaboration and morale, so that the team is a social system, not a set of independent workers. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Relationship` entity** (PRD §I4.3): belongs to a pair of engineers; contains rapport level and type (rapport/friction/mentorship). **Pairwise only** — no cliques/chains (deferred, I-8).
- [ ] **Starts neutral**, shifts **slowly** via co-assignment and events; created at run start (or on hire, Inc 5) and destroyed when either engineer leaves (PRD §I4.3 lifecycle).
- [ ] **Modulates collaborative throughput:** engineers co-assigned or paired with strong rapport work faster together; friction slows collaboration.
- [ ] The player **influences pairings** via co-assignment and mentorship (reusing existing assignment + attention actions — no new economy).
- [ ] Relationship reads are **fuzzy** (I-7) — qualitative hints of strong pairings/friction (surfaced in prompt 36), consistent with people-reads.
- [ ] Rapport shift rate + collaboration bonus read from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- `Engineer` gains a set of pairwise relationships (PRD §I4.3); the relationship graph serializes. Pairwise only — no multi-hop structures.
- Collaboration modulation composes with existing throughput math (skill-fit × morale × crunch × debt-penalty) — document the composition.
- Relationships shift in the tick's resolution based on co-assignment/mentorship this sprint.

## Testing
Unit:
- Relationships start neutral; co-assignment shifts rapport slowly.
- Strong rapport increases collaborative throughput; friction decreases it.
- A departing engineer's relationships dissolve (prep for Inc 5 contagion).
- Only pairwise relationships exist (no chains/cliques — structural check).
- Reads stay fuzzy; rates read from constants; determinism holds.

Manual verification checklist:
- [ ] Pair two engineers across sprints: rapport builds and they visibly work faster together.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Morale contagion along ties — prompt 37 (relationships modulate collaboration here; contagion is separate).
- Relationship UI — prompt 36.
