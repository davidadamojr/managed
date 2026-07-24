# 58 — [Inc 7 · polish] Harness Peer Bars, Retune & Integration

> ⚠ **VALIDATE-FIRST.** Validates Increment 7 mechanically; whether the horizontal politics *feel* authentic (not arbitrary) is builder-validated by play. The defining bar — **negotiations winnable without always-escalating** — guards against leadership standing becoming a mandatory crutch. Chosen values stay decisions-to-validate until played.

## Context
Increment 7 plays end-to-end (52–57). Extend the harness with **peer bars**, retune, and add the integration test. Same fun-tuning workflow (PRD §10).

Read PRD §I7.6 (tuning outputs) and `CLAUDE.md` §12 (I-1 fairness, I-9).

## User Story
As the builder, I can verify negotiations are winnable without always-escalating, dependencies add non-arbitrary risk, peer reputation feels like a relationship, and transfers stay foreseeable, so that the horizontal layer works mechanically before I validate the feel by playing.

## Acceptance Criteria
- [ ] Harness gains Increment 7 bars (PRD §I7.6):
  1. **Negotiations winnable without always-escalating** (or leadership standing becomes a mandatory crutch).
  2. **Dependencies add risk without making roadmaps feel arbitrary.**
  3. **Peer reputation slow enough to feel like a relationship.**
  4. **Internal transfers stay foreseeable** (I-1 — the fairness bar now covers the sideways loss path).
- [ ] Tunes negotiation resolution weighting, dependency frequency + slip/miss rates, peer-reputation accrual/decay per interaction type, transfer probability vs neglect, and escalation cost in leadership standing (PRD §I7.6).
- [ ] **Full prior bar suite green** (Inc 1–6) with the peer layer active (I-9) — including the Inc-1 fairness bar now extended to internal transfer (every people-loss path foreseeable, I-1).
- [ ] Passing sets proposed with rationale + labeled fun-estimate; chosen values to tuning constants; PRD §I7.6 updated (living-doc).
- [ ] **Integration test:** a seeded run negotiates a contested resource, carries a peer dependency that slips, banks/burns peer reputation with different peers, and loses an engineer to a foreseeable internal transfer — asserting each bar and the intact three-way standing tension.

## Technical Specs
- Add peer strategy drivers (always-escalate, always-reciprocate, hoard-resources) — the winnable-without-escalating bar checks that a non-escalation strategy can still succeed.
- Honesty (§2): if negotiations are only winnable by escalating, report it as a failing bar and retune; no engine hacks.

## Testing
Integration:
- Each peer bar computes deterministically; a broken value (e.g. escalate-only-wins, unforeseeable transfer) is caught, then fixed.
- Prior bars green with peers active; fairness bar covers internal transfer.
- Full integration run asserts negotiation + dependency slip + peer-rep divergence + foreseeable transfer + three-way tension.

Manual verification checklist:
- [ ] **Play a full Inc-7 run.** Does managing sideways feel authentic — real bargains, real blocked-on-someone-else risk, real peer relationships? Does losing someone across the aisle sting? Retune before Increment 8 if not.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 8 (content, tone, manager burnout) — next; it's the second cash-in of the attention hook.
