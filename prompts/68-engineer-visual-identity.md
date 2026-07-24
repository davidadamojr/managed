# 68 — [Inc 9 · ENHANCE] Engineer Visual Identity (Portraits / Expressive State)

> ⚠ **VALIDATE-FIRST.** `[ENHANCE]` — build only if the base visual identity (66) proved it earns further investment (I-8). View-only; changes no simulation behavior (I-3). Expressive state must render the *existing fuzzy reads* (I-7, I-1) — a portrait may look strained, but must never leak a precise numeric state the reads deliberately withhold.

## Context
The game looks finished (66–67). This `[ENHANCE]` prompt gives the characters you've grown attached to **faces** — portraits or equivalent visual identity, with expressive state so attachment is reinforced visually, not only numerically. View-only; the wall holds (I-3).

Read PRD §I9.2 (constraint), §I9.4 (engineer visual identity), and `CLAUDE.md` §12 (I-1, I-3, I-7).

## User Story
As a player, I want the people to feel present — portraits/visual identity, expressive state — so that my attachment to them is reinforced visually, not only numerically. `[ENHANCE]`

## Acceptance Criteria
- [ ] Each engineer has a **visual identity** (portrait or equivalent) so the characters have faces (PRD §I9.4).
- [ ] **Expressive state**: the visual reflects the engineer's state — but renders the **existing fuzzy read** (I-7), never a precise hidden number. A strained-looking portrait mirrors a fuzzy "running hot" read; it must not become a de-facto exact morale gauge (that would break I-7 and, if it revealed at-risk status too precisely or too late, I-1).
- [ ] **Fairness preserved** (I-1): the at-risk warning remains the authoritative foreseeability signal; portraits reinforce but never replace or contradict it.
- [ ] **No simulation behavior change** (I-3): determinism regression holds; portraits are pure view.
- [ ] Portrait assets/config live in the view layer only (never in `GameState`, PRD §I9.3).

## Technical Specs
- Expressive state is a pure function of the *already-derived fuzzy read* (not raw morale/burnout) → visual variant. Consume the engine's read output, not internal state, so the wall and I-7 both hold.
- Portraits are view assets; generation/config is view-layer. Keep `GameState` free of presentation state (PRD §I9.3).

## Testing
Component:
- Each engineer renders a portrait; expressive variant maps from the fuzzy read (not raw numbers).
- I-7 check: the portrait exposes no more precision than the fuzzy read already does.
- I-1 check: the at-risk warning remains the authoritative signal; the portrait doesn't contradict or preempt it.

Integration:
- Determinism regression: identical seeded outcomes before/after portraits (no behavior change).

Manual verification checklist:
- [ ] Your grown, attached-to engineers have faces that subtly reflect how they're doing — without turning into exact gauges.
- [ ] `npm test` + full harness green.

## Out of Scope
- Moment-of-weight feedback — prompt 69.
- Unity eval — prompt 70.
