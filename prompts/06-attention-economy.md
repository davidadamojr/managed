# 06 — The Attention Economy (with the depletable-attention forward hook)

## Context
Assignment and crunch intent exist (05). Now we build the **attention economy** — a small, scarce pool of managerial attention points the player spends each sprint on a minimal people-action set. This is the juggle on the management side. Critically, this prompt implements the **locked forward hook** (§5.6 of CLAUDE.md): attention *capacity* is derived from manager state, never hardcoded, so Increments 6 and 8 can modulate it without a retrofit.

Read `CLAUDE.md` §5.6 (forward hook — mandatory) and PRD §4.3 (attention economy).

## User Story
As a manager, I can spend a limited pool of managerial attention on a small set of people actions each sprint, so that I experience choosing what *not* to attend to.

## Acceptance Criteria
- [ ] **Action set (tiny, §9):** exactly three actions — **1:1** (sharpen the read on one engineer + small morale lift), **Unblock** (restore a stalled engineer's throughput this sprint), **Recognize** (a morale boost). No more actions in Increment 1 (bias toward cutting).
- [ ] Each action **costs attention** (~1 point each per §9, from tuning constants), targets an engineer, and its declared effect is recorded as intent in `SprintActions` (applied at resolution or during tick per each action's semantics, PRD §4.3).
- [ ] **Pool derives from manager state:** `attention.capacity === attentionCapacityFor(manager)` (§5.6). In Increment 1 this returns the base constant (candidate: 3), but the code path reads from `manager` — **no hardcoded literal capacity anywhere.**
- [ ] Spending decrements `remaining`; when `remaining` hits zero, further actions are **unavailable that sprint**, communicated plainly (not an error, PRD §4.3 edge cases).
- [ ] **No-op sprint legal:** spending zero attention is allowed and has consequences later (unattended engineers drift — the *rule* is prompt 07/08; here it must be representable).
- [ ] Attention **refreshes each sprint** and carries nothing over between sprints (Increment 1 has no manager-side depletion — but capacity is *modeled* as a function of manager state, not assumed stateless).
- [ ] The pool is smaller than the actions a player would like to take (scarcity is the core knob; err too tight, §9).

## Technical Specs
- **The one thing that must be right:** attention capacity is computed via `attentionCapacityFor(manager)`, not a constant literal in the pool or tick. This is the cheap-now / expensive-later architectural constraint. A code reviewer (or a later Claude session) must be able to see that Increment 6/8 can raise/lower capacity by changing manager state alone.
- Action costs come from tuning constants (prompt 02), not inline numbers.
- Actions are captured as intent in `SprintActions`; the actual state effects (morale lift, unblock, sharpened read) are applied deterministically in the tick (prompt 08) or here if an action's semantics are purely pre-tick — keep the boundary clean and documented.
- Pure and serializable throughout.

## Testing
Unit:
- `attention.capacity` equals `attentionCapacityFor(manager)`; grep/test confirms no hardcoded capacity literal in the pool or tick.
- **Forward-hook test:** artificially modulating a `manager` field changes computed capacity (proves the hook works even though Inc-1 manager fields are inert by default). This test guards the §5.6 constraint against future regression.
- Each of the three actions costs the configured attention and targets an engineer.
- Spending to zero makes further actions unavailable; the empty pool is a plain state, not an error.
- Zero-attention (no-op) sprint is legal and representable.
- Attention refreshes to capacity at sprint boundary; nothing carries over.
- Costs read from tuning constants (changing the constant changes cost with no code edit).

Manual verification checklist:
- [ ] With capacity 3 and ~1/action, the player can attend to a few engineers but never all.
- [ ] Empty pool reads plainly.
- [ ] `npm test` green.

## Out of Scope
- Applying action *effects* to morale/burnout/throughput — prompts 07–08 (this captures intent + economy + the capacity hook).
- Manager reputation / manager burnout that actually modulate capacity — Increments 6/8 (only the *hook* is built now).
- Attention UI (the tray) — prompt 13.
