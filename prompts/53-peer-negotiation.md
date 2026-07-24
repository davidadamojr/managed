# 53 — [Inc 7 · MVP] Peer Resource Negotiation

> ⚠ **VALIDATE-FIRST.** Negotiation resolution weighting (standing vs offer vs escalation) is a **decision-to-validate**: negotiations must be *winnable without always-escalating*, or leadership standing becomes a mandatory crutch (PRD §I7.6). Trustworthy only once peer reputation (prompt 52) and leadership standing (Inc 6) are settled.

## Context
Peer managers exist with a reputation track (52). This prompt adds **negotiation** — the horizontal bargain over shared scarce resources (headcount, a coveted hire, good projects, on-call burden, ownership of painful legacy systems). This is the juggle gone horizontal: no authority in either direction, only trade, reciprocity, and competition.

Read PRD §I7.2 (peer resource negotiation), §I7.3 (Negotiation entity), §I7.5, and `CLAUDE.md` §12 (I-4, I-6).

## User Story
As a manager, I want to negotiate with peer managers over shared scarce resources, so that resource allocation is a horizontal bargain, not just a top-down grant. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Negotiation` entity** (PRD §I7.3): a transient interaction over a contested resource/dependency; contains the stakes, each side's position, available moves (**trade / concede / hold / escalate**), and the resolution.
- [ ] **Resolution** depends on peer standing (prompt 52), what's offered, and — if escalated — leadership standing (couples to Inc 6) (PRD §I7.2).
- [ ] A **hiring freeze from Increment 6 often becomes a peer negotiation over which team eats it** (PRD §I7.2) — a concrete coupling.
- [ ] **Edge behaviors** (PRD §I7.2): a low-standing peer drives a harder bargain; escalating repeatedly spends leadership standing *and* burns the peer; refusing to negotiate is legal with reputational cost.
- [ ] Negotiations **shift peer (and possibly leadership) standing** on resolution — this is where prompt 52's reputation accrual/decay actually fires.
- [ ] Resolution weighting reads from tuning constants (I-6); deterministic (I-4); negotiations serialize.

## Technical Specs
- Negotiation resolution is a pure function of standing + offer + (escalation → leadership standing). Reuse the choice-interaction pattern (Inc 6) for the moves.
- The escalate move couples to Inc-6 leadership standing — escalation spends it; document the coupling.
- Honoring/reneging on a bargain adjusts peer reputation (prompt 52 track).

## Testing
Unit:
- A negotiation offers trade/concede/hold/escalate and resolves based on standing + offer.
- A low-standing peer drives a harder bargain.
- Escalating spends leadership standing and burns the peer.
- Refusing to negotiate is legal with a reputational cost.
- Honored bargains raise peer reputation; reneging lowers it.
- A hiring-freeze scenario becomes a which-team-eats-it negotiation.
- Weighting reads from constants; determinism + serialization hold.

Manual verification checklist:
- [ ] Negotiate a bad on-call-for-headcount trade: it helps your roadmap and hurts your team's burnout — the juggle, now horizontal.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Cross-team dependencies — prompt 54.
- Reputation's modulation of dependency responsiveness — prompt 55.
- Internal transfer — prompt 56.
- Peer Board UI — prompt 56.
