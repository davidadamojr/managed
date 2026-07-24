# 38 — [Inc 4 · polish] Harness People-Depth Bars, Retune & Integration

> ⚠ **VALIDATE-FIRST.** Validates Increment 4 mechanically; whether growth *feels* rewarding and people *feel* individual is builder-validated by play. Chosen values stay decisions-to-validate until played.

## Context
Increment 4 plays end-to-end (33–37). Extend the harness with **people-depth bars**, retune, and add the integration test. Same fun-tuning workflow (PRD §10).

Read PRD §I4.6 (tuning outputs) and `CLAUDE.md` §5.7 + §12 (I-9).

## User Story
As the builder, I can verify every archetype is viable, growth is earned-not-grindy, and contagion causes no instant spirals, so that I tune depth from a sound baseline before validating the feel by playing.

## Acceptance Criteria
- [ ] Harness gains Increment 4 bars (PRD §I4.6):
  1. **Every archetype viable** (none unmanageable, none a trap).
  2. **Growth earned-not-grindy** within a run.
  3. **No instant morale spirals** from contagion.
- [ ] Tunes archetype modifier magnitudes, growth rate, stretch risk/reward, rapport shift rate, collaboration bonus size, contagion strength/bounds (PRD §I4.6).
- [ ] **Full prior bar suite green** (Inc 1–3) with people-depth active (I-9) — crucially, the Inc-1 echo + fairness must survive the added people complexity.
- [ ] Passing sets proposed with rationale + labeled fun-estimate; chosen values to tuning constants; PRD §I4.6 updated (living-doc).
- [ ] **Integration test:** a seeded run exercises archetype-differentiated reactions, a coached level-up, a rapport build, and bounded contagion — asserting each bar and intact echo/fairness (I-1).

## Technical Specs
- Add people-depth strategy drivers (invest-heavy, neglect, stretch-everyone) to the harness; reuse the framework.
- Honesty (§2): no engine hacks to force a pass.

## Testing
Integration:
- Each bar computes deterministically; a broken value (e.g. an unmanageable archetype, a grindy growth rate, an unbounded contagion) is caught, then reverted.
- Prior bars re-run green with people-depth active.
- Full integration run asserts differentiated reactions + earned growth + bounded contagion + intact echo/fairness.

Manual verification checklist:
- [ ] **Play a full Inc-4 run.** Do the engineers feel like individuals? Does growing one feel like something you built? Does losing one still hurt (now that you're more attached)? Retune if not before Increment 5.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 5 (attrition consequences + hiring) — next; note Inc 5 *changes the fail state*, so play Inc 4 thoroughly first.
