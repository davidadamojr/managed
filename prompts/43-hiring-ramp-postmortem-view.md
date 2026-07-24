# 43 — [Inc 5 · MVP] View: Hiring Pipeline, Ramp Indicator & Expanded Post-Mortem

> ⚠ **VALIDATE-FIRST.** View-only. Confirm the pipeline panel makes the *lag* tangible (the wait should feel painful) and the ramp indicator makes early drag legible-not-confusing — both are the point of the UI here.

## Context
Hiring, ramp, and the survivable post-mortem exist in the engine (39–42). Now the thin view surfaces them: the **Hiring Pipeline panel**, the **Ramp indicator**, and the **expanded Departure Post-Mortem** — a survivable-but-sobering accounting of everything that walked out the door. Extends prior views; holds the engine/view wall (I-3).

Read PRD §I5.4 (UX additions) and `CLAUDE.md` §12 (I-3), §7.

## User Story
As a manager, I can see candidates and their ETA, see which hires aren't yet at full capacity, and read a sobering post-mortem of a survivable loss, so that the lag is tangible and recovery is legible.

## Acceptance Criteria
- [ ] **The Hiring Pipeline panel** (PRD §I5.4): shows candidates, their stage, and ETA — making the lag tangible and the wait painful.
- [ ] **The Ramp indicator** on new hires: communicates "not yet at full capacity" so early drag is legible, not confusing.
- [ ] **The expanded Departure Post-Mortem:** now a survivable-but-sobering accounting of everything that left (skills, relationships, knowledge, from prompt 39) — and, distinctly, a *terminal* collapse screen when the run actually ends (prompt 40).
- [ ] All data engine-derived; **no hiring/ramp/loss logic in components** (I-3).
- [ ] Panels-and-numbers, desktop, keyboard-operable (open req, advance, assign mentor), sufficient contrast (§7).

## Technical Specs
- Extend prior views. The pipeline panel and ramp indicator are new readable elements; the post-mortem extends the Inc-1 post-mortem screen (prompt 14) rather than replacing it.
- Distinguish survivable-loss post-mortem (run continues) from terminal-collapse screen (run ends) — different affordances (continue vs new run).

## Testing
Component:
- Pipeline panel renders candidates + stage + ETA from state.
- Ramp indicator renders on onboarding/ramping hires.
- Survivable post-mortem renders the itemized multi-dimensional cost and a continue affordance; terminal collapse renders an end-of-run screen.
- Architecture check: no hiring/ramp/loss math in components.

Manual verification checklist:
- [ ] Open a req and watch the ETA tick down painfully; a landed hire shows as ramping; a survivable loss reads as sobering-but-not-over.
- [ ] `npm test` green.

## Out of Scope
- Prevention-vs-recovery tuning + integration — prompt 44.
- Increment 6 systems.
