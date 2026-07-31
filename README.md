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
| `npm run harness`   | Run the headless tuning harness (no UI) — the mechanical report. |

The harness drives the same pure engine the game does, headlessly, over many
seeded runs, and reports whether the design meets its mechanical bars — echo
timing, fairness, dominant strategy, and roadmap achievability:

```bash
npm run harness                          # tuning report on the settled params
npm run harness -- report --seeds 40     # over 40 seeds
npm run harness -- sweep crunchAccrual   # how the bars respond as one constant changes
npm run harness -- sweep                 # (no name) lists every sweepable parameter
npm run harness -- rng 12345 10          # the original RNG determinism smoke
```

Because everything under it is seeded and pure, a given seed set and parameter
set always produce the identical report. The report states what *is*: when the
constants fail a bar, it says so rather than flattering the design.

`TUNING.md` explains what the current parameters are, the sweeps behind each
choice, and what the bars cannot see. `harness/reports/` holds the committed
output of the two commands above, so a later session can diff against it rather
than trusting a remembered number. Both are mechanical results — nothing there
has been validated by playing.

## Architecture — four layers

```
src/engine        pure TypeScript simulation. No DOM, no framework, no randomness
                  beyond the seeded RNG. Plain data in, plain data out.
src/content       data files: skills, names, events, tuning constants. No logic.
src/view          thin UI that reads game state and dispatches actions. No rules.
src/persistence   JSON (de)serialization of game state.
harness           headless Node entry point for running the engine without a UI,
                  plus the committed reports backing the current parameters.
tests             Vitest unit + integration tests.
```

The one rule the project cannot violate: **simulation state and rules never live
in the view.** The engine is the single source of truth; the view only renders it.
That wall is what keeps the engine portable and the test harness honest, and it is
enforced automatically by `tests/engine-guard.test.ts`.

## The guarantees, and what enforces them

Two properties hold everything else up, so neither is left to example tests alone:

- **Determinism.** Identical state plus identical actions always produce an
  identical result. `tests/rng-audit.test.ts` reads the source of every file on
  the simulation path (engine, content, harness) and fails on any clock, unseeded
  random, environment read, or locale-dependent comparison.
- **Save exactness.** A resumed run is the run it was, RNG cursor included.

Both are stated as properties over generated runs in
`tests/determinism-properties.test.ts` — whole seeded runs played through randomly
generated but legal plans, checked for byte-identical replay, an unmutated input,
and a save that round-trips and resumes into the same future. The generators live
in `tests/support/arbitraries.ts`.
