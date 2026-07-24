# 01 — Project Scaffold & Determinism Spine

## Context
Empty repository. This is the first commit of **Managed**, a pure-TypeScript engineering-management simulation. Before any game logic, we establish the four-layer skeleton (§4 of CLAUDE.md), the **seeded RNG that is the determinism spine** (§5.2), the Vitest setup, and a headless harness stub. Nothing here is game-specific yet — this iteration exists to make every later iteration testable, deterministic, and correctly separated from day one.

Read `CLAUDE.md` first. The engine/view wall (§4) and determinism (§5.2) are the rules this prompt physically enforces in the project structure.

## User Story
As the builder, I can clone the repo and run the engine, tests, and a headless simulation stub with zero UI, so that I have a deterministic, testable foundation before any game rules exist.

## Acceptance Criteria
- [ ] TypeScript project initialized (strict mode on), targeting Node for the engine/harness and a browser bundle for the eventual view — but **no view code yet**.
- [ ] Directory structure encodes the four layers:
  ```
  /src
    /engine        (Layer 1: pure TS — no DOM/React/Svelte imports, ever)
    /content       (Layer 2: data files — empty placeholders ok)
    /view          (Layer 3: empty for now)
    /persistence   (Layer 4: empty for now)
  /harness         (headless Node entry point)
  /tests           (Vitest)
  ```
- [ ] A seeded RNG lives in `/src/engine` as a **pure, serializable** module: an `RngState` (plain object: seed + cursor/position) and pure functions that take an `RngState` and return `{ value, next: RngState }`. No global RNG. No `Math.random`.
- [ ] The RNG is deterministic: same `RngState` in ⇒ same `value` and same `next` out, always. A known seed produces a documented, fixed first-N sequence (captured in a test).
- [ ] Vitest configured; `npm test` runs the suite green.
- [ ] Headless harness stub at `/harness`: a Node script runnable via `npm run harness` that instantiates the RNG from a seed, draws N values, prints them, and exits — proving the engine runs with **no UI whatsoever**.
- [ ] A lint or import rule (or at minimum a documented + test-enforced convention) that fails if `/src/engine` imports anything DOM/React/Svelte.

## Technical Specs (translated for this project — see CLAUDE.md §7)
- **Determinism is the primary discipline here** (the translation of "mobile-first"): the RNG spine is the thing every later deterministic guarantee rests on. No ambient nondeterminism (`Date.now`, `Math.random`, wall-clock) anywhere in `/src/engine` or `/harness` game logic.
- **Testability at every step:** Vitest is the test runner (carried over unchanged from preferences). Engine tests are headless.
- No async, no network, no DOM. The tick will be synchronous and pure.
- Choose a small, well-understood PRNG algorithm (e.g. a mulberry32 / splitmix-style integer generator) implemented as pure functions over plain state — no class holding mutable internal state, because the RNG state must serialize inside `GameState` later (§5.3).

## Testing
Unit:
- RNG: same input state ⇒ identical output value + next state (determinism).
- RNG: a fixed seed produces a fixed, asserted sequence of the first N draws.
- RNG: drawing does not mutate the input state object (purity — input unchanged after call).
- RNG: `RngState` is JSON round-trippable (serialize → parse → identical draws resume).

Integration / harness:
- `npm run harness` runs headlessly and prints a deterministic sequence for a given seed.

Manual verification checklist:
- [ ] `npm test` is green.
- [ ] `npm run harness` runs with no UI and prints the same sequence on repeat runs.
- [ ] Grep confirms no `Math.random` / `Date.now` in `/src/engine`.

## Out of Scope
- Any game entities (GameState, Engineer, Ticket) — prompt 03.
- Any content/data (skills, events, names) — prompt 02.
- The tick function — prompt 08.
- The full tuning harness with sweeps and reports — prompt 12 (this is just the runnable stub).
- Any view code — prompts 13–14.
