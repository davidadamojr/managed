# 10 — The Sprint Summary: Fuzzy Reads, Trends & At-Risk Flags

## Context
The tick produces raw resolved outcomes (08) and the attrition system produces at-risk flags and quit traces (09). Now we derive the **Sprint Summary** — the single most important surface in Increment 1 (PRD §4.5). It renders what shipped, roadmap progress, **fuzzy per-engineer reads** (never raw numbers, §5.5 of CLAUDE.md), and — crucially — **trends**, because the coupling is only legible over time. This is derivation logic in the engine; the view (prompt 14) only displays it.

Read `CLAUDE.md` §5.5 (fuzzy — raw integers never shown) and PRD §4.5 + §6.4 (people-state readability, trends).

## User Story
As a manager, I want a sprint-end summary showing what shipped, how people feel, and who's at risk, so that the invisible state of the team is made legible at the one moment I most need to read it.

## Acceptance Criteria
- [ ] `SprintSummary` (type from prompt 03) is fully populated by the tick each sprint, containing: what shipped this sprint, roadmap progress overall (soft goal), per-engineer **fuzzy** state reads, at-risk flags (from prompt 09), and any event that fired.
- [ ] **Fuzzy reads only:** raw morale/burnout integers are **never** included in the summary. Reads are qualitative (e.g. "seems tired," "morale slipping," "steady," "checked out lately"). The mapping from internal value → qualitative read lives in the engine, sourced where possible from content data.
- [ ] **Trends are first-class:** the summary conveys *direction* over sprints ("throughput dropped again," "quiet two sprints running"), not just current state. This requires reading prior summaries/state to compute direction. **First-sprint summary shows state without direction** (no prior trend) — acceptable (PRD §4.5).
- [ ] A **1:1 action sharpens the read** on its target engineer (PRD §6.4): an engineer who received a 1:1 this sprint gets a more precise qualitative read than one who didn't.
- [ ] The at-risk read (from prompt 09) surfaces in the summary as the fuzzy early warning, phrased as human observation (§8).
- [ ] Retainable as run history (`history` on GameState) so trends and the post-mortem can reference prior sprints.

## Technical Specs
- Derivation is a **pure function of state** (the tick calls it). The view computes nothing about reads or trends — it only renders the produced `SprintSummary` (engine/view wall, §4).
- Qualitative bands (value ranges → read strings) come from content/tuning data where reasonable, so tuning can adjust legibility without engine edits.
- Trend computation reads prior summary/state; keep the window small and defined (e.g. compare to previous sprint, and optionally a 2-sprint direction) — enough to read "again"/"two sprints running."
- No raw numbers cross the summary boundary — this is a hard privacy line for the fuzzy design; a test asserts it.

## Testing
Unit:
- Summary contains what-shipped, roadmap progress, per-engineer fuzzy reads, at-risk flags, and fired event.
- **No raw morale/burnout integer appears anywhere in the serialized summary** (assert absence of the internal numeric fields).
- Fuzzy read reflects internal state qualitatively (low morale ⇒ a "slipping/tired"-band read; steady ⇒ steady).
- Trend: across two sprints of declining throughput, the summary expresses direction ("dropped again"); first sprint expresses state without direction.
- A 1:1'd engineer gets a sharper read than a non-1:1'd one.
- At-risk flag from prompt 09 surfaces with human-observation phrasing.
- Summary is retained in history for trend/post-mortem reference.

Manual verification checklist:
- [ ] Read a sprint-4 summary of a crunch-heavy run: the trends make the coming attrition legible (Priya's decline reads across sprints).
- [ ] Confirm no health-bar-style raw numbers leak.
- [ ] `npm test` green.

## Out of Scope
- Rendering the summary as UI — prompt 14.
- Post-mortem terminal screen — prompt 14 (renders the post-mortem data that prompt 11 finalizes from the retained history + why-trace).
- Any new people mechanics — this is derivation/legibility only.
