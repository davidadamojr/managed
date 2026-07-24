# 12 — The Tuning Harness & Mechanical Tuning Report

## Context
The full engine loop runs end-to-end: new-run → assign/attend/crunch → tick → attrition → summary → terminal state → persistence (04–11). Now we build the **tuning harness proper** — a first-class engine capability (§5.7 of CLAUDE.md, PRD §10/§12), not an afterthought. It runs many seeded simulations headlessly and emits a **mechanical tuning report** on the design's properties. This is the substrate for the fun-tuning workflow: Claude Code owns *mechanical* suitability via this harness; the builder owns *felt* fun by playing.

Read `CLAUDE.md` §5.7 (harness — first-class, the four bars) and PRD §10 (fun-tuning workflow) + §12 (headless testability requirement).

## User Story
As the builder, I can run many seeded simulations headlessly and get a report on whether the design meets its mechanical bars, so that parameters can be swept and validated automatically before I validate fun by playing.

## Acceptance Criteria
- [ ] The harness runs **N seeded full runs** headlessly (no UI) with configurable strategies (e.g. always-crunch, never-crunch, balanced, neglectful) and configurable parameter sets pulled from the tuning constants (prompt 02).
- [ ] It emits a **mechanical tuning report** covering the four bars (§5.7):
  1. **Echo timing:** does a sprint-~2 crunch cross the attrition threshold in the intended window (~sprint 4–5), not earlier (unforeseeable) or never (crunch is free)? Report the distribution of quit-sprints under a crunch strategy.
  2. **Fairness:** across many seeds, does the at-risk warning reliably precede attrition? Report any seed where a quit occurred without a preceding at-risk sprint (should be zero outside the bounded fast-burnout exception).
  3. **Dominant strategy:** is there an assignment/crunch strategy that trivializes the juggle? Report each strategy's completion rate and loss rate.
  4. **Roadmap achievability:** is the roadmap tight-but-achievable? Report roadmap-completion distribution — not trivial (always done early) nor impossible (never approached).
- [ ] For a candidate parameter set, the harness reports **pass/fail against each bar** with the supporting numbers, honestly (§2 — if a set fails, say so; do not flatter the design).
- [ ] The harness can **sweep** a parameter (e.g. burnout accrual rate across a range) and report how each bar responds, so Claude Code can propose parameter sets that pass, each with rationale.
- [ ] Deterministic and reproducible: a given seed set + parameter set ⇒ identical report.
- [ ] Runnable via `npm run harness` (extending the prompt-01 stub) with flags/config for N, strategy, and parameter set.

## Technical Specs
- The harness drives the **same pure engine** the view will use — no separate simulation path (that would let them diverge). It composes `newRun` + scripted `SprintActions` + `tick`.
- Strategies are simple deterministic policies over `GameState` producing `SprintActions` (they are *test drivers*, not game AI).
- Report output is plain data (JSON/console table) — greppable and diffable across parameter sets.
- This harness is what prompt 17 (tuning pass) consumes to settle final parameters.
- Keep it honest: the report states what *is*, not what's desired. Claude Code's fun-estimate (which candidate set is likely most fun) is offered *separately* and explicitly as a hypothesis for the builder to correct (PRD §10), not baked into the mechanical pass/fail.

## Testing
Unit / integration:
- Harness runs N seeded runs headlessly and produces a report deterministically (same inputs ⇒ same report).
- Echo-timing bar: under a crunch strategy on the candidate parameters, quit-sprints cluster in the intended window; the report surfaces the distribution.
- Fairness bar: report flags zero unforeseeable quits on the candidate set (outside the bounded exception); a deliberately-broken parameter set is detected as failing this bar (proves the check has teeth).
- Dominant-strategy bar: strategies produce differentiated completion/loss rates (no single trivializing strategy on the candidate set; the report would reveal one if present).
- Roadmap bar: completion distribution is neither all-early nor never.
- Sweeping a parameter changes the reported bars monotonically/sensibly.

Manual verification checklist:
- [ ] Run the harness on the §9 candidate parameters; read the report; confirm each bar's numbers are plausible and honestly reported.
- [ ] Break one parameter deliberately; confirm the relevant bar fails loudly.
- [ ] `npm test` + `npm run harness` both green/working.

## Out of Scope
- Actually settling final tuned values — prompt 17 (this is the instrument; 17 is the tuning pass).
- Human fun validation — builder-owned, via play (not automatable).
- Any view — prompts 13–14.
