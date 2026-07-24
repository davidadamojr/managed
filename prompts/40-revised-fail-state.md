# 40 — [Inc 5 · MVP] Revised Fail State (Team-Floor + Cascade)

> ⚠ **VALIDATE-FIRST.** The exact team-size floor and cascade-collapse definition are **decisions-to-validate, explicitly informed by how loss felt in Increments 1–4** (PRD §I5.5). This is the single most consequential design change in the campaign — do not finalize the floor/cascade until you have played the earlier increments and know the sting.

## Context
Attrition is now multi-dimensional (39). This prompt makes the pivotal change: **a single quit no longer auto-ends the run.** Instead the run continues into recovery, and a new terminal condition replaces single-quit failure — a **team-size floor + a morale/burnout collapse cascade**. This preserves real stakes while making single losses survivable, enabling longer campaigns. It touches the fail-axis invariant, so it must stay human-outcome-based (I-5).

Read PRD §I5.2 (revised fail state), §I5.3 (GameState changed), §I5.5 (decision), and `CLAUDE.md` §12 (I-1 fairness, I-5 fail-axis).

## User Story
As a manager, I want the fail-state model to shift from "one quit ends the run" to a survivable-loss model, so that longer campaigns become possible. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **A single departure no longer ends the run** (PRD §I5.2): the run continues into recovery. `GameState` run status supports **"recovering from loss"** as an ongoing state (PRD §I5.3).
- [ ] **New terminal condition** (PRD §I5.5): the run ends if the team drops **below a viable floor** (can't staff the work at all) OR a **departure cascade** collapses the team. Both are human-outcome-based (I-5) — never a metric miss.
- [ ] **Total collapse must still be able to end a run** (PRD §I5.2) — stakes stay real; survivability is not invulnerability.
- [ ] **The at-risk warning still precedes every departure** (I-1, PRD §I5.5): the fairness guarantee persists through the new model — every quit in the cascade is individually foreseeable.
- [ ] Team-floor value + cascade definition read from tuning constants (I-6); deterministic (I-4).
- [ ] The post-mortem (prompt 39) now distinguishes a *survivable* loss (run continues) from a *terminal* collapse (run ends).

## Technical Specs
- Replace the Inc-1 terminal-on-quit logic (prompt 09/11) with the floor+cascade evaluation. Keep it a clearly documented change to the fail-axis — this is where I-5 evolves.
- A cascade is a bounded chain: one departure's contagion (prompt 37) may push a close tie toward the edge, but each subsequent quit still requires its own warning (I-1) — a cascade is a sequence of foreseeable losses, not one unforeseeable mass exit.
- Save format changes (recovering state, floor condition) — no cross-increment migration promised, but within Inc-5 the round-trip must hold.

## Testing
Unit:
- A single well-warned quit no longer ends the run; status becomes "recovering."
- Dropping below the team floor ends the run; a cascade collapse ends the run.
- **Every** quit (including within a cascade) is preceded by its own fuzzy warning (I-1) — no unforeseeable loss even in collapse.
- Terminal conditions are human-outcome-based only (no metric-miss path — I-5).
- Floor/cascade read from constants; determinism + serialization round-trip hold.

Manual verification checklist:
- [ ] Lose one engineer: the run continues, sobered. Lose several in a warned cascade: the run collapses.
- [ ] Confirm no path ends the run on a roadmap/debt metric (I-5).
- [ ] `npm test` green; fairness harness bar green under the new model.

## Out of Scope
- Hiring pipeline — prompt 41.
- Ramp/onboarding — prompt 42.
- Harness prevention-vs-recovery bar — prompt 44.
