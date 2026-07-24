# 14 — Thin View, Part 2: The Sprint Summary & Post-Mortem Screens

## Context
The main run screen lets the player play a sprint through the UI (13). Now we build the **legibility surface** — the Sprint Summary (PRD §4.5: *the single most important screen in Increment 1*) and the Post-Mortem terminal screen where the lesson lands. Both render engine-derived data (prompts 10 and 11); the view computes nothing. This is where the **delayed echo becomes felt** — the summary must let a player read Priya's decline across sprints, and the post-mortem must make a loss legible.

Read PRD §4.5 (sprint summary), §4.6 (terminal states/post-mortem), §7 (named UI vocabulary), and `CLAUDE.md` §4 (engine/view wall).

## User Story
As a manager, I can read a sprint-end summary showing what shipped, how people feel, and who's at risk — and, if I lose someone, a post-mortem tracing why — so that the invisible state of the team is legible at the moment I most need it, and a loss teaches me.

## Acceptance Criteria
- [ ] **The Sprint Summary** screen renders the engine's `SprintSummary` (prompt 10): what shipped this sprint, roadmap progress overall, **fuzzy per-engineer reads** (never raw numbers), **trends** (direction over sprints — "dropped again," "quiet two sprints running"), the at-risk warning, and any event that fired.
- [ ] Trends are visually legible across sprints — the player can perceive *direction*, because the coupling is only legible over time (PRD §4.5). First-sprint summary shows state without direction (acceptable).
- [ ] The **at-risk warning** reads as human observation, wry and grounded ("Priya seems checked out lately"), not a health-bar alert (§8).
- [ ] **The Post-Mortem** screen (on `status: 'failed'`) renders who left and the **readable why-trace** (crunch sprints, ignored warnings) from prompt 09/11 — this is where the lesson lands.
- [ ] **Completion** screen (on `status: 'completed'`) renders a plain run summary — no victory fanfare (a prototype hasn't earned a tuned win, PRD §6.2).
- [ ] From the summary, the player advances to the next sprint (or reaches a terminal screen); from a terminal screen, the player can start a new run.
- [ ] The view **only displays** derived data — no re-derivation of reads, trends, or traces in components (§4).

## Technical Specs (translated — see CLAUDE.md §7)
- Panels and numbers, no art/polish — but this is the screen that *sells the echo*, so prioritize **clarity of trend and warning** over decoration. Legibility is the product here.
- Desktop evergreen only; keyboard-operable advance/new-run; sufficient contrast (§8 minimum bar).
- The summary is derived data (prompt 10); the post-mortem is derived data (prompt 11). The view maps that data to readable layout and nothing more.
- No raw morale/burnout numbers anywhere (hard line, §5.5) — a component test asserts their absence.
- Retained history (prompt 10) backs the trend rendering; the view reads it, doesn't compute it.

## Testing
Component tests:
- Summary renders what-shipped, roadmap progress, fuzzy reads, trends, at-risk warning, and fired event from a supplied `SprintSummary`.
- **No raw morale/burnout integer is rendered** (assert absence).
- Trend rendering shows direction given a 2+ sprint decline; first-sprint shows state without direction.
- At-risk warning renders with human-observation phrasing.
- Post-mortem renders who-left + why-trace on `status: 'failed'`.
- Completion renders a plain run summary on `status: 'completed'`.
- Advance-to-next-sprint and start-new-run controls dispatch correctly.
- Architecture check: no derivation logic in summary/post-mortem components.

Manual verification checklist:
- [ ] **The core test:** play a crunch-heavy run to a loss. Does the summary make Priya's decline readable across sprints, and does the post-mortem make the loss *land as a punch, not a shrug*? This is the make-or-break moment for Increment 1 (§0 of CLAUDE.md, PRD §14). If it shrugs, stop and fix the core before polishing.
- [ ] Keyboard-only through summary → next sprint → terminal screen.
- [ ] `npm test` green.

## Out of Scope
- First-time framing screen — prompt 16.
- Property-based determinism/save-compat tests — prompt 15.
- Final parameter tuning — prompt 17.
- Full-run integration test — prompt 18.
- Art/theming/animation — deferred until fun is proven.
