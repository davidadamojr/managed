# 63 — [Inc 8 · MVP] Event Data-Validation Pass + View: Manager State Read

> ⚠ **VALIDATE-FIRST.** The set of "incoherent event/state combinations" to guard against is a **decision-to-validate** discovered partly by playing the expanded library (prompt 61) — new events can create combos not anticipated on paper. The Manager state read must keep the manager's own burnout **fuzzy** (I-7), like the engineers'.

## Context
The library is large (61) and voiced (62). This prompt hardens it with a **data-validation pass** (no incoherent event/state combos) and adds the **Manager state read** view — the player's own burnout surfaced fuzzily, so self-neglect is legible before it spirals (the foreseeability requirement from prompt 59, now on-screen).

Read PRD §I8.2 (data-validation pass), §I8.4 (Manager state read), and `CLAUDE.md` §12 (I-1, I-3, I-7).

## User Story
As a manager, I want events to always make sense for the current state, and I want my own burnout surfaced (fuzzily) before it spirals, so that the game never breaks coherence and self-neglect is legible.

## Acceptance Criteria
- [ ] **Data-validation pass** (PRD §I8.2): a guard prevents incoherent event/state combinations (e.g. firing "your report got promoted" for someone who just quit). Runs over the library; catches precondition gaps.
- [ ] The guard is **automated and testable** — a validation routine over event data + representative states, not a manual review — so future content additions are checked too.
- [ ] **View — The Manager state read** (PRD §I8.4): the player's own burnout surfaced **fuzzily** (like the engineers', I-7) on the Manager panel — self-neglect legible before it spirals (satisfies prompt 59's foreseeability on-screen; connects to the degraded-reads effect from prompt 60).
- [ ] The manager read is **fuzzy, not numeric** (I-7) — the player reads their own state qualitatively, consistent with how they read the team.
- [ ] Engine-derived; **no validation/read logic in components** (I-3).

## Technical Specs
- The validation routine evaluates every event's preconditions against a battery of representative/edge states and flags any event that could fire incoherently — reused by the harness (prompt 65) as the non-repetition/coherence bar's coherence half.
- The Manager state read extends the Manager panel (prompt 49) with a fuzzy self-burnout read, derived in the engine.

## Testing
Unit:
- The validation routine flags a deliberately-incoherent event (e.g. promotion for a departed engineer), then passes once fixed.
- No event in the shipped library fires incoherently against the representative state battery.
- The Manager state read is fuzzy (qualitative), not a raw burnout integer (I-7).

Component:
- Manager panel renders the fuzzy self-burnout read from engine state.
- Architecture check: no validation/read math in components.

Manual verification checklist:
- [ ] Play a long run: no event ever fires that contradicts the situation; your own "running hot lately" read shows before you spiral.
- [ ] `npm test` green.

## Out of Scope
- Rich event presentation — prompt 64.
- Harness manager-burnout + non-repetition bars — prompt 65.
