# 56 — [Inc 7 · MVP] Internal Transfer + View: Peer Board, Dependency Markers, Transfer Notices

> ⚠ **VALIDATE-FIRST.** Transfer probability as a function of neglect is a **decision-to-validate**, and — non-negotiably — **internal transfers must stay foreseeable** (PRD §I7.6, I-1): the same fuzzy warning that precedes external attrition must precede a sideways loss. No unforeseeable loss on *any* people-loss path, ever.

## Context
Peer reputation modulates negotiation and dependencies (52–55). This prompt adds the pointed people-loss variant — **internal transfer** (losing an engineer sideways to a peer, not to the external market) — and the **view** for the whole peer layer: the Peer Board, dependency markers on the roadmap, and transfer notices.

Read PRD §I7.2 (internal transfer), §I7.3 (Engineer changed — transfer-considering), §I7.4 (UX additions), §I7.5, and `CLAUDE.md` §12 (I-1 fairness, I-3, I-7).

## User Story
As a manager, I want to sometimes lose an engineer to a peer's team via internal transfer, so that failing to grow or retain someone has a nearer, more pointed consequence — I lost them to the manager down the hall. `[ENHANCE]` — and I want the whole horizontal org legible on a Peer Board.

## Acceptance Criteria
- [ ] **Internal transfer** (PRD §I7.2): a poorly-grown/retained engineer may enter a **"transfer-considering" state** (PRD §I7.3, foreseeable + warned) that resolves to a transfer to a PeerManager's team — removing them from the roster but placing them somewhere still visible (stings differently than external attrition).
- [ ] **Fairness guarantee holds** (I-1, PRD §I7.5): a transfer is preceded by the same fuzzy warning as attrition — no unforeseeable loss. This wires into the *existing* warning machinery (I-1), not a new one.
- [ ] **Player may receive/poach transfers**, gated by peer standing (poaching burns the peer) (PRD §I7.2) — kept minimal (I-8; the active talent market is the gated depth, prompt 57 territory / deferred).
- [ ] **View — The Peer Board** (PRD §I7.4): peer managers, what they own, pairwise standing, open negotiations, shared dependencies — the horizontal org legible alongside the vertical Manager panel.
- [ ] **View — Dependency markers on the Roadmap:** roadmap items flagged blocked-on-a-peer-team, so externally-imposed schedule risk is visibly distinct from own-team throughput (from prompt 54's "not your fault" distinction).
- [ ] **View — Transfer notices:** the "she didn't leave the company, she went to Dave's team" beat, rendered with the appropriate sting.
- [ ] Engine-derived; **no peer/transfer logic in components** (I-3); panels-and-numbers, desktop, keyboard-operable, contrast (§7). Transfer probability reads from constants (I-6); deterministic (I-4).

## Technical Specs
- Internal transfer reuses the Inc-1 attrition warning path (I-1) and the Inc-5 multi-dimensional-loss accounting — a transfer is a loss variant, not a new loss system.
- Peer Board extends the view alongside the Manager panel (prompt 49); dependency markers extend the roadmap bar; transfer notices extend the summary/post-mortem.

## Testing
Unit:
- A neglected engineer enters "transfer-considering" (warned) and may transfer to a peer; the loss is foreseeable (I-1).
- Transfer removes them from the roster with the full multi-dimensional cost (reuses Inc-5 accounting), placed with a named peer.
- Poaching a peer's engineer is gated by peer standing and burns the peer.
- Transfer probability reads from constants; determinism holds.

Component:
- Peer Board renders peers, domains, pairwise standing, open negotiations, dependencies — from state.
- Roadmap shows dependency markers distinct from own-team items.
- Transfer notice renders with sting.
- Architecture check: no peer/transfer math in components.

Manual verification checklist:
- [ ] Neglect the junior you never found time to grow: get the warning, then lose her *across the aisle* — and see her on the Peer Board in every cross-team standup.
- [ ] `npm test` green; fairness harness bar green with transfer as a loss path (I-1).

## Out of Scope
- Reorg advocacy — prompt 57.
- Harness peer bars + integration — prompt 58.
- A rich active talent-transfer market — deferred (I-8) unless play demands it.
