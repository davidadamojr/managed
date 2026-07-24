# 52 — [Inc 7 · MVP] PeerManager Entity & Peer Reputation Track

> ⚠ **VALIDATE-FIRST.** Do not start Increment 7 until Increment 6 is built and played. Peers are sequenced **after** the vertical org layer is confirmed fun (PRD §I7 depends-on) — the harder-to-tune social politics come after the simpler vertical axis works. Peer-reputation accrual/decay rates are **decisions-to-validate**. Reuses the Manager + standing machinery from Increment 6.

## Context
Increment 6 is built and played; the vertical org layer works. This begins Increment 7, adding the *horizontal* axis — peer managers you have no authority over and who have none over you. This prompt adds the **PeerManager entity** and a **third standing track** (peer reputation), pairwise per peer, distinct from team and leadership standing.

Read PRD §I7.3 (PeerManager entity), §I7.5 (decisions), and `CLAUDE.md` §12 (I-4, I-6).

## User Story
As a manager, I want peer reputation as its own standing track — reciprocity banked with managers I help, friction earned with managers I burn — so that how I treat peers changes how fast I get unblocked and whether I get first dibs or a fight. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`PeerManager` entity** (PRD §I7.3): belongs to `GameState` (an org roster of peer managers); contains name, the team/domain they own, and a **pairwise peer-reputation value toward the player**.
- [ ] **Peer reputation is a distinct third track** (PRD §I7.5): not folded into leadership standing, and **not a single global number** — **pairwise per peer** (you can be trusted by one peer and at war with another), mirroring the Inc-4 engineer-relationship model (reuse that proven pattern).
- [ ] Peer reputation is **raised by reciprocating favors and honoring bargains, lowered by burning peers, reneging, or over-escalating** (PRD §I7.2) — the accrual logic lands with negotiations (prompt 53); this prompt establishes the track + entity.
- [ ] **Slow-moving** like the other standing tracks (PRD §I7.2).
- [ ] `Manager` entity gains the peer-reputation dimension alongside team and leadership standing (PRD §I7.3 Manager changed).
- [ ] Rates read from tuning constants (I-6); deterministic (I-4); entities serialize.

## Technical Specs
- Reuse the Inc-4 pairwise-relationship pattern for per-peer reputation (proven model, per PRD §I7.5) and the Inc-6 standing machinery for accrual/decay mechanics.
- Peer managers are present for the campaign; seed the peer roster at run start.

## Testing
Unit:
- PeerManager entities exist with name, owned domain, and pairwise reputation toward the player.
- Peer reputation is pairwise (trusted by one, at war with another simultaneously) — not global.
- Peer reputation is a distinct track from team/leadership standing.
- Reputation is slow-moving.
- Rates read from constants; determinism + serialization hold.

Manual verification checklist:
- [ ] Inspect the peer roster: distinct managers with distinct domains and independent pairwise standing.
- [ ] `npm test` green; all prior harness bars green (I-9).

## Out of Scope
- Negotiations (where reputation shifts) — prompt 53.
- Dependencies — prompt 54.
- Reputation modulation of outcomes — prompt 55.
- Peer Board UI — prompt 56.
