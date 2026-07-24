# 32 — [Inc 3 · polish] Harness Incident Bars, Retune & Integration

> ⚠ **VALIDATE-FIRST.** This validates Increment 3 mechanically; felt chaos (does triage feel tense-but-fair?) is builder-validated by play afterward. The incident rates chosen here stay decisions-to-validate until played.

## Context
Increment 3 plays end-to-end (26–31). Now extend the harness with **incident-specific bars**, run the retune, and add the integration test. Same fun-tuning workflow (PRD §10).

Read PRD §I3.6 (tuning outputs) and `CLAUDE.md` §5.7 + §12 (I-9).

## User Story
As the builder, I can verify incidents disrupt meaningfully without making planning pointless or death-spiraling, so that I tune chaos from a sound baseline before validating the feel by playing.

## Acceptance Criteria
- [ ] Harness gains Increment 3 bars (PRD §I3.6):
  1. **Meaningful-not-pointless:** incidents disrupt meaningfully without making planning pointless.
  2. **Perceptible debt→incident link:** the coupling is detectable across a run (ties to prompt 28).
  3. **No death-spiral:** no seed produces an unavoidable death-spiral from incidents alone (I-5).
- [ ] Tunes baseline incident probability, debt-weighting, severity distribution, capacity demand per severity, neglect-consequence magnitudes, and on-call burnout rate (PRD §I3.6).
- [ ] **Full prior bar suite green** (Inc-1 echo/fairness, Inc-2 debt) with incidents active (I-9).
- [ ] Passing parameter sets proposed with rationale + labeled fun-estimate; chosen values written to tuning constants; PRD §I3.6 updated (living-doc).
- [ ] **Integration test:** a seeded run with fires exercises generate → triage → consequences → silent-success, asserting the debt→incident link and that no incident-only death-spiral occurs; Inc-1 echo + fairness still hold (I-1) with incidents in the mix.

## Technical Specs
- Add incident-strategy drivers (respond-all, ignore-all, triage-by-severity) to the harness; reuse the framework.
- Honesty (§2): no engine hacks to force a pass; flag design findings.

## Testing
Integration:
- Each incident bar computes deterministically; a broken rate (e.g. uncapped incidents) is caught, then reverted.
- Prior bars re-run green with incidents active.
- Full integration run asserts the coupling + no death-spiral + intact echo/fairness.

Manual verification checklist:
- [ ] **Play a full Inc-3 run.** Does the chaos feel like pressure-and-dark-comedy, not grief? Does losing someone still hurt amid the fires? Retune if not before Increment 4.
- [ ] `npm test` + harness green.

## Out of Scope
- Increment 4 (people depth) — next increment.
