# Managed

A single-player, turn-based management simulation about running a software
engineering team — the "Football Manager of engineering management."

This repository is a pure-TypeScript, deterministic **engine** with a thin
desktop-web **view** built on top. Everything the simulation does is a pure
function of serializable state, so runs are reproducible and fully testable
headlessly.

## Requirements

- Node 20+ and npm.

## Setup

```bash
npm install
```

## Scripts

| Command             | What it does                                              |
| ------------------- | -------------------------------------------------------- |
| `npm test`          | Run the Vitest suite once.                               |
| `npm run test:watch`| Run Vitest in watch mode.                                |
| `npm run typecheck` | Strict TypeScript type-check (no emit).                  |
| `npm run harness`   | Run the headless simulation harness (no UI).             |

The harness takes an optional seed and draw count:

```bash
npm run harness -- 12345 10
```

Because the RNG is seeded and pure, the same arguments always print the same
sequence.

## Architecture — four layers

```
src/engine        pure TypeScript simulation. No DOM, no framework, no randomness
                  beyond the seeded RNG. Plain data in, plain data out.
src/content       data files: skills, names, events, tuning constants. No logic.
src/view          thin UI that reads game state and dispatches actions. No rules.
src/persistence   JSON (de)serialization of game state.
harness           headless Node entry point for running the engine without a UI.
tests             Vitest unit + integration tests.
```

The one rule the project cannot violate: **simulation state and rules never live
in the view.** The engine is the single source of truth; the view only renders it.
That wall is what keeps the engine portable and the test harness honest, and it is
enforced automatically by `tests/engine-guard.test.ts`.
