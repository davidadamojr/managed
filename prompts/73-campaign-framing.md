# 73 — [Inc 9 · polish] Campaign Framing (Win/Lose/Endless Revisited at Scale)

> ⚠ **VALIDATE-FIRST.** This is an explicit **campaign-level decision-to-validate** the PRD defers until the long game is playable (PRD cross-increment note). It can *only* be judged now, with Increments 5–8 built — do not settle it earlier. The PRD's leaning is **endless-with-self-defined-goals plus scenario/campaign structures**, on the human-outcome terminal conditions from Increments 5–6 — but confirm by playing the assembled long game.

## Context
The whole game is built, polished, and verified (01–72). The one deliberately-deferred design question can finally be answered: **what is the campaign framing?** Increment 1 answered it narrowly (soft roadmap, attrition-fail, no explicit win); the PRD says to revisit at campaign scale once Increments 5–8 exist (PRD cross-increment note).

Read PRD "Cross-increment note: campaign framing" and `CLAUDE.md` §12 (I-5 human-outcome fail axis).

## User Story
As the builder, I want the win/lose/endless framing settled on the actual assembled long game, so that the campaign has the right shape — decided from play, not speculation. `[polish]`

## Acceptance Criteria
- [ ] The framing decision is made **from the playable long game** (PRD cross-increment note): the leaning is **endless-with-self-defined-goals plus scenario/campaign structures**, built on the **human-outcome-based terminal conditions** from Increments 5–6 (team-floor + cascade) — but the decision is confirmed (or revised) against how the assembled campaign actually plays.
- [ ] **Fail axis stays human-outcome-based** (I-5): whatever framing is chosen, the run never ends on a metric miss — only on the human-outcome terminal conditions. This constraint is non-negotiable regardless of framing.
- [ ] If **scenario/campaign structures** are adopted, they are specced as a data-driven layer (I-6) — scenarios are content (starting conditions, self-defined goals), not new engine mechanics (I-8).
- [ ] **Self-defined goals** (if adopted) are player-set targets the game tracks and reflects, not new fail conditions — losing still happens only via the human-outcome terminal state.
- [ ] The decision is **documented with rationale** and any newly-specced scenario layer is added as decisions-to-validate for a future content pass (honest about what's settled vs provisional, §2).

## Technical Specs
- This prompt is primarily a design-decision + light-spec deliverable, optionally implementing a minimal scenario-selection layer (data-driven starting conditions) if play confirms it's wanted.
- Anything implemented stays within the wall (I-3) and the invariants; scenarios are content-as-data (I-6).

## Testing
- If a scenario layer is implemented: scenarios load as data; a scenario sets starting conditions without new engine mechanics; determinism holds (I-4).
- Fail-axis check: no framing option introduces a metric-based fail (I-5).

Manual verification checklist:
- [ ] **Play the assembled long game** and confirm the framing fits — endless-with-self-defined-goals feels right, or document the revision. The fail state is still always human.
- [ ] `npm test` + full harness green.

## Out of Scope
- Final integration run — prompt 74.
- A full scenario content library — future content pass (specced here as decisions-to-validate, not built out).
