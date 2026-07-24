# 44 — [Inc 5 · polish] Harness People-Loop Bars, Retune & Integration

> ⚠ **VALIDATE-FIRST.** The defining bar here — **prevention must be numerically cheaper than recovery** — is the mechanical heart of the whole game's thesis. If the harness shows recovery is cheaper than prevention, the game accidentally argues *for* churn, which is wrong (PRD §I5.6). Validate this bar hard, then confirm the felt result by playing.

## Context
Increment 5 plays end-to-end (39–43). Extend the harness with **people-loop bars**, retune, and add the integration test. This is where the game's core moral claim becomes a checkable mechanical property.

Read PRD §I5.6 (tuning outputs) and `CLAUDE.md` §12 (I-1 fairness, I-5 fail-axis, I-9).

## User Story
As the builder, I can verify that prevention is cheaper than recovery, single losses are survivable-but-setting-back, and no single well-warned departure death-spirals, so that the game's thesis holds mechanically before I validate the feel by playing.

## Acceptance Criteria
- [ ] Harness gains Increment 5 bars (PRD §I5.6):
  1. **Prevention cheaper than recovery** — retaining is numerically cheaper than losing-and-backfilling (or the game argues for churn — a failing bar).
  2. **Survivable but setback** — a single loss is survivable but clearly sets the run back.
  3. **No single-departure death-spiral** — no unavoidable spiral from one well-warned departure.
- [ ] Tunes hiring lag, fall-through probability, ramp curve, onboarding-drag magnitude, team-size floor, cascade-collapse definition, and hiring attention cost (PRD §I5.6).
- [ ] **Full prior bar suite green** (Inc 1–4) under the new fail-state model (I-9) — the Inc-1 fairness bar must now hold across the *revised* fail state and every cascade (I-1).
- [ ] Passing sets proposed with rationale + labeled fun-estimate; chosen values to tuning constants; PRD §I5.6 updated (living-doc).
- [ ] **Integration test:** a seeded run loses an engineer (foreseeably), survives into recovery, hires with lag + ramp, and recovers — asserting prevention-cheaper-than-recovery and no death-spiral; a separate scripted run drives a warned cascade to a legitimate terminal collapse.

## Technical Specs
- Add hiring/retention strategy drivers (retain-focused vs churn-and-backfill) to the harness — the prevention-vs-recovery bar is exactly the comparison of these strategies' costs.
- Honesty (§2): if recovery comes out cheaper than prevention, report it plainly as a failing thesis-critical bar and retune — do not fudge.

## Testing
Integration:
- Prevention-vs-recovery bar computes deterministically; a deliberately-cheap recovery is caught as failing, then retuned.
- Survivable-but-setback and no-death-spiral bars hold.
- Prior bars green under the revised fail state; fairness holds across cascades.
- Full integration run asserts recover-from-loss; separate run asserts a legitimate warned collapse.

Manual verification checklist:
- [ ] **Play a full Inc-5 run.** Does losing someone feel survivable but genuinely painful? Does the game clearly reward prevention over churn? This is the thesis — retune before Increment 6 if it wavers.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 6 (org layer) — next; it introduces the Manager entity and cashes the attention hook.
