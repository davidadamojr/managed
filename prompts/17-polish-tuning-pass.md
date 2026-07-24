# 17 — [polish] Parameter Tuning Pass (harness-driven)

## Context
The game is complete, hardened, and onboarded (13–16), and the tuning harness (12) can report on the four mechanical bars. This polish prompt runs the **tuning pass**: using the harness, sweep the Increment-1 parameters, find sets that pass the mechanical bars, and settle documented final candidate values — with Claude Code offering its **best-estimate of fun** as a hypothesis for the builder to correct by playing (§5.7 of CLAUDE.md, PRD §10). This resolves the one `[BLOCKING]` Increment-1 open question (PRD §13: core parameter tuning).

Read `CLAUDE.md` §5.7 and §9, and PRD §10 (fun-tuning workflow) + §13 (blocking open question).

## User Story
As the builder, I get harness-validated parameter sets that pass the mechanical bars plus Claude Code's best-estimate of the most fun set, so that I can start play-validation from a sound, documented baseline instead of raw guesses.

## Acceptance Criteria
- [ ] The pass tunes the Increment-1 parameters (PRD §10): **run length** (~5–6), **burnout accrual rate** from crunch/overload, **attrition threshold + warning lead-time**, **morale's effect on throughput**, **attention pool size + per-action costs**, and **roadmap size relative to capacity**.
- [ ] Each proposed parameter set **passes the four mechanical bars** (§5.7): echo timing (~sprint 4–5), fairness (warning precedes attrition), no dominant strategy, roadmap tight-but-achievable — with the harness numbers cited.
- [ ] Claude Code proposes a small number of passing sets, **each with rationale**, and names its **best-estimate-of-fun** pick explicitly as a *starting hypothesis the builder corrects by playing* — not a final verdict (PRD §10). Honesty over impressiveness (§2): if no set cleanly passes, say so and report the tradeoff, don't fudge.
- [ ] Final chosen candidate values are written back into the **tuning constants data file** (prompt 02) — no magic numbers move into engine code.
- [ ] The chosen values and their rationale are **documented in this repo** (e.g. a TUNING.md or a section of CLAUDE.md/PRD) so the decisions-to-validate are traceable, and the PRD's §6/§10 candidate values are updated to reflect what was settled (living-document discipline, PRD §14).
- [ ] The parameters are treated as **living** — the doc notes these are validated-mechanically, pending builder play-validation of fun.

## Technical Specs
- Drive everything through the prompt-12 harness against the real engine — no separate tuning path.
- Sweeps must be reproducible (seeded); the report backing each decision is saved/committed so a later session can re-verify.
- Keep the **mechanical pass/fail separate from the fun-estimate** in the writeup (PRD §10): bars are objective; the fun pick is a labeled judgment call.
- Do not silently change engine logic to make a parameter set pass — if a bar can't be met by parameters alone, that is a *design* finding to flag, not to paper over (§2).

## Testing
Integration:
- The harness confirms the chosen set passes all four bars (re-runnable, seeded).
- Tuning constants file now holds the chosen values; engine reads them (no new magic numbers).
- Re-running the harness on the committed set reproduces the documented report.

Manual verification checklist:
- [ ] Read the writeup: each proposed set has bar numbers + rationale; the fun-pick is clearly labeled as a hypothesis to correct by play.
- [ ] The PRD's candidate values are updated to reflect settled decisions, with decisions-to-validate noted.
- [ ] **Then hand off to play:** the builder plays runs on the chosen set to validate the felt echo (this step is builder-owned and not automatable — flag it as the next action).
- [ ] `npm test` + harness green.

## Out of Scope
- Human fun validation itself — builder-owned via play (Claude Code informs, doesn't decide, PRD §10).
- Changing engine mechanics to force a pass — flag design findings instead.
- Increment 2+ parameters (debt, incidents) — out of scope.
