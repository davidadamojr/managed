# 54 — [Inc 7 · MVP] Cross-Team Dependencies

> ⚠ **VALIDATE-FIRST.** Dependency frequency and slip/miss rates are **decisions-to-validate**: dependencies must *add risk without making roadmaps feel arbitrary* (PRD §I7.6). Trustworthy only once peer standing (52) and negotiation (53) are settled.

## Context
Peer negotiation works (53). This prompt adds **cross-team dependencies** — roadmap tickets that depend on a peer team's delivery the player cannot command. This is schedule risk the player *didn't create and can't control* — thematically the authentic core of peer relationships (the lack of authority is the point).

Read PRD §I7.2 (cross-team dependencies), §I7.3 (Dependency entity), §I7.5, and `CLAUDE.md` §12 (I-4, I-5, I-6).

## User Story
As a manager, I want my roadmap to sometimes depend on another team delivering something I can't command, so that I face schedule risk I didn't create and can only negotiate, escalate, or absorb. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] **`Dependency` entity** (PRD §I7.3): belongs to a roadmap Ticket; contains the owning peer team, an expected-delivery timeline, and current status. Lifecycle: created with the ticket → advances on the peer team's timeline (modulated by standing/trades, prompt 55) → resolves (delivered / slipped / missed), **gating the dependent ticket**.
- [ ] **Not directly player-controllable** (PRD §I7.3 key constraint, §I7.5): the player can negotiate priority, escalate, trade a favor, or absorb the slip — but cannot command delivery. That lack of control is the point.
- [ ] **Irreducible risk** (PRD §I7.2): a peer team can miss regardless (their own invisible fires), so dependencies carry risk that never fully goes away — but a blocked dependency is **not the player's own team's fault** (thematically distinct from their own throughput).
- [ ] A blocked dependency **slips the dependent roadmap ticket**, never directly ends the run (I-5).
- [ ] Dependency frequency + slip/miss rates read from tuning constants (I-6); peer-team delivery timeline advances via seeded RNG (I-4).
- [ ] Dependencies serialize.

## Technical Specs
- Dependency advancement happens in the tick on the peer team's timeline, modulated by peer standing/trades (full modulation in prompt 55). The player's own actions can influence but not set it.
- Keep the "not the player's fault" distinction legible in the data so the view (prompt 56) can flag externally-imposed risk distinctly from own-team throughput.

## Testing
Unit:
- A roadmap ticket can carry a dependency on a peer team; the dependency gates the ticket.
- The player cannot directly complete/command a dependency (only negotiate/escalate/trade/absorb).
- A peer team can miss regardless (irreducible risk exists even at good standing).
- A blocked dependency slips the ticket, never ends the run (I-5).
- Frequency/rates read from constants; timeline advance is deterministic; serialization holds.

Manual verification checklist:
- [ ] Have a roadmap item blocked on a peer's API: feel schedule pressure you didn't create and can't simply fix.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Peer-reputation modulation of responsiveness — prompt 55.
- Internal transfer + Peer Board UI — prompt 56.
- Reorg advocacy — prompt 57.
