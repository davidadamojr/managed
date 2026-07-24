# 55 — [Inc 7 · MVP] Peer Reputation Modulation (Negotiation + Dependency Responsiveness)

> ⚠ **VALIDATE-FIRST.** Peer-reputation accrual/decay per interaction type and its modulation strength are **decisions-to-validate**: peer reputation must be *slow enough to feel like a relationship* (PRD §I7.6). The three-way standing tension (team/leadership/peers) must be real without any single track dominating.

## Context
Peer reputation exists (52), negotiations shift it (53), and dependencies advance on peer timelines (54). This prompt ties them together: **peer reputation modulates negotiation outcomes and dependency responsiveness**, so how you've treated a peer changes how fast they unblock you and how hard they bargain — making the reputation track consequential across both mechanics.

Read PRD §I7.2 (peer reputation track), §I7.5, §I7.6, and `CLAUDE.md` §12 (I-4, I-6).

## User Story
As a manager, I want cross-team dependency resolution and negotiations to reflect my history with each peer, so that how I treat peers changes how fast I get unblocked and whether I get first dibs or a fight. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **Peer reputation modulates negotiation outcomes** (a trusted peer bargains softer; a burned one drives harder) — extends prompt 53's resolution weighting with the reputation term made consequential.
- [ ] **Peer reputation modulates dependency responsiveness** (PRD §I7.2): a peer you've reciprocated with delivers more responsively; a peer you've burned deprioritizes your dependency (within the irreducible-risk bounds from prompt 54 — good standing improves odds, never guarantees).
- [ ] **Accrual/decay per interaction type** (PRD §I7.6): reciprocating favors and honoring bargains raise it; burning, reneging, over-escalating lower it — each interaction type has its own tuned magnitude.
- [ ] **The three-way tension is real** (PRD §I7.5): pleasing leadership by escalating aggressively burns peers; hoarding resources to protect your team costs peer standing. No single track should dominate.
- [ ] Modulation strength + per-interaction rates read from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Fold the peer-reputation term into the negotiation resolution function (prompt 53) and the dependency advancement function (prompt 54) — single source of truth per mechanic, no divergent copies.
- Keep modulation bounded so reputation improves odds without erasing the irreducible dependency risk (prompt 54).

## Testing
Unit:
- High peer reputation softens negotiation and speeds dependency delivery; low reputation hardens and slows them.
- Even at high reputation, dependency risk isn't zero (bounds hold).
- Each interaction type (reciprocate, honor, burn, renege, over-escalate) shifts reputation by its tuned magnitude.
- The three-way conflict holds: an aggressive escalation raises/uses leadership standing while burning peer standing.
- Rates/strength read from constants; determinism holds.

Manual verification checklist:
- [ ] Bank goodwill with a peer, then get unblocked faster; burn another, then watch your dependency languish.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Internal transfer + Peer Board UI — prompt 56.
- Reorg advocacy — prompt 57.
- Harness peer bars — prompt 58.
