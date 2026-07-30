# Layer 3 — View

Thin UI that reads `GameState` and dispatches actions. It computes **nothing** about
game rules — that is the engine/view wall, the one boundary this project cannot violate.
Anything rule-shaped (roadmap progress, fuzzy reads, the attention budget) is asked of an
engine function; it is never re-derived here.

## Shape

The view is three layers, each thinner than the one above it:

- **`viewModel.ts`** — pure projections from `GameState` (plus the in-progress
  `SprintActions`) to flat, display-ready data. Reshapes what the engine already decided;
  computes no rule. This is the single chokepoint every rendered value flows through, so
  the no-raw-`morale`/`burnout` rule is structural: the interiors are simply never copied
  onto a view model. Runs headlessly in Node.
- **`store.ts`** — holds the committed `GameState`, the in-progress `SprintActions` plan,
  and which screen is showing. Every player gesture is a dispatch that folds an engine op
  (`assign`, `spendAttention`, `setCrunch`, `tick`) over one of them and notifies
  subscribers. Implements no rule; never mutates state. Persistence and the next run are
  injected via `onCommit` / `nextRun`, so the store stays DOM-free and seed-deterministic.
- **`dom.ts`** — maps a `ScreenView` to elements and element events back to store
  dispatches. Full rebuild per change; native controls (`select`, `button`, checkbox,
  `progress`) keep every action keyboard-operable. No `GameState`, no engine calls, no
  rules — a guard test (`tests/view/architecture.test.ts`) holds that line.

## The three screens

A run cycles `planning → summary → planning …`, and ends on `ended`:

- **Planning** (`RunView`) — the roster, the over-capacity backlog, the roadmap, the
  attention tray, the crunch toggle, and Resolve.
- **Sprint summary** (`SummaryView`) — what shipped, roadmap progress, the fuzzy read per
  engineer with the band-per-sprint strip behind it, and any event that fired. The strip is
  the reason this screen exists: the crunch→burnout→attrition coupling is only legible
  across sprints, so the summary re-shows every band the player was already given rather
  than making them remember. A 1:1 still buys strictly more — it resolves *this* sprint's
  direction, which coarse bands lag behind.
- **Ending** (`OutcomeView`) — on a loss, the post-mortem: who left, the crunch sprints and
  ignored warnings behind it, and every at-risk read echoed word for word. On a completion,
  a plain account with no fanfare. Both offer a new run.

Which screen shows is presentation state the store owns. The engine's `status` decides
whether a run is over; it never decides what is on screen.

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
