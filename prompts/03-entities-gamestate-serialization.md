# 03 — Core Entities, GameState & Serialization Round-Trip

## Context
The RNG spine (01) and content layer (02) exist. Now we define the **serializable core entities** and the single `GameState` root (§5.3 of CLAUDE.md), plus JSON serialization with a round-trip guarantee. This is pure Layer-1 data modeling — no rules, no tick yet. Getting the shapes right here is what lets prompts 04–11 build without the data model drifting.

Read `CLAUDE.md` §5.3 (GameState shape), §5.4 (morale vs burnout), §5.6 (attention forward hook), and §5 of the PRD (conceptual data model).

## User Story
As the builder, I have a single serializable `GameState` with well-typed entities that JSON round-trips exactly, so that save/load is near-free and every system has one stable source of truth.

## Acceptance Criteria
- [ ] **`GameState`** (the root, §5.3) contains: `seed`, `rngState` (from prompt 01), `sprintIndex`, `runLength`, `roster: Engineer[]`, `backlog: Ticket[]`, `roadmap` (roadmap ticket ids + derived progress), `attention: AttentionPool`, `manager: ManagerState`, `status: 'active' | 'completed' | 'failed'`, and optional retained `history: SprintSummary[]`.
- [ ] **`Engineer`**: `id`, `name`, `flavor`, `skills` (skill → proficiency), `morale`, `burnout`, `assignment` (current sprint), optional lightweight flags. **Morale and burnout are distinct fields** (§5.4) — do not collapse. Both bounded 0–100 internally.
- [ ] **`Ticket`**: `id`, `size`/effort, `requiredSkill`, `progress`, `status: 'open' | 'in-progress' | 'done'`. Completed tickets persist (not deleted).
- [ ] **`Roadmap`**: the subset of ticket ids designated as the soft goal + derived progress. Soft target — modeled such that falling behind is representable but is never a status that fails the run.
- [ ] **`AttentionPool`**: `capacity` and `remaining` for the current sprint. **Capacity is derived from `ManagerState`, not hardcoded** (§5.6 forward hook): provide `attentionCapacityFor(manager)` that in Increment 1 returns the base constant, ignoring (currently inert) manager fields.
- [ ] **`ManagerState`**: a container present from day one with fields that are **inert in Increment 1** (reputation, manager-burnout placeholders). It exists so Increments 6/8 can modulate attention capacity without a retrofit.
- [ ] **`SprintSummary`**: derived (produced by the tick later), containing what shipped, roadmap progress, per-engineer fuzzy reads, at-risk flags, and any event. Type defined now; populated in prompt 10.
- [ ] **`Event`** reference type matching the content shape (prompt 02).
- [ ] **Serialization**: `serialize(GameState) => string` and `deserialize(string) => GameState`, with a **round-trip guarantee** — deserialize(serialize(s)) is deeply equal to s, including `rngState`. State is plain objects/arrays only: no class instances, functions, Maps/Sets, or circular refs (§5.3).

## Technical Specs
- All entities are **plain serializable data**. No behavior methods on entities — behavior lives in pure system functions (prompts 05–11).
- Clamping helpers for bounded values (morale/burnout 0–100) may be defined but are not applied yet (no rules this prompt).
- `manager` container must serialize even though inert — proves the forward hook is in the persisted shape from day one.

## Testing
Unit:
- Each entity constructs with valid typed fields.
- Morale and burnout are separate fields and independently settable (§5.4).
- `attentionCapacityFor(manager)` returns the base constant in Inc 1 and reads from `manager` (not a literal in the pool).
- Serialization round-trip: deep-equality of a fully-populated `GameState` including `rngState` and inert `manager`.
- Serialized output contains no functions/class markers (plain-data assertion).
- Deserialized `rngState` resumes the identical RNG sequence (ties to prompt 01).

Manual verification checklist:
- [ ] A hand-built `GameState` serializes to readable JSON and back with no loss.
- [ ] `npm test` green.

## Out of Scope
- New-run *construction* (seeding a roster/backlog/roadmap from content) — prompt 04.
- Any rules that change these values — prompts 05–11.
- localStorage wiring — prompt 11 (this is pure serialize/deserialize, no storage).
