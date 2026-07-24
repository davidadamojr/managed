# 48 — [Inc 6 · MVP] Standing Accrual/Decay & Dual-Track Tension

> ⚠ **VALIDATE-FIRST.** Both standing accrual/decay rates, standing's modulation strength, and the thresholds gating headcount/protection are **decisions-to-validate**: standing must be *slow enough to feel like reputation, not a toggle*, and **leadership standing must be reachable without mandatory crunch** (PRD §I6.6). This last is thesis-critical (I-5 spirit).

## Context
The manager has two standing tracks (45), org events pressure the team (46), and shielding spends standing (47). This prompt fully develops **standing accrual/decay and the dual-track tension** — the org layer's core fun: pleasing leadership by crunching spends team standing, and vice versa.

Read PRD §I6.2 (both reputation tracks), §I6.5 (dual-track, slow-moving), §I6.6 (tuning), and `CLAUDE.md` §12 (I-5 fail-axis).

## User Story
As a manager, I want standing with my team that I spend by over-crunching and bank by shielding, and standing with leadership that I earn by delivering and burn by failing, so that managing up and managing my team have real, compounding, and *conflicting* consequences. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Team standing** accrues from shielding/recognition/kept-promises and decays from repeated crunch/broken commitments; **leadership standing** accrues from reliable delivery and decays from misses (PRD §I6.2).
- [ ] **The two tracks conflict** (PRD §I6.5): pleasing leadership by crunching spends team standing; protecting the team by pushing back spends leadership standing. That three-way tension (with peers added in Inc 7) is the org layer's core fun.
- [ ] **Both slow-moving** — reputation, not a toggle (PRD §I6.6).
- [ ] **Leadership standing reachable without mandatory crunch** (PRD §I6.6, thesis-critical): sustainable delivery can earn it. If tuning ever makes crunch the only path to leadership standing, that is a failing bar (prompt 51).
- [ ] Standing thresholds **gate headcount/protection** perks (couples to Inc-5 hiring — high leadership standing eases headcount) (PRD §I6.6).
- [ ] Low leadership standing puts the team **first on the reorg chopping block** (PRD §I6.2).
- [ ] All rates/thresholds read from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Standing changes are applied in the tick from the sprint's actions (crunch asks, shielding, delivery outcomes). Reuse the standing fields from prompt 45.
- Standing modulates existing mechanics (morale cost, headcount access, reorg targeting) — no new subsystems (I-8).
- The reachable-without-crunch property is a hard, tested guard.

## Testing
Unit:
- Team standing rises on shield/recognize, falls on repeated crunch.
- Leadership standing rises on delivery, falls on misses.
- The conflict holds: a crunch-to-please-leadership sprint raises leadership standing and lowers team standing simultaneously.
- Both move slowly (multi-sprint to shift meaningfully).
- A no-crunch sustainable-delivery run can still earn leadership standing (guards the thesis).
- Standing thresholds gate a headcount/protection perk; low leadership standing raises reorg-targeting risk.
- Rates/thresholds read from constants; determinism holds.

Manual verification checklist:
- [ ] Feel the vise: every "please leadership" move costs you with the team, and every "protect the team" move costs you upward — with no clean option.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Standing UI (Manager panel) — prompt 49.
- Episodic branching reorgs — prompt 50.
- Peer standing (third track) — Increment 7.
- Harness org bars — prompt 51.
