# 65 — [Inc 8 · polish] Harness Manager-Burnout Bars, Retune & Integration

> ⚠ **VALIDATE-FIRST.** Validates Increment 8 mechanically; whether manager burnout lands as the game's *emotional peak* is builder-validated by play. The defining bars — **manager burnout recoverable + foreseeable**, and **degraded reads impair without blinding** — are fairness guarantees applied to the player (I-1). Chosen values stay decisions-to-validate until played.

## Context
Increment 8 plays end-to-end (59–64). Extend the harness with **manager-burnout + library bars**, retune, and add the integration test. Same fun-tuning workflow (PRD §10).

Read PRD §I8.6 (tuning outputs) and `CLAUDE.md` §12 (I-1, I-2, I-9).

## User Story
As the builder, I can verify manager burnout is recoverable and foreseeable, degraded reads impair without blinding, and the event library doesn't repeat within a campaign, so that the emotional peak works mechanically before I validate the feel by playing.

## Acceptance Criteria
- [ ] Harness gains Increment 8 bars (PRD §I8.6):
  1. **Manager burnout recoverable and foreseeable** (I-1 for the player — a spiral you can see coming and pull out of, never an unfixable trap).
  2. **Degraded reads impair without fully blinding** (the fairness floor from prompt 60 — at-risk warnings stay perceptible at max manager burnout).
  3. **Event library non-repeating** within a campaign (ties to prompt 61's per-category counts + prompt 63's coherence guard).
- [ ] Tunes manager-burnout accrual rates per self-spending action, the attention-capacity penalty curve, the read-degradation mapping, recovery rate, and event-library category sizes (PRD §I8.6).
- [ ] **Attention-hook regression bar** (I-2): capacity correctly reflects *both* standing (Inc 6) and burnout (Inc 8) across the harness — the second cash-in works at scale.
- [ ] **Full prior bar suite green** (Inc 1–7) with manager burnout + expanded library active (I-9).
- [ ] Passing sets proposed with rationale + labeled fun-estimate; chosen values to tuning constants; PRD §I8.6 updated (living-doc).
- [ ] **Integration test:** a seeded long run drives the manager into burnout (foreseeably), degrades reads (without hiding an at-risk warning), then recovers by easing off — asserting each bar, the fairness floor, and non-repeating events.

## Technical Specs
- Add manager-load strategy drivers (shield-everything, self-preserving, balanced) — the recoverable bar checks that the self-preserving strategy pulls out of the spiral.
- The library non-repetition bar samples a full-campaign-length event draw and checks distribution.
- Honesty (§2): if manager burnout is an unfixable spiral or degraded reads hide the at-risk warning, report as a failing fairness-critical bar and retune; no engine hacks.

## Testing
Integration:
- Each bar computes deterministically; a broken value (e.g. unrecoverable burnout, blinding reads, a repeating library) is caught, then fixed.
- Attention-hook regression bar passes (capacity reflects standing + burnout).
- Prior bars green with Inc-8 active.
- Full integration run asserts foreseeable-recoverable burnout + fairness floor + non-repeating events.

Manual verification checklist:
- [ ] **Play a full Inc-8 run.** Does manager burnout land as the game's truest note — poignant, self-inflicted, survivable? Can you always see a loss coming even when fried? Retune before Increment 9 if not.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 9 (presentation + Unity eval) — final increment; changes no simulation behavior.
