# 71 — [Inc 9 · polish] Full-Campaign Regression (All Harness Bars Green Together)

> ⚠ **VALIDATE-FIRST.** This is the campaign-wide enforcement of I-9: every increment's mechanical bars must pass *together*, in the fully-assembled game. No new parameters — this catches cross-increment interactions that per-increment tuning missed.

## Context
All systems are built and polished (01–70). This prompt runs the **full-campaign harness regression**: every increment's mechanical bars, green simultaneously, on the complete game — because a value tuned correctly in isolation can drift when all nine increments interact.

Read `CLAUDE.md` §12 (I-9 harness grows + all bars stay green) and each increment's tuning-outputs section (§I2.6–§I8.6).

## User Story
As the builder, I can run the entire harness bar suite across all increments at once and see it green, so that I know no cross-increment interaction quietly broke a guarantee.

## Acceptance Criteria
- [ ] The harness runs **every increment's bars together** on the fully-assembled game:
  - Inc 1: echo timing, fairness (foreseeable warned loss).
  - Inc 2: debt ignorable-not-forever, no soft-lock, debt-slower-than-burnout.
  - Inc 3: incidents meaningful-not-pointless, perceptible debt→incident link, no death-spiral.
  - Inc 4: every archetype viable, growth earned-not-grindy, no instant contagion spirals.
  - Inc 5: prevention-cheaper-than-recovery, survivable-but-setback, no single-departure spiral.
  - Inc 6: shielding valuable-not-free, standing slow, leadership-reachable-without-crunch.
  - Inc 7: negotiations winnable-without-escalating, dependency risk not arbitrary, peer-rep slow, transfers foreseeable.
  - Inc 8: manager burnout recoverable+foreseeable, degraded reads impair-not-blind, library non-repeating.
- [ ] **The fairness meta-bar (I-1)** is asserted across **every** people-loss path together: attrition, cascade, internal transfer — all foreseeable, even under manager-burnout degraded reads.
- [ ] **The attention-hook (I-2)** is verified reading standing *and* burnout across the full game.
- [ ] Any cross-increment interaction that fails a bar is reported honestly (§2) as a finding to retune — not papered over.
- [ ] Runs deterministically (I-4); reproducible across seeds.

## Technical Specs
- This is an aggregation + orchestration prompt over the existing per-increment bars — reuse them all; do not re-implement. Add the cross-cutting meta-bars (fairness across all loss paths; attention hook across both modulators).
- Report format: a single campaign-health report with every bar's status and any cross-increment findings.

## Testing
Integration:
- The full bar suite runs and reports; all bars green on the assembled game.
- The fairness meta-bar covers every loss path simultaneously.
- The attention-hook meta-bar covers standing + burnout.
- A deliberately-introduced cross-increment break (e.g. manager burnout hiding a warning) is caught by the meta-bars, then fixed.

Manual verification checklist:
- [ ] Read the campaign-health report: everything green, or honest findings to retune before shipping.
- [ ] `npm test` + full harness green.

## Out of Scope
- Determinism/save property tests across the campaign — prompt 72.
- Campaign framing decision — prompt 73.
- Final integration run — prompt 74.
