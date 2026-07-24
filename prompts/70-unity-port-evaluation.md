# 70 — [Inc 9 · GROW] Unity Port Evaluation

> ⚠ **VALIDATE-FIRST.** `[GROW]` — this is an **evaluation, not an assumed port** (PRD §I9.5). The honest default is that the web version may well be sufficient; port only if richer presentation clearly justifies the cost. The **locked constraint**: do **not** live-embed a TS runtime in Unity — port the engine to C# or stay web (PRD §I9.2). The output is a decision on real information, not code.

## Context
The game is proven fun and polished (66–69). This `[GROW]` prompt is the builder-facing evaluation the whole clean-engine architecture was designed to keep cheap: **assess re-implementing the pure engine in C# behind a Unity front-end.** The pure, test-covered engine (the entire point of the engine/view wall, I-3) makes this a mechanical translation to *evaluate*, not a rewrite to commit to.

Read PRD §I9.2 (Unity port evaluation), §I9.5 (evaluated not assumed), and `CLAUDE.md` §12 (I-3 — the wall is what makes this cheap).

## User Story
As the builder, I want a clean evaluation of whether to port to Unity, so that I can decide the platform future on real information, not speculation. `[GROW]`

## Acceptance Criteria
- [ ] The evaluation covers the **mechanical TS→C# translation of the pure engine** (PRD §I9.2): scope the effort of porting the engine, and confirm **the tests port too and verify correctness** (the test suite is the correctness contract in either language).
- [ ] It weighs that cost against **the actual benefit richer presentation would add** (PRD §I9.2) — honestly, including the null result "web is sufficient."
- [ ] **Locked constraint honored** (PRD §I9.2): the evaluation does **not** propose live-embedding a TS runtime in Unity; the options are *port the engine to C#* or *stay web*.
- [ ] Output is a **written decision-support artifact** (feasibility, effort estimate, risks, recommendation) — not a port. The recommendation may be "stay web," and that must be presented as a fully legitimate outcome (the clean engine keeps the option cheap either way — the entire point of the architecture, PRD §I9.5).
- [ ] The evaluation confirms the engine's **purity/portability** empirically: e.g. verify the engine has zero view/DOM dependencies so a C# port is a direct translation (a structural audit — which doubles as an I-3 conformance check for the whole codebase).

## Technical Specs
- Deliverable is a document (feasibility + effort + risk + recommendation), optionally with a small proof-of-concept translation of one pure module + its tests to C# to ground the effort estimate — kept as evaluation evidence, not a committed port.
- The purity audit greps/enforces that the engine imports nothing from the view layer — the property that makes the port a translation rather than a rewrite.

## Testing
- Structural audit: the pure engine has zero view/DOM dependencies (I-3 conformance across the whole engine).
- If a PoC module is translated: its ported C# tests pass, matching the TS tests' assertions (correctness contract holds cross-language).

Manual verification checklist:
- [ ] The evaluation gives a real, costed recommendation — including whether "stay web" is the right call — with the engine's portability empirically confirmed.
- [ ] `npm test` + full harness green (the web build remains the source of truth).

## Out of Scope
- Actually committing to and executing a full Unity port — this is the evaluation only.
- Full-campaign regression + framing — prompts 71–74.
