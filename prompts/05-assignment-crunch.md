# 05 — Assignment Model & Crunch Toggle

## Context
A seeded new run produces roster, over-capacity backlog, and roadmap (04). Now we build the **assignment model** — the player's plan for the sprint — and the **per-sprint crunch toggle**, the tempting lever. This iteration models *intent* (what the plan is and how it's validated), not *resolution* (what the plan produces) — resolution is the tick, prompt 08.

Read PRD §4.2 (backlog & assignment) and `CLAUDE.md` §9 (crunch semantics).

## User Story
As a manager, I can assign each engineer to a backlog ticket (or to nothing) for the sprint and optionally toggle crunch, so that I decide where scarce capacity goes and own the tradeoffs.

## Acceptance Criteria
- [ ] A `SprintActions` structure (part of the locked tick input, §5.1) carries per-engineer assignments (engineer → ticket id, or none) and the crunch toggle state for the sprint.
- [ ] Assignment is a pure operation on intent: setting/clearing an engineer's assignment produces a new state/actions object, no mutation.
- [ ] **Empty assignment allowed:** an engineer may be assigned to nothing (idle) — legal, with its own morale/burnout response applied later at resolution (idle is not necessarily neutral, PRD §4.2 — the *rule* lands in prompt 07/08; here it must be *representable*).
- [ ] **Poor-fit assignment allowed:** assigning an engineer to a ticket requiring a skill they have at low/zero proficiency is legal and does not error (resolves to low throughput later).
- [ ] **Over-assignment / under-capacity:** the backlog is larger than capacity; the system never auto-balances, never blocks the player, and never warns them out of the juggle. It presents the shortfall and lets the player choose (PRD §4.2).
- [ ] **Crunch toggle:** a per-sprint boolean in `SprintActions`. Its *bookkeeping* effects (throughput boost now, burnout cost accruing now but surfacing later) are applied deterministically at resolution (prompt 08) — this prompt just captures the toggle as intent.
- [ ] Validation is minimal and permissive: only genuinely impossible references (e.g. assigning to a non-existent ticket id, or two engineers where the model forbids) are rejected; everything the design intends to *allow-but-punish* is allowed.

## Technical Specs
- Assignment lives in `SprintActions`, not on the `Engineer` entity's persistent state, so a plan can be built and revised before commit. (An engineer's *committed* assignment field on the entity, from prompt 03, is set at resolution.)
- No throughput math here — that is the tick (prompt 08). This prompt is the plan's shape + legality.
- Crunch is a single per-sprint flag; no per-engineer crunch in Increment 1 (bias toward cutting, §10).
- Keep it pure and serializable — `SprintActions` must serialize (it is part of deterministic replay).

## Testing
Unit:
- Assigning an engineer to a valid ticket updates intent immutably.
- Assigning to nothing (idle) is legal and representable.
- Poor-fit assignment (low/zero proficiency skill) is accepted without error.
- Assigning to a non-existent ticket id is rejected cleanly.
- Over-capacity: assigning more work than capacity is allowed; no auto-balance, no forced warning, no block.
- Crunch toggle sets/clears in `SprintActions` and serializes.

Manual verification checklist:
- [ ] Build a plan that intentionally leaves the backlog under-served and includes a poor-fit assignment — the system accepts it.
- [ ] Toggle crunch on/off in the plan; it persists in the serialized actions.
- [ ] `npm test` green.

## Out of Scope
- Computing throughput / completions — prompt 08.
- Morale/burnout responses to workload, idle, or crunch — prompts 07–08.
- Attention actions — prompt 06.
- Any UI for dragging/assigning — prompt 13.
