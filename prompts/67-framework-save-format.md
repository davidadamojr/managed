# 67 — [Inc 9 · MVP] UI Framework Decision + Save Format

> ⚠ **VALIDATE-FIRST.** Two **decisions-to-validate** land here: the **UI framework** (React vs Svelte — builder-preference-driven, minor) and the **save format** (localStorage + file export — validated against actual need, PRD §I9.5). Neither touches simulation behavior (I-3, I-4). If the current view framework already serves, the framework "decision" may just be to keep it — don't rewrite for its own sake.

## Context
The game has a visual identity (66). This prompt settles two deferred decisions the PRD parks until now: the **UI framework** and the **save format** (localStorage + file export, so runs are portable and shareable). Both are view/persistence concerns; the engine is untouched (I-3, I-4).

Read PRD §I9.2 (constraint: no sim logic in UI), §I9.5 (framework, save format), and `CLAUDE.md` §12 (I-3, I-4).

## User Story
As the builder, I want the UI framework settled and runs saveable/shareable as files, so that the presentation platform and persistence are decided on real information. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **UI framework decision finalized** (PRD §I9.5): React vs Svelte, builder-preference-driven (Svelte lighter for this shape; React the safer default if known cold). Documented with rationale. If the existing framework already fits, "keep it" is a valid, documented outcome — no rewrite for its own sake.
- [ ] **Save format** (PRD §I9.5): **localStorage plus file export** (both) — runs are portable and shareable via exported files and re-importable. Validated against actual need (if file export proves unnecessary, that's a documented finding).
- [ ] **Determinism + round-trip preserved** (I-4): an exported-then-imported run resumes identically; the save format round-trips losslessly across the whole campaign feature set.
- [ ] **Engine untouched** (I-3): framework/persistence changes stay in view/persistence layers; the pure engine and its tests are unchanged.
- [ ] Save format is versioned enough to load within this increment (no cross-version migration promised beyond what's needed).

## Technical Specs
- The engine already serializes `GameState` (Inc-1 prompt 03/11); file export is that serialization written to a downloadable file; import reads it back. Reuse the existing serialization — do not build a second one.
- If a framework change is chosen, it is a view-layer reimplementation only; the engine and harness are imported unchanged (proving the wall, I-3).

## Testing
Unit:
- Export writes a lossless serialization; import restores it; an imported run resumes deterministically identical (I-4).
- Round-trip covers the whole campaign feature set (people, debt, incidents, org, peers, manager burnout).
- Engine + harness tests unchanged and green (wall intact).

Manual verification checklist:
- [ ] Export a mid-campaign run to a file, reimport it, and resume — identical state.
- [ ] `npm test` + full harness green.

## Out of Scope
- Engineer portraits — prompt 68.
- Moment-of-weight feedback — prompt 69.
- Unity port eval — prompt 70.
