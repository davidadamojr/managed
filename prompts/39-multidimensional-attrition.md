# 39 — [Inc 5 · MVP] Multi-Dimensional Attrition

> ⚠ **VALIDATE-FIRST.** Do not start Increment 5 until Increments 1–4 are built and played — **this increment changes the fail-state model, which is only safe once the sting of loss is well understood from play** (PRD §I5 depends-on). The magnitude of each loss dimension is a **decision-to-validate** against how loss felt in Increments 1–4.

## Context
Increments 1–4 are built and played; you now know how loss stings. This begins Increment 5, which completes the people system by making loss *survivable but genuinely painful*. This first prompt makes attrition **multi-dimensional**: losing an engineer costs their skills, their relationships, and their institutional knowledge — all at once — before the fail-state model itself changes (prompt 40).

Read PRD §I5.2 (multi-dimensional attrition), §I5.4 (post-mortem), and `CLAUDE.md` §12 (I-1 fairness, I-7).

## User Story
As a manager, I want losing an engineer to cost me their skills, their relationships, and their institutional knowledge all at once, so that attrition is a real, multi-dimensional setback, not just a missing worker. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] When an engineer leaves, the system **removes their skills**, **dissolves their relationships** (with contagion consequences for close ties, from prompt 37), and **removes any institutional-knowledge benefit** they conferred (PRD §I5.2).
- [ ] The **full cost is surfaced legibly** in the summary/post-mortem (extends the Inc-1 post-mortem screen, prompt 14) — the departure itemizes what walked out the door.
- [ ] **Losing a highly-connected or highly-grown engineer is disproportionately painful** by design (their relationships + accumulated growth amplify the loss).
- [ ] **The loss remains foreseeable** (I-1): the fuzzy at-risk warning from Increment 1 still precedes it — no unforeseeable loss, ever.
- [ ] Institutional knowledge is modeled minimally (e.g. a benefit an engineer confers to systems/tickets they "own") — enough to be lost, not a heavy new subsystem (I-8).
- [ ] Deterministic (I-4); loss magnitudes read from tuning constants where numeric (I-6).

## Technical Specs
- This extends the Inc-1 attrition path (prompt 09): the quit now triggers multi-dimensional removal. Reuse the relationship-dissolution already stubbed in prompt 35.
- Do NOT change the fail-state model yet — a quit still (for this prompt) ends the run as in Inc 1; prompt 40 replaces that. Keep the two changes separate so the multi-dimensional cost is tested in isolation first.

## Testing
Unit:
- A departure removes the engineer's skills, dissolves their relationships (with contagion to close ties), and removes their institutional-knowledge benefit.
- Losing a highly-connected/highly-grown engineer costs disproportionately more than losing a fresh, isolated one.
- The post-mortem itemizes the full multi-dimensional cost.
- **Fairness:** the departure is still preceded by the fuzzy warning (I-1).
- Determinism holds; magnitudes read from constants.

Manual verification checklist:
- [ ] Lose a well-grown, well-connected engineer: the post-mortem lays out skills + mentorship + systems lost, and it clearly hurts more than an early-game loss.
- [ ] `npm test` green; fairness harness bar green.

## Out of Scope
- The fail-state model change (survivable loss) — prompt 40.
- Hiring pipeline — prompt 41.
- Ramp/onboarding — prompt 42.
