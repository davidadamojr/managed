# Layer 3 — View

Thin UI that reads `GameState` and dispatches actions. It computes **nothing** about
game rules — that is the engine/view wall, the one boundary this project cannot violate.
Anything rule-shaped (roadmap progress, fuzzy reads, the attention budget) is asked of an
engine function; it is never re-derived here.

## Shape (main run screen)

The view is three layers, each thinner than the one above it:

- **`viewModel.ts`** — a pure function `(GameState, SprintActions) → RunView`. Reshapes what
  the engine already decided into flat, display-ready data. This is the single chokepoint
  every rendered value flows through, so the no-raw-`morale`/`burnout` rule is structural:
  the interiors are simply never copied onto a view model. Runs headlessly in Node.
- **`store.ts`** — holds the committed `GameState` and the in-progress `SprintActions` plan.
  Every player gesture is a dispatch that folds an engine op (`assign`, `spendAttention`,
  `setCrunch`, `tick`) over one of them and notifies subscribers. Implements no rule; never
  mutates state. Persistence is injected via `onCommit`, so the store stays DOM-free.
- **`dom.ts`** — maps a `RunView` to elements and element events back to store dispatches.
  Full rebuild per change; native controls (`select`, `button`, checkbox, `progress`) keep
  the core actions keyboard-operable. No `GameState`, no engine calls, no rules.

`main.ts` + `index.html` are the composition root — the only place that touches the DOM
mount point, `localStorage` (through the persistence layer), and the run seed.

Keeping the projection separate from the DOM is also what makes the eventual framework
choice (React vs Svelte, deferred to Increment 9) cheap: swapping the renderer reuses the
view model and store wholesale.

## Running it locally

The engine and view logic are proven by the test suite (`npm test`, view specs under
`tests/view/`). To play a sprint in a browser:

```
npm run dev:view      # bundles with esbuild and serves at http://localhost:8000
```

`esbuild` is used only as a zero-config dev bundler/server so the raw panels are playable
now — it is **not** the Increment-9 framework or build-format decision, which stays open.
`?seed=<n>` on the URL picks a fresh run's seed; a saved run is resumed if one exists.
