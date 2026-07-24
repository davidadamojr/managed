# 50 — [Inc 6 · polish] Episodic Reorg/Mandate Events with Branching Choices

> ⚠ **VALIDATE-FIRST.** Branching depth is a **decision-to-validate** gated behind proof that the base org layer (45–49) is fun (I-8: depth from interaction, not enumeration). Build the richer branching only if the simple version proved it carries its weight in play.

## Context
The base org layer works and is legible (45–49). This polish prompt deepens org events from modifiers into **episodic events with real branching choices** — the org layer as a source of narrative and dark comedy, not just a numeric hit. Gated behind the base layer proving fun.

Read PRD §I6.1 (`[ENHANCE]` reorgs as episodic events) and `CLAUDE.md` §12 (I-6, I-8), §8 (tone).

## User Story
As a manager, I want reorgs and mandate shifts to arrive as episodic events with real choices, so that the org layer is a source of narrative and dark comedy, not just a modifier. `[ENHANCE]`

## Acceptance Criteria
- [ ] Selected org events gain **branching choices** with meaningfully different consequences (not just accept/pass-down), routed through standing/morale (I-5 — never a metric fail).
- [ ] Branches are **data-driven** (I-6): the branching structure lives in OrgEvent data, not engine logic.
- [ ] Tone is wry, grounded, recognizable (§8) — the dark comedy of org life (full tone lock is Increment 8, but these read in-voice now).
- [ ] Depth is **added only where it earns its weight** (I-8): a small set of rich branching events, not every org event balloon-ed.
- [ ] Deterministic (I-4); serializes.

## Technical Specs
- Extend the OrgEvent data schema (prompt 46) to support branches; the engine interprets branch data (still content-as-data).
- Reuse the choice-interaction UI (prompt 49) for branches.

## Testing
Unit:
- A branching org event offers multiple choices with distinct consequences.
- Branch structure is data-driven (no hardcoded branches).
- Consequences route through standing/morale, never a metric fail (I-5).
- Determinism + serialization hold.

Component:
- Branching choices render with visible distinct costs.

Manual verification checklist:
- [ ] Hit a branching reorg: the choices feel like real, costed dilemmas with narrative flavor.
- [ ] `npm test` green.

## Out of Scope
- Harness org bars + integration — prompt 51.
- Peer-mediated reorg advocacy — Increment 7 (prompt 57).
- Full tone/event-library — Increment 8.
