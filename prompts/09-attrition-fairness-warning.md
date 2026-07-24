# 09 — Attrition Threshold & the Fairness-Guaranteed At-Risk Warning

## Context
The tick resolves sprints and updates burnout, and calls into an attrition hook (08). Now we build **the fail state and the fairness guarantee that makes it land** — the single most important coupling in Increment 1. When burnout crosses a threshold the player ignored, an engineer quits and the run ends. But a loss is only meaningful if it was **foreseeable**: the fuzzy at-risk warning must reliably precede attrition (§5.5 of CLAUDE.md, PRD §4.5). This is the one place legibility is non-negotiable.

Read `CLAUDE.md` §5.5 (fuzzy readability + fairness guarantee) and PRD §4.5 (at-risk read must precede attrition).

## User Story
As a manager, I want a fuzzy early-warning read on an at-risk engineer ("Priya seems checked out lately") and then, if I ignore it, to actually lose them when burnout crosses the threshold — ending the run — so that the stakes that make the people matter are real *and fair*.

## Acceptance Criteria
- [ ] **Attrition threshold:** when an engineer's burnout crosses the configured threshold (tuning constant), they become attrition-eligible; crossing it (after due warning) triggers a quit that sets `status: 'failed'` and ends the run.
- [ ] **Fairness guarantee (non-negotiable):** an engineer must show **at least one sprint of fuzzy at-risk warning before an attrition-eligible quit** — except where the player drove burnout up so fast that even one sprint's warning is generous (PRD §4.5; err toward fairness). Implement this as an explicit at-risk *state* that must be entered and surfaced for at least one sprint before the quit can fire, with the narrow fast-burnout exception clearly bounded.
- [ ] **At-risk state** is derived from burnout trend/level (approaching threshold), distinct from the terminal quit. It sets an at-risk flag consumed by the summary (prompt 10).
- [ ] **Warning phrasing** is human, wry, grounded — reads as observation, not a system alert ("Priya seems checked out lately") (§8). Phrasings live in content/data (prompt 02), selected deterministically.
- [ ] **Attrition during resolution:** if a quit fires this tick, resolution still completes and the summary renders, showing the loss (PRD §4.4/§4.6).
- [ ] The quit records a **readable trace** of why (the crunch sprints, the ignored warnings) for the post-mortem (data finalized in prompt 11, rendered as a screen in prompt 14) — this trace data is produced here.
- [ ] Fully deterministic: same seeded run + same actions ⇒ same at-risk timing and same quit.

## Technical Specs
- This logic is invoked at the fixed point in the tick's order of operations (after burnout update, prompt 08). Do not reorder.
- The fairness guarantee is **enforced in engine logic and must be verifiable by the harness** (prompt 12 has a dedicated "warning precedes attrition across many seeds" bar). Structure the at-risk/quit state machine so that bar is checkable: e.g., a quit requires a preceding at-risk sprint recorded in state, unless a bounded fast-burnout exception applies.
- Threshold, warning lead-time, and the fast-burnout exception bound are tuning constants (prompt 02), tuned in prompt 17.
- Fuzzy only: no raw burnout number is exposed even here — the at-risk state is qualitative.

## Testing
Unit / integration:
- An engineer whose burnout approaches the threshold enters the at-risk state and is flagged.
- **Fairness:** a quit cannot fire without a preceding at-risk sprint (in the normal regime) — construct a run that would quit and assert the warning appeared first.
- **Fast-burnout exception:** the narrow case where warning may be compressed is explicitly bounded and tested (it does not silently swallow the general guarantee).
- Crossing the threshold (after warning) sets `status: 'failed'` and ends the run.
- The summary still renders on the quitting tick.
- The quit records a why-trace (crunch sprints + ignored warnings).
- Determinism: identical seeded run + actions ⇒ identical at-risk timing and quit sprint.
- Warning phrasing is sourced from content data and reads as human observation.

Manual verification checklist:
- [ ] Script the canonical scenario: crunch ~sprint 2 → at-risk read appears ~sprint 4 → quit ~sprint 5, with the warning clearly preceding the loss.
- [ ] Confirm no run produces an unforeseeable quit (warning always precedes, outside the bounded exception).
- [ ] `npm test` green.

## Out of Scope
- The post-mortem *screen* — prompt 14 (this produces the trace data; prompt 11 finalizes the post-mortem data).
- Summary formatting of fuzzy reads/trends — prompt 10.
- Hiring/backfill after a quit — deferred (a quit ends the run in Inc 1).
- Many-seed fairness sweep report — prompt 12 (this makes it checkable; 12 checks it at scale).
