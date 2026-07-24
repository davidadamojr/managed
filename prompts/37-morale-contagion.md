# 37 — [Inc 4 · polish] Morale Contagion Along Strong Ties

> ⚠ **VALIDATE-FIRST.** Contagion strength/bounds are **decisions-to-validate**: contagion must be bounded so the team **can't spiral instantly from one bad mood** (PRD §I4.2, §I4.6). Trustworthy only once rapport rates (prompt 35) are settled.

## Context
Relationships modulate collaboration (35). This prompt adds **morale contagion**: morale spreads between engineers with strong ties, so a struggling engineer can drag down a friend, or a strong pairing can lift both. This makes relationships matter emotionally, not just mechanically — but it must be bounded to avoid instant spirals (I-8 restraint).

Read PRD §I4.2 (contagion), §I4.6 (contagion bounds), and `CLAUDE.md` §12 (I-1, I-7, I-8).

## User Story
As a manager, I want morale to spread between engineers with strong ties, so that a struggling engineer can drag down a friend, or a strong pairing can lift both. `[ENHANCE]`

## Acceptance Criteria
- [ ] Morale spreads along **strong ties** (high-rapport pairs from prompt 35): a low-morale engineer pulls a close tie down; a high-morale one lifts them.
- [ ] **Bounded** (PRD §I4.2): contagion is capped so the team can't spiral instantly from one bad mood — a per-tick contagion limit and decay prevent runaway cascades.
- [ ] Contagion follows **pairwise ties only** (no multi-hop chains — I-8, consistent with prompt 35).
- [ ] **Fairness preserved** (I-1): contagion can push an engineer toward attrition, but the fuzzy at-risk warning must still precede any quit — contagion never produces an *unforeseeable* loss.
- [ ] Contagion strength + bounds read from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Contagion is a pure step in the tick, applied after individual morale updates, reading the relationship graph (prompt 35). Bounded and non-recursive within a tick (no cascading multi-hop in one sprint).
- Because contagion feeds morale (which feeds throughput and, indirectly via burnout dynamics, attrition), re-verify the fairness guarantee holds with contagion active.

## Testing
Unit:
- A low-morale engineer drags a high-rapport tie down; a high-morale one lifts them.
- Contagion is bounded: a single very-low-morale engineer cannot instantly collapse the whole team in one tick.
- Only pairwise (no multi-hop cascade within a tick).
- **Fairness with contagion:** an engineer pushed toward the edge partly by contagion still gets the warning first (I-1).
- Strength/bounds read from constants; determinism holds.

Manual verification checklist:
- [ ] Let one engineer sour near a close friend: the friend dips, but the team doesn't instantly spiral.
- [ ] `npm test` green; fairness harness bar green with contagion active.

## Out of Scope
- Harness + retune + integration — prompt 38.
- Multi-hop / clique contagion — deferred (over-modeling).
