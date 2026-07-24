# 11 — Run Lifecycle, Terminal States & localStorage Persistence

## Context
The engine now runs full sprints (08), handles attrition with a why-trace (09), and derives rich summaries with history (10). Now we complete the **run lifecycle**: terminal states (completion vs attrition-fail), the **post-mortem** trace where the lesson lands, and **localStorage persistence** so a multi-sprint session isn't lost. Serialization already exists (03) and is near-free because state is plain data and ticks are deterministic (§5.2).

Read PRD §4.6 (run lifecycle & persistence) and `CLAUDE.md` §5.3 (serializable state).

## User Story
As a manager, I can save and resume my run, and reach a readable terminal state, so that a multi-sprint session isn't lost and the outcome — especially a loss — teaches me why it happened.

## Acceptance Criteria
- [ ] **Completion terminal state:** reaching the final sprint (run length, §9) with the team intact sets `status: 'completed'` and produces a run summary. No victory screen beyond a plain run summary (PRD §6.2 — a prototype hasn't earned a tuned win).
- [ ] **Attrition-fail terminal state:** a quit sets `status: 'failed'` and produces a **post-mortem**: who left and a *readable trace of why* — the crunch sprints, the ignored warnings (data from prompt 09). This is where the lesson lands (PRD §4.6).
- [ ] **Early roadmap completion does not end the run** (PRD §4.4/§6.2 default): if the roadmap finishes before the final sprint, the run continues to its scheduled end (calmer finish). (Decision-to-validate — keep the default.)
- [ ] **localStorage persistence (Layer 4):** save the full serialized `GameState` to localStorage and load it back, resuming an in-progress run exactly (determinism + serialization make this exact). File export is deferred (§12 of PRD).
- [ ] **Save/resume failure** (rare, localStorage) surfaces a plain, dismissible message — not an error crash (PRD §7).
- [ ] **No save-format forward-compatibility promise** across increments (PRD §4.6) — runs are disposable; a version marker in the save is fine but cross-increment migration is out of scope.
- [ ] Persistence lives in `/src/persistence` (Layer 4) and depends only on the pure `serialize`/`deserialize` from prompt 03 — no game rules in the persistence layer.

## Technical Specs
- Persistence is the only place localStorage is touched; the engine remains pure and storage-agnostic (§4). The engine never reads/writes storage itself.
- Resume path: load string → `deserialize` → resume ticking; `rngState` restores the exact RNG position so the run is bit-identical to an uninterrupted play (assert this).
- Terminal-state detection is derived from `status` produced by the tick (08/09), not recomputed in the persistence or view layer.
- Post-mortem content is assembled from the retained `history` + why-trace, formatted as readable data for the view (the *screen* is prompt 14; the *data* is finalized here).

## Testing
Unit / integration:
- Reaching final sprint intact ⇒ `status: 'completed'` + run summary.
- A quit ⇒ `status: 'failed'` + post-mortem data containing who left and a why-trace (crunch sprints, ignored warnings).
- Early roadmap completion ⇒ run continues to scheduled end (does not end early).
- **Save/resume exactness:** save mid-run → load → continue; result is deeply-equal to the same run played without interruption (rngState restored).
- Save failure path surfaces a plain message, no crash.
- Persistence layer imports only serialize/deserialize + storage — no engine rules (architecture check).

Manual verification checklist:
- [ ] Play 2 sprints, save, reload the harness/state, finish the run — outcome identical to an uninterrupted run.
- [ ] Trigger an attrition loss; the post-mortem traces the crunch and the ignored warning readably.
- [ ] `npm test` green.

## Out of Scope
- The post-mortem / completion *screens* as UI — prompt 14 (this produces their data).
- Hiring/backfill — deferred (a quit ends the run).
- File export / cross-increment save migration — deferred.
- The tuning harness — prompt 12.
