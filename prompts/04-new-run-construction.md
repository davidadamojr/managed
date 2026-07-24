# 04 — New-Run Construction (Seeded)

## Context
Entities, `GameState`, and serialization exist (03), and content + tuning constants exist (02). Now we build the **seeded new-run constructor**: given a seed, deterministically produce a starting `GameState` with a 3–4 person roster, an intentionally over-capacity backlog, and a soft roadmap. This is pure construction — no tick, no rules firing.

Read `CLAUDE.md` §9 (candidate parameters) and PRD §4.1/§4.2 (roster, backlog, over-capacity constraint).

## User Story
As a player, I can start a new run and immediately see a full team, a backlog clearly larger than my team can do, and a roadmap I'm trying to ship, so that the juggle is present from the first screen. (Engine side: as the builder, a seed deterministically produces that starting state.)

## Acceptance Criteria
- [ ] `newRun(seed): GameState` produces a complete, `status: 'active'` starting state deterministically from the seed (same seed ⇒ identical run).
- [ ] Roster: **3–4 engineers** (§9), each drawn from the name/flavor content, each with skills at proficiency levels (including possibly a zero-proficiency skill — poor-fit must be *possible*, not forbidden, PRD §4.1). Team size fixed for the run.
- [ ] Backlog: **intentionally larger than one sprint's capacity** (§9, PRD §4.2) — the scarcity is the point. The constructor must not auto-balance to fit capacity.
- [ ] Roadmap: a subset of backlog tickets designated as the soft goal, sized **tight-but-achievable** per §9 candidate (to be validated in tuning, prompt 12/17). Falling behind must be representable and painful, never a fail status.
- [ ] Run length set from tuning constants (**5–6 sprints**, §9), `sprintIndex` at start.
- [ ] `attention.capacity` initialized via `attentionCapacityFor(manager)` (§5.6) — not a literal.
- [ ] `manager` container initialized with its inert Increment-1 fields.
- [ ] All randomness in construction flows through the seeded RNG in `GameState` (no `Math.random`), and the resulting `rngState` is left in a well-defined position for the first tick.

## Technical Specs
- Pure function: `newRun` reads content + tuning constants and threads the seeded RNG; it returns state and does not mutate globals.
- Determinism is the discipline (§7 translation): identical seed ⇒ byte-identical serialized starting state.
- Backlog-over-capacity ratio and roadmap size come from tuning constants (prompt 02), not inline numbers.
- Do not warn, hint, or nudge the player about the shortfall — the system presents scarcity and lets the player choose (PRD §4.2). No auto-balancing logic.

## Testing
Unit:
- `newRun(seed)` is deterministic: same seed ⇒ deeply-equal `GameState` (serialize both, compare).
- Roster size is 3–4; every engineer has a name, flavor, skills, and separate morale/burnout.
- A poor-fit assignment is *possible* given the generated skills (at least the skill/ticket space allows it).
- Backlog size exceeds a single sprint's plausible capacity (assert the over-capacity invariant from tuning constants).
- Roadmap is a subset of backlog ids; roadmap size matches the tuning constant.
- Run length matches tuning constant (5–6).
- `attention.capacity` equals `attentionCapacityFor(manager)`, not a hardcoded literal.

Manual verification checklist:
- [ ] Two `newRun` calls with the same seed produce identical serialized state; different seeds differ.
- [ ] Eyeball a generated run: it reads as a plausible team + over-capacity backlog + roadmap.
- [ ] `npm test` green.

## Out of Scope
- Assigning engineers / crunch toggle — prompt 05.
- Spending attention — prompt 06.
- Resolving the sprint — prompt 08.
- Any morale/burnout change — prompt 07.
