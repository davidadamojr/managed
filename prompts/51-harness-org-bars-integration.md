# 51 — [Inc 6 · polish] Harness Org Bars, Retune & Integration

> ⚠ **VALIDATE-FIRST.** The thesis-critical bar here is **leadership standing reachable without mandatory crunch** — if the org layer re-incentivizes crunch, it defeats the game's whole point (PRD §I6.5, I-5). Validate hard, then confirm the felt tension by playing. Chosen values stay decisions-to-validate until played.

## Context
Increment 6 plays end-to-end (45–50). Extend the harness with **org bars**, retune, and add the integration test. Same fun-tuning workflow (PRD §10).

Read PRD §I6.6 (tuning outputs) and `CLAUDE.md` §12 (I-2, I-5, I-9).

## User Story
As the builder, I can verify shielding is valuable-not-free, standing feels like slow reputation, and leadership standing is reachable without crunch, so that the org layer pressures without re-importing the crunch incentive — validated by play afterward.

## Acceptance Criteria
- [ ] Harness gains Increment 6 bars (PRD §I6.6):
  1. **Shielding valuable-but-not-free.**
  2. **Standing slow enough to feel like reputation, not a toggle.**
  3. **Leadership standing reachable without mandatory crunch** (thesis-critical, I-5).
- [ ] Tunes org-event frequency/severity, shield cost/efficacy, both standing accrual/decay rates, standing's modulation strength, and headcount/protection thresholds (PRD §I6.6).
- [ ] **Attention-hook regression bar** (I-2): confirm attention capacity correctly tracks manager standing across the harness (the payoff works at scale).
- [ ] **Full prior bar suite green** (Inc 1–5) with the org layer active (I-9) — the core juggle+people loop must survive; org must not eclipse it.
- [ ] Passing sets proposed with rationale + labeled fun-estimate; chosen values to tuning constants; PRD §I6.6 updated (living-doc).
- [ ] **Integration test:** a seeded run takes org hits, shields some (spending standing) and passes others down, hits a depleted-shield "couldn't protect them" beat, and shows the dual-track conflict — asserting the reachable-without-crunch bar and intact core loop.

## Technical Specs
- Add org strategy drivers (always-shield, always-pass-down, please-leadership-via-crunch, sustainable-delivery) — the reachable-without-crunch bar compares the last two.
- Honesty (§2): if leadership standing is only reachable via crunch, report it as a failing thesis-critical bar and retune; no engine hacks.

## Testing
Integration:
- Each org bar computes deterministically; a broken value (e.g. crunch-only leadership standing) is caught as failing, then retuned.
- Attention-hook regression bar passes (capacity tracks standing).
- Prior bars green with org active.
- Full integration run asserts the dual-track tension + reachable-without-crunch + intact core loop.

Manual verification checklist:
- [ ] **Play a full Inc-6 run.** Does managing up feel like a real vise without ever making crunch the "right" answer? Does the team still feel like the heart? Retune before Increment 7 if not.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 7 (peer layer) — next; reuses the Manager + standing machinery.
