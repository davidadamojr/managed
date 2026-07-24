# 57 — [Inc 7 · polish] Reorg Advocacy (Peer Standing Mediates Vertical Outcomes)

> ⚠ **VALIDATE-FIRST.** This is specced but **gated behind proof that the base peer layer (52–56) carries its weight in play** (PRD §I7.2, §I7.5, I-8). Build it only if the base horizontal layer proved fun. It also depends on Increment 6's reorg events existing (prompt 50). Advocacy strength is a decision-to-validate.

## Context
The base peer layer works (52–56). This polish prompt adds the political feedback loop: during Increment-6 reorg events, **peer standing mediates outcomes** — trusted peers advocate for your team/headcount, antagonized peers advocate against — so leadership standing becomes partly a function of *horizontal* relationships, not purely vertical delivery. This closes the loop between the two org axes.

Read PRD §I7.2 (reorg advocacy ENHANCE), §I7.5, and `CLAUDE.md` §12 (I-5, I-8).

## User Story
As a manager, I want peers to advocate for or against me in reorgs and resource decisions based on our history, so that peer reputation feeds back into the vertical org layer, and reorg outcomes aren't purely earned upward. `[ENHANCE]`

## Acceptance Criteria
- [ ] During Increment-6 reorg/mandate events (prompt 50), **peer standing mediates outcomes**: trusted peers improve the player's reorg outcomes (team/headcount protection); antagonized peers worsen them (PRD §I7.2).
- [ ] This makes **leadership standing partly a function of horizontal relationships** — a trusted-peer network can protect you in a reorg even with middling vertical delivery, and vice versa.
- [ ] **Human-outcome-based** (I-5): advocacy affects headcount/protection/team composition, never a metric-based fail; a bad reorg outcome routes through the Inc-5 human fail state, never a burndown miss.
- [ ] Advocacy is **the gated depth** (I-8): only built because the base peer layer proved fun; kept proportionate, not ballooned.
- [ ] Advocacy strength reads from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Advocacy folds peer standing into the reorg-event resolution (prompt 50) — extend that resolution, don't fork it. Peer standing becomes an input to reorg outcomes alongside leadership standing.
- Keep the coupling legible: the summary can note when a peer advocated for/against you in a reorg.

## Testing
Unit:
- A reorg with trusted peers yields better outcomes than the same reorg with antagonized peers.
- Leadership-standing outcomes shift measurably with peer standing (horizontal feeds vertical).
- Outcomes are human-outcome-based (headcount/protection), never a metric fail (I-5).
- Advocacy strength reads from constants; determinism holds.

Manual verification checklist:
- [ ] Go into a reorg with banked peer goodwill vs burned peers: feel the difference in how your team fares.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Harness peer bars + integration — prompt 58.
- Increment 8 systems.
