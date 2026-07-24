# 08 — Sprint Resolution: the `tick`

## Context
All the pieces exist as pure units: RNG (01), content (02), entities/GameState (03), new-run (04), assignment/crunch intent (05), attention economy (06), and morale/burnout response functions (07). Now we assemble the **central pure function of the whole engine** — `tick(state, actions) => { state, summary }` (§5.1 of CLAUDE.md). This is the "Resolve" verb: it computes work, applies crunch, shifts morale and burnout, fires at most one event, and advances the sprint. It must be **deterministic** (§5.2).

Read `CLAUDE.md` §5.1 (tick signature — locked), §5.2 (determinism), and PRD §4.4 (sprint resolution).

## User Story
As a manager, I can resolve the sprint and see what shipped, so that I get concrete feedback on my assignment decisions — and my choices shift how people feel and accrue burnout that will surface later.

## Acceptance Criteria
- [ ] `tick(state, actions)` matches the **locked signature** (§5.1): pure, returns `{ state: newState, summary }`, never mutates the input, never performs I/O, never touches the DOM.
- [ ] **Determinism (hard):** identical `state` (carrying seed + rngState) + identical `actions` ⇒ identical `newState` and `summary`, every time. All randomness threads the seeded RNG in `GameState`; the advanced `rngState` is written into `newState`.
- [ ] **Work resolution:** computes each assigned engineer's progress against their ticket from skill-fit and current morale (morale modulates throughput, prompt 07); applies **crunch** (throughput boost + immediate burnout accrual per prompt 07); updates ticket `progress`/`status`; completed roadmap tickets advance roadmap progress.
- [ ] **Poor-fit** resolves to low throughput (no error); **idle** produces no work and the defined idle response; **over-capacity** simply leaves backlog unserved (no auto-balance).
- [ ] **People update:** applies morale (within-sprint) and burnout (across-sprint) deltas via the prompt-07 functions, including effects of attention actions spent (1:1/Recognize/Unblock) and unattended drift; clamps 0–100.
- [ ] **Event firing:** fires **at most one event** per sprint, selected from the eligible content set via seeded RNG, applies its declarative effect, and records it for the summary. (Increment 1: tiny set, one-per-sprint cap.)
- [ ] **Advance:** increments `sprintIndex`; refreshes attention to `attentionCapacityFor(manager)` for the next sprint.
- [ ] **Produces `SprintSummary` data** (the raw resolved outcomes) — the *fuzzy read/trend derivation* is prompt 10, but the tick emits the underlying resolved facts.
- [ ] **Attrition evaluation is invoked** here but its threshold/warning logic and terminal handling are prompt 09 — the tick calls into it at the correct point in resolution (after burnout update), and if a quit occurs the summary must still render (PRD §4.4).

## Technical Specs
- **Order of operations matters and must be fixed** (determinism + fairness): resolve work → apply crunch → update morale → update burnout → evaluate attrition (prompt 09) → fire event → derive summary → advance sprint. Lock and document this ordering; later prompts depend on it not drifting.
- No `Math.random`/`Date.now` anywhere. The only randomness is the seeded RNG threaded through the tick.
- Resolution must feel instant (small state, trivial compute — PRD §8). No async.
- The tick is the single integration point; keep systems as the pure functions built in 05–07 and *call* them here rather than reimplementing logic.

## Testing
Unit / integration:
- **Determinism:** same state + actions ⇒ deeply-equal `newState` + `summary` across repeated ticks; and across serialize→deserialize→tick (rngState resumes correctly).
- Work: a good-fit high-morale engineer ships more than a poor-fit or low-morale one.
- Crunch on ⇒ more throughput this sprint AND more burnout than crunch off (immediate bookkeeping).
- Idle engineer ships nothing and gets the idle response.
- Over-capacity backlog: excess tickets remain unserved; no auto-balance.
- Roadmap tickets completing advance roadmap progress; a roadmap miss is representable and does not set `status: 'failed'`.
- At most one event fires per sprint; event selection is seeded/deterministic.
- `sprintIndex` advances; attention refreshes via `attentionCapacityFor`.
- Input `state` object is unchanged after tick (purity).

Manual verification checklist:
- [ ] Run a scripted sprint via the harness; the summary data matches hand-computed expectations.
- [ ] Repeat the same seeded sprint — identical outcome.
- [ ] `npm test` green.

## Out of Scope
- Attrition threshold, warning lead-time, terminal state — prompt 09 (tick only *calls* the hook).
- Fuzzy reads / trends / at-risk flags formatting — prompt 10.
- localStorage / run lifecycle screens — prompt 11.
- The many-seed tuning harness + report — prompt 12.
- Any view — prompts 13–14.
