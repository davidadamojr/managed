# 13 — Thin View, Part 1: The Main Run Screen

## Context
The engine is complete and proven headlessly (01–12): a deterministic, tested, tunable simulation. **Only now** do we build the view — deliberately last, per the headless-first methodology (§3 of CLAUDE.md), so the UI renders an already-proven engine. This prompt builds **Layer 3** (§4): a *thin* view that reads `GameState` and dispatches actions, computing **nothing** about game rules. Panels and numbers only — no art, no polish (PRD §7, the locked prime directive). This prompt covers the main run screen; the summary/post-mortem screens are prompt 14.

Read `CLAUDE.md` §4 (engine/view wall — the most important rule) and §7 (preference translation), and PRD §7 (UX) + §8 (non-functional).

## User Story
As a player, I can see my team, backlog, roadmap, and attention pool, assign engineers, spend attention, toggle crunch, and hit Resolve, so that I can play a sprint entirely through the UI.

## Acceptance Criteria
- [ ] The view **reads `GameState` and dispatches actions only** — no game rules, no simulation state in components (§4). If a value needs computing about the game, the engine already computed it (fuzzy reads, roadmap progress, etc.).
- [ ] **The Roster** panel: each engineer as a readable card — name, flavor/vibe, skills (with proficiency), **fuzzy state read** (never raw numbers, §5.5), and current assignment.
- [ ] **The Backlog** panel: the ticket list, visibly over-capacity, each ticket showing size and required skill.
- [ ] **The Roadmap Bar:** the soft-goal progress indicator (the source of schedule pressure) — visibly present and behind-able, never presented as a fail line.
- [ ] **The Attention Tray:** the pool of attention points (shown as capacity/remaining) and the three actions (1:1, Unblock, Recognize) they buy. Empty pool shows plainly, not as an error.
- [ ] **The Crunch Toggle:** the per-sprint intensity choice, presented as the tempting lever.
- [ ] **The Resolve button:** commits assignment + attention + crunch as `SprintActions` and dispatches `tick`. Resolution feels instant (PRD §8 — no async load state needed).
- [ ] Assigning an engineer, spending attention, and toggling crunch all build up `SprintActions` via dispatched actions; the view never mutates `GameState` directly.

## Technical Specs (translated — see CLAUDE.md §7)
- **Framework:** the simplest thing that renders panels for Increment 1 (React or Svelte per §12; the framework decision is formally deferred to Increment 9, so pick the lightest option and keep the view thin enough that swapping is cheap). Follow the `frontend-design` skill for baseline structure, but remember: **panels and numbers, no art/polish** — do not over-invest in styling before fun is proven.
- **Desktop evergreen browsers only** (PRD §8). Mobile layout is explicitly skipped for Increment 1 — do **not** spend effort on mobile breakpoints (this is the translation of "mobile-first": the discipline went into the engine/determinism, not responsive layout).
- **Accessibility minimum bar** (§8, the translation of touch targets): legible text, **keyboard-operable core actions** (assign, spend attention, toggle crunch, resolve), sufficient contrast. Don't actively preclude accessibility, but it's not the MVP focus.
- **Edge/terminal states as legible text** (translation of the four UI states): empty attention pool shown plainly; poor-fit assignment allowed in the UI (it resolves poorly, not blocked); over-capacity backlog shown as-is with no auto-balancing nudge.
- No optimistic-UI/rollback machinery — the tick is synchronous and pure; render resolved state directly.
- **No browser storage in component state** beyond what the persistence layer (prompt 11) provides; the view calls the persistence layer, it does not localStorage directly.

## Testing
Component tests:
- Roster renders one card per engineer with name, skills, fuzzy read, assignment — and **no raw morale/burnout number**.
- Backlog renders all tickets, visibly over capacity, with size + required skill.
- Roadmap bar reflects engine-computed progress; behind-schedule is shown but not as failure.
- Attention tray shows capacity/remaining and the three actions; empty pool renders plainly.
- Crunch toggle reflects and updates the intended `SprintActions` flag.
- Resolve dispatches a tick with the assembled actions; the view re-reads the new `GameState`.
- **Architecture check:** no component contains game-rule logic (assignment legality, throughput, morale mapping) — those come from the engine.

Manual verification checklist:
- [ ] Play a full sprint through the UI; assign, attend, crunch, resolve.
- [ ] Keyboard-only: complete a sprint without a mouse.
- [ ] Confirm no raw morale/burnout integers are visible anywhere.
- [ ] `npm test` green.

## Out of Scope
- The sprint summary + post-mortem screens — prompt 14.
- The first-time framing screen — prompt 16.
- Any art, theming, animation polish — deferred (prove fun in raw form first).
- Mobile layout — explicitly skipped for Increment 1.
