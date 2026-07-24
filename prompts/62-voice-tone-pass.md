# 62 — [Inc 8 · MVP] Voice & Tone Pass (Tone Lock)

> ⚠ **VALIDATE-FIRST.** This is where the tone recommendation **becomes a decision** (PRD §I8.5): wry, grounded, knowing comedy — humor from recognition, not slapstick or grimdark. The tone lock itself is the decision-to-validate here; the setting (recognizable generic modern tech org, not a named company) is locked, but scenario-flavored settings are deferred (a later decision-to-validate).

## Context
The event library is large and categorized (61). This prompt applies the game's **voice** consistently across all text — the humor that comes from recognition for anyone who's done the job. Tone is locked here (PRD §I8.5) but must never obscure legibility (the numbers/reads the player needs stay clear).

Read PRD §I8.2 (voice & tone), §I8.5 (tone lock, setting), and `CLAUDE.md` §8 (tone), §12 (I-6, I-7).

## User Story
As a manager, I want the game's voice to be wry, grounded, and recognizable, so that the humor comes from recognition for anyone who's done the job. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] The **locked wry-grounded voice** (PRD §I8.5) is applied consistently across event text, summaries, warnings, and the post-mortem.
- [ ] **Tone stays out of the way of legibility** (PRD §I8.2, I-7): flavor never obscures the numbers/reads the player needs — the at-risk warning, the debt meter, the standing tracks all remain clearly readable under the voice.
- [ ] **Setting: a recognizable generic modern tech org** (PRD §I8.5) — specific in texture (real absurdities: sprint theater, the meeting that should've been an email, the heroic on-call save nobody notices) without being a named/real company. Scenario-flavored settings are deferred (decision-to-validate).
- [ ] All voiced text lives in **content data** (I-6) — tone is authored, not hardcoded — so it can be revised without engine edits.
- [ ] Text selection remains deterministic (I-4).

## Technical Specs
- This is primarily a content pass over the data files (events, summaries, warnings, post-mortem strings), plus a light pass ensuring the view surfaces voiced text without letting it crowd the readable state.
- Establish a short voice guide in the content layer (a few principles + examples) so future content stays consistent — this becomes the reference for any later scenario settings.

## Testing
Unit:
- Voiced strings are data-sourced (no hardcoded copy in engine/view logic).
- Legibility check: the at-risk warning, debt meter, and standing values remain machine-readable/assertable regardless of surrounding flavor (tone doesn't obscure signal).
- Text selection is deterministic.

Manual verification checklist:
- [ ] Read events/summaries: they land as wry, grounded recognition-comedy — and you can still read every number you need.
- [ ] `npm test` green.

## Out of Scope
- Data-validation pass — prompt 63.
- Rich event presentation — prompt 64.
- Scenario-flavored settings — deferred (later decision-to-validate).
