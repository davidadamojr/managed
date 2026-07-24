# 69 — [Inc 9 · ENHANCE] Moment-of-Weight Feedback & Transitions

> ⚠ **VALIDATE-FIRST.** `[ENHANCE]` — build only if the base presentation earns it (I-8). **Feedback is view-only and must not alter deterministic outcomes** (PRD §I9.2, I-3, I-4). No simulation timing or values change; this is emphasis and transition on moments the engine already produces.

## Context
The game looks finished and people have faces (66–68). This `[ENHANCE]` prompt adds **feedback and transitions** to the key moments — level-ups, incidents, departures, standing shifts — so their emotional weight lands. This is presentation of moments the engine already computes; it changes nothing deterministic (I-3, I-4).

Read PRD §I9.2 (presentation feedback), §I9.4 (moment-of-weight feedback), and `CLAUDE.md` §12 (I-3, I-4).

## User Story
As a player, I want satisfying feedback and transitions on sprint resolution, so that the payoff moments land with weight. `[ENHANCE]`

## Acceptance Criteria
- [ ] **Transitions, emphasis, and feedback** are added to key moments (PRD §I9.2, §I9.4): level-ups, incidents, departures, standing shifts, the barely-survived incident — each given visual/emotional emphasis proportionate to its weight.
- [ ] **View-only, no deterministic change** (PRD §I9.2, I-3/I-4): feedback must not alter outcomes or timing of the simulation — a determinism regression proves identical seeded outcomes with feedback on/off.
- [ ] The **departure** and other loss moments are given weight **without undermining fairness** (I-1): the emphasis dramatizes a loss the player was already warned about; it never replaces the foreseeable warning with a surprise reveal.
- [ ] Feedback is **skippable/non-blocking** enough not to impede play (respects the desktop, keyboard-first posture, §7).
- [ ] Animation flags/presentation state live in the view only (PRD §I9.3), never in `GameState`.

## Technical Specs
- Feedback triggers off engine-emitted events (a departure occurred, a level-up occurred) — it reads outcomes, never computes or delays them. The engine resolves fully; the view animates the already-decided result.
- Determinism regression: outcome hash identical with feedback enabled vs disabled.

## Testing
Component:
- Key moments trigger their feedback from engine-emitted outcomes.
- Feedback is non-blocking/skippable.

Integration:
- Determinism regression: identical seeded outcomes with feedback on vs off (no timing/value change, I-4).
- I-1 check: the departure emphasis follows a prior warning; no surprise losses introduced by presentation.

Manual verification checklist:
- [ ] A level-up feels earned; a departure lands with weight — but nothing about the outcomes changed, and you always saw the loss coming.
- [ ] `npm test` + full harness green.

## Out of Scope
- Unity port eval — prompt 70.
- Full-campaign regression — prompt 71.
