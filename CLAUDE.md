# CLAUDE.md — Managed (Engineering Manager Simulation), Full Campaign (Increments 1–9)

**This file is the standing session guide. Load it at the start of every Claude Code session on this project. It defines the hard contracts that must not drift across sessions.** Individual prompt files are globally numbered `01`…`74` and executed in order against the state this file establishes.

> **Read this before anything else — the honesty rule for this whole series.** Increment 1 (`01`–`18`) is fully grounded and ready to build. **Increments 2–9 (`19`–`74`) are a revisable plan at spec fidelity, NOT a build contract** (PRD §2, §14). Every numeric value and many design choices in later increments are **decisions-to-validate**: concrete best-estimates that must be re-checked against play once the earlier increment they depend on is built. Each later prompt carries a **⚠ VALIDATE-FIRST** note naming what must be confirmed by playing earlier increments before that prompt's parameters are trusted. Do not treat a later prompt's numbers as settled just because they are written concretely. Build each increment, play it, correct the plan, *then* proceed. Locked principle: **each increment is independently playable and evaluated for fun before the next begins** (PRD §2). Do not batch increments.

---

## 0. What this project is

A single-player, turn-based management simulation about running a software engineering team — the "Football Manager of engineering management." Increment 1 ("The Sprint") is a **5–6 sprint run**: assign a small team to an over-capacity backlog, spend scarce managerial attention, resolve sprints, and steer toward shipping a soft roadmap **without losing anyone to attrition**. Losing an engineer is the only fail state. There is no explicit win — surviving the run with the team intact is completion.

The one thing Increment 1 exists to prove: **the felt delayed echo.** Crunch in an early sprint must return, sprints later, as an at-risk engineer the player had a fair chance to save and then loses if they didn't. If that lands as a punch in raw panels and numbers, the game has a heart. Everything else is secondary to protecting that.

## 1. Source-of-truth hierarchy (conflict resolution)

When documents disagree, resolve in this order (highest wins):

1. **`Engineering-Manager-Sim-PRD.md`** — the authoritative product spec. Increment 1 is fully grounded; §12 (Technical Assumptions) and §4 (Functional Requirements) are the build contract.
2. **This `CLAUDE.md`** — encodes and sharpens PRD decisions into build-level contracts. Where this file states a data shape or interface, it is the contract for cross-prompt consistency.
3. **The numbered prompt files** — per-iteration scope. A prompt never overrides a PRD locked decision or a §5 hard contract below; if one appears to, stop and flag it rather than silently reconciling.

`MY_PREFERENCES.md` / `QUICK_REFERENCE.md` are **mobile-first web-app defaults and must be translated, not applied literally**, because this project is a pure-TS engine + thin desktop-web view. See §7.

**Strict PRD fidelity:** follow the spec precisely. Do not invent features, systems, or mechanics not in Increment 1's scope. Increment 1 is *six systems* (assignment, attention, sprint resolution, people model, attrition, summary). The explicitly-deferred list (§3 of the PRD: tech debt, incidents, growth, relationships, archetypes, hiring, org layer, event *library*) is **out of scope** — do not build ahead.

## 2. Honesty over impressiveness

Applies to both the product and to Claude Code's own outputs.

- **Product:** the tuning harness (§10 of PRD) must report *real* mechanical properties, not flatter the design. If a parameter set fails a mechanical bar, say so.
- **Claude Code:** if something is stubbed, half-working, or unverified, say so plainly in the summary. Do not report a prompt "done" when acceptance criteria are unmet. A failing test named honestly is worth more than a green bar that lies.

## 3. Build methodology

- **TDD-first, boring straightforward code.** Write the test, then the smallest code that passes it. The engine is pure and deterministic — it is unusually well-suited to TDD; exploit that. Prefer clarity over cleverness.
- **Headless-first.** Every engine capability must be exercisable and testable in a Node harness with no UI. The view is built *last* (prompts 12–13) against an already-proven engine.
- **Review changed files individually.** Present changed files for review rather than bulk summaries.
- **Targeted edits over rewrites** for large structured files.
- **Flag judgment calls explicitly.** When you make an architectural or tuning call the spec left open, state it clearly in the summary so it can be corrected. Silence is not consent on anything you had to invent.

## 4. Architecture — the four-layer structure (locked, §12 of PRD)

```
Layer 1  core engine        pure TypeScript. ZERO dependence on DOM / React / Svelte / any renderer.
                            Plain data in, plain data out.
Layer 2  content/data       JSON/TS data files: archetypes(stub), events, skill taxonomy,
                            name lists, tuning constants. Separated from logic.
Layer 3  view               thin UI reading GameState + dispatching actions. React or Svelte
                            (deferred to Inc 9; Inc 1 uses the simplest thing that renders panels).
Layer 4  persistence        JSON serialization to localStorage. File export deferred.
```

### THE MOST IMPORTANT RULE — engine/view separation

**A hard wall between simulation and presentation from the first commit.** Simulation rules and state must NEVER live inside UI components. This is the failure mode to avoid religiously — it breaks portability (the future C# port) and testability (the harness).

- All game state lives in a single serializable `GameState` object. Never in UI components.
- The engine advances via a **pure function**: `tick(state, actions) => newState`. No mutation of the input; return new state.
- Systems are **pure functions over state**.
- The view reads `GameState` and dispatches actions. It computes nothing about game rules.

If you ever find yourself putting a game rule in the view, or reaching into the view from the engine, **stop** — that is the one thing this project cannot tolerate.

## 5. Hard contracts between iterations (must not drift)

These interfaces are locked here so later prompts build against a stable shape. If a prompt needs to change one, that is a flagged decision, not a silent edit.

### 5.1 The tick signature
```ts
tick(state: GameState, actions: SprintActions): TickResult
// TickResult = { state: GameState; summary: SprintSummary }
// Pure. Deterministic given state (which carries the seed + RNG cursor) + actions.
// Never mutates `state`. Never performs I/O. Never touches the DOM.
```

### 5.2 Determinism (hard requirement)
- **Seeded RNG only.** Identical `state` + identical `actions` + identical seed ⇒ identical `newState`, always.
- No `Math.random()`, no `Date.now()`, no wall-clock, no ambient nondeterminism anywhere in the engine or content layer.
- The RNG state (seed + cursor/position) lives **inside `GameState`** so it serializes with the save and reproduces exactly on resume. Advancing RNG returns a new RNG state; it is threaded through `tick`, never a global.

### 5.3 GameState shape (serializable root)
`GameState` contains: `seed`, `rngState`, `sprintIndex`, `runLength`, `roster` (Engineer[]), `backlog` (Ticket[]), `roadmap` (roadmap ticket ids + derived progress), `attention` (AttentionPool for the current sprint), `manager` (manager-state container — see §5.6), `status` (`'active' | 'completed' | 'failed'`), and `history` (retained SprintSummary[] optional). Fully JSON-serializable: no class instances, functions, Maps/Sets, or circular refs in persisted state — plain objects and arrays only.

### 5.4 Morale vs burnout (must not collapse)
- `morale`: fast-moving mood. Responds **within-sprint** to workload/treatment.
- `burnout`: slow-moving accumulation. Builds **across sprints** from sustained overload/crunch.
- They are **distinct values** and must never be merged into one number. Morale modulates throughput; burnout drives the attrition threshold. Both bounded 0–100 internally, clamped (never overflow).

### 5.5 Fuzzy readability contract
- Raw `morale`/`burnout` integers are **never shown to the player.** The view receives qualitative reads + trends (e.g. "seems checked out lately"), computed by the engine into the `SprintSummary`, not by the view.
- **Fairness guarantee (non-negotiable, §4.5):** an engineer must show at least one sprint of fuzzy at-risk warning before an attrition-eligible quit — except where the player drove burnout up so fast even one sprint's warning is generous. Err toward fairness. This is enforced in engine logic and **verified by a harness bar** (see §5.7). The whole fail state is cheap if a loss was unforeseeable.

### 5.6 Depletable-attention forward hook (locked architectural constraint, §4.3 / §12)
**Do NOT hardcode attention as a stateless per-sprint constant.** Even though Increment 1 refreshes attention fully each sprint with no manager-side depletion, `AttentionPool.capacity` must be derived from **manager state**, not a literal. Model it as:
```ts
attentionCapacityFor(manager: ManagerState): number   // Inc 1: returns a base constant, ignoring manager fields
```
so Increment 6 (reputation) and Increment 8 (manager burnout) can modulate capacity without a retrofit. A `manager` container exists in `GameState` from day one even though its fields are inert in Increment 1. This is the one place an Increment-1 choice is deliberately constrained by the long-term vision — cheap now, expensive later.

### 5.7 The tuning harness is a first-class capability (hard requirement, §10 / §12)
Not an afterthought. The engine must support running many seeded simulations headlessly and emitting a **tuning report** on mechanical properties:
- **Echo timing:** does a sprint-~2 crunch cross the attrition threshold in the intended window (~sprint 4–5), not earlier (unforeseeable) or never (crunch is free)?
- **Fairness:** across many seeds, does the at-risk warning reliably precede attrition?
- **Dominant strategy:** is there an assignment strategy that trivializes the juggle?
- **Roadmap achievability:** tight-but-achievable, not trivial or impossible?

Claude Code owns *mechanical* suitability (these bars) and offers a *best-estimate of fun*; the builder owns *felt* fun by playing. Parameters are **living** — revisable as play teaches the truth.

## 6. Content-as-data (locked)
Events, skills, archetypes (stubbed), name lists, and **all tuning constants** live in Layer-2 data files — never hardcoded in engine logic — from Increment 1 onward, even though the Increment-1 event set is tiny (one event fired per sprint at most) and personality is stubbed to a single reaction model.

## 7. Preference-file translation (CLI/desktop/engine context)
`MY_PREFERENCES.md` and `QUICK_REFERENCE.md` are mobile-first web-app defaults. This project is an engine + thin desktop-web view, panels-and-numbers, no mobile target for Increment 1 (§8 of PRD). Translate rather than apply literally:

| Preference (as written) | Translation for this project |
|---|---|
| Mobile-first breakpoints | **Engine/view separation + determinism** are the primary discipline. Desktop evergreen browsers only; mobile explicitly skipped for Inc 1. |
| Touch targets 44px, tap feedback | **Keyboard-operable core actions**, legible text, sufficient contrast (§8 minimum accessibility bar). |
| Skeleton loaders, no spinners | **Instant deterministic ticks** — resolution feels instant; no async load states to design. "No perceptible wait on Resolve." |
| "Works on slow 3G" | **Seeded reproducibility** — identical inputs reproduce identical runs; the harness re-runs are the analog of a slow-network stress test. |
| Optimistic UI / rollback | Not applicable — the tick is synchronous and pure; the view renders resolved state. |
| Four UI states (loading/empty/error/success) | Translated to **legible terminal & edge states**: empty attention pool shown plainly (not an error), poor-fit assignment resolves poorly (not an error), attrition is a narrated post-mortem (not an error), save/resume failure is a plain dismissible message. |
| Vitest for JS/TS testing | **Kept as-is** — Vitest for the engine + harness unit/integration tests. |
| API response shape `{data}/{error}` | Not applicable (no network); the analog is the locked `TickResult` shape (§5.1). |

What carries over unchanged: **all four UI states thinking** (as edge-state legibility), **testability at every step**, **explicit out-of-scope per iteration**, and **user-friendly / diegetic messaging** (the at-risk warning reads as human observation, not a system alert).

## 8. Tone (Increment 1)
Mostly deferred — Inc 1 is panels and numbers with almost no prose. Where flavor appears (engineer names, the one event's description, the at-risk warning phrasing): **wry, grounded, recognizable** — the humor of recognition for someone who's done the job. The at-risk warning is the one place tone matters in the MVP; it must read as human observation, not a health-bar alert.

## 9. Increment-1 parameters (mechanically settled by the tuning pass — see `TUNING.md`)
From §6 of the PRD, now measured against the §5.7 bars. **`TUNING.md` is the authority on what these values are and why** — it carries the settled table, the sweep behind each decision, and the findings the bars cannot see. Read it before changing any number, and update it when you do. What the PRD locks, and where the pass landed:
- Run length: **5–6 sprints** (load-bearing; shortest run that lets one crunch consequence round-trip). Settled at **6**: 5 also clears every bar, but lands the loss in the final sprint with no room left to show what backing off would have done.
- Skills: **four** — `frontend`, `backend`, `infra`, `debugging`.
- Team size: **3–4** engineers, fixed for the run (no hiring/replacement; a quit ends the run). Settled at **4**.
- Attention pool: **3 points/sprint**; actions cost 1 each; err *too tight* in tuning. Confirmed as the knee — at 4 points the pool reaches the whole team and the choice disappears.
- Action set (tiny): **1:1**, **Unblock**, **Recognize**.
- Backlog: intentionally **over capacity** — the scarcity is the point; never auto-balance or warn the player out of the juggle. Measured at ~2.6× what a run actually finishes.
- Roadmap: soft target; **falling behind is painful but never a fail condition.** Attrition is the only fail state. Settled at **16**: the pass's one real mis-sizing was a roadmap sized against a sprint's output (5) that every strategy — including the do-nothing one — cleared by sprint 3 of 6.
- Crunch: per-sprint toggle; raises throughput now, accrues burnout that surfaces later. Bookkeeping is immediate/deterministic; only the *felt* cost is delayed. Measured: selective crunch ships the most of any surviving strategy, while sustained crunch ships the *least* and loses someone every time.

**Settled ≠ validated.** These clear the mechanical bars; none of it has been confirmed by playing, which is the gate below. Carry one standing finding into play: because burnout has exactly one source in Increment 1 and the player controls it directly, a manager who stops crunching at the first at-risk read never loses anyone. That follows from the fairness guarantee rather than from a tuning mistake, and its resolution is the pressure Increments 2–3 add, not a retune.

## 10. Anti-patterns (do NOT do — §12 of PRD)
- Do not treat this as a revenue product (no monetization, retention funnels, or engagement mechanics).
- Do not over-model — depth comes from a few coupled systems, not many shallow ones; bias toward cutting.
- Do not build art/polish before the raw-numbers core loop is proven fun.
- Do not let simulation state or rules live in the UI.
- Do not add a system that doesn't strengthen the juggle↔people coupling without loudly justifying it.
- Do not design a multiplayer/online shape — single-player, offline-capable.
- Do not build a later increment's system before its own increment (no tech debt/incidents/growth/hiring/org/peers/manager-burnout in Increment 1; more generally, build only the current increment's delta).

## 11. Increment dependency chain (why the order is locked)
Each increment is a delta on all before it (PRD §11). The order is not arbitrary — later tuning is *parameterized by* what earlier play teaches:
```
1 The Sprint ......... proves the delayed echo (crunch→burnout→attrition). Everything rests on this.
2 Tech Debt .......... debt calibrated RELATIVE TO burnout (must accrue slower). Needs Inc 1's curve felt.
3 Chaos Engine ....... incident frequency tuned AGAINST how tight the juggle already is. Needs Inc 1–2.
4 People Depth ....... archetypes/growth/relationships deepen people WITHOUT overwhelming the juggle. Inc 1–3.
5 People Loop ........ CHANGES THE FAIL STATE (survivable loss + hiring lag). Safe only once loss's sting is known. Inc 1–4.
6 Org Layer .......... introduces the Manager entity; CASHES IN the attention hook (reputation modulates capacity). All prior.
7 Peer Layer ......... horizontal org; reuses Manager + standing from Inc 6. Sequenced AFTER vertical org is fun.
8 Content & Tone ..... event library + voice + MANAGER BURNOUT (second cash-in of the attention hook). All prior.
9 Presentation ....... polish LAST; dresses a proven game; evaluates Unity port. Changes NO simulation behavior.
```

## 12. Cross-increment invariants (must hold from the increment that introduces them, through every increment after)
These are the threads the PRD flags as load-bearing across the whole plan (§14). They are not re-litigated per increment; once true they stay true.

- **I-1 The fairness guarantee (from Inc 1, forever).** Every path that removes a person from the roster — attrition (Inc 1), post-fail-state departures (Inc 5), internal transfer to a peer (Inc 7) — MUST be preceded by a fuzzy at-risk warning. No unforeseeable loss, ever, on any people-loss path. Any new loss path added in any increment must wire into the same warning machinery and be checked by the harness fairness bar.
- **I-2 The depletable-attention hook (from Inc 1; cashed Inc 6 & Inc 8).** Attention capacity is `attentionCapacityFor(manager)` from day one. Inc 6 makes reputation modulate it; Inc 8 makes manager burnout modulate it. It is never a hardcoded constant, in any increment.
- **I-3 The engine/view wall (from Inc 1, through Inc 9 polish).** Simulation state and rules never live in the view. Inc 9's polish adds NO simulation logic to the UI. This is what keeps the C# port cheap and the harness honest.
- **I-4 Determinism (from Inc 1, forever).** Seeded RNG in `GameState`; identical inputs reproduce identical runs. Every new system (debt, incidents, org events, negotiations, transfers) threads the same seeded RNG — no new nondeterminism source, ever.
- **I-5 Attrition/human-outcome is the only fail axis.** The fail state evolves (Inc 1 single-quit → Inc 5 team-floor + cascade) but always terminates on **human outcomes, never raw metrics** (roadmap miss, burndown, debt level never directly end a run). Metric-based failure would re-import the crunch incentive the game exists to defeat (PRD §I6.5). Debt (Inc 2) and incidents (Inc 3) make the juggle harder; they do not end the run.
- **I-6 Content-as-data.** Events, archetypes, org events, negotiation templates, tuning constants are always data, never hardcoded engine logic — from Inc 1's tiny set to Inc 8's large library.
- **I-7 Fuzzy people-reads.** Raw morale/burnout integers are never shown, in any increment. New readable *systems* properties may be explicit (debt is a meter, Inc 2 — a deliberate asymmetry) but *human interiors* stay qualitative, including the manager's own burnout (Inc 8).
- **I-8 Depth from interaction, not enumeration.** Prefer the simplest model that produces emergent behavior; add richness (relationship chains, reorg advocacy, active transfer markets) only if play proves the base carries its weight. Bias toward cutting.
- **I-9 The tuning harness stays first-class and grows with the engine.** Every increment adds its own mechanical bars to the harness (§5.7) and re-runs the whole bar suite — new systems must not silently break Inc 1's echo-timing or fairness bars.

## 13. Full campaign prompt map (global numbering, continuous 01–74)
Phase tags: `[MVP]` = required for that increment to be worth shipping; `[polish]` = deferrable within the increment. Every prompt in Inc 2–9 also carries a **⚠ VALIDATE-FIRST** note in-file.
```
=== INCREMENT 1 — The Sprint (GROUNDED; ready to build) ===
01  Scaffold, determinism spine, Vitest, harness skeleton
02  Content-as-data layer (skills, names, minimal events, tuning constants)
03  Entities + GameState + serialization round-trip
04  New-run construction (seeded)
05  Assignment + crunch toggle
06  Attention economy (+ the depletable-attention forward hook)
07  People model: morale + burnout
08  Sprint resolution tick
09  Attrition + fairness-guaranteed warning
10  SprintSummary derivation (fuzzy reads, trends)
11  Run lifecycle + localStorage persistence
12  Tuning harness proper (mechanical report)
13  Thin view pt.1 (main run screen)
14  Thin view pt.2 (summary + post-mortem)
15  [polish] Determinism & save property tests, RNG audit
16  [polish] First-time framing + labels
17  [polish] Tuning pass (settles Inc-1 params; resolves the one BLOCKING open question)
18  [polish] Full-run integration test (echo lands, fairness holds)
   >>> BUILD, PLAY, VALIDATE THE ECHO. If it shrugs, fix the core before Increment 2. <<<

=== INCREMENT 2 — Consequences Over Time (Technical Debt) ===  ⚠ params relative to Inc-1 burnout
19  [MVP] TechDebt entity + accrual from rushed/crunch/poor-fit work (data-driven rates)
20  [MVP] Debt compounding: velocity-penalty curve (gentle→steep, never total)
21  [MVP] Paydown as an assignable work target (costs capacity, not attention)
22  [MVP] Debt legibility: readable meter + trend + plain-language velocity projection
23  [MVP] View: Debt Meter + paydown in backlog; summary debt fields
24  [polish] Harness: debt bars (ignorable-not-forever, no soft-lock, legible recovery) + retune
25  [polish] Run-length extension for the debt arc to breathe + integration test

=== INCREMENT 3 — The Chaos Engine (Incidents / Fires) ===  ⚠ frequency tuned vs Inc 1–2 tightness
26  [MVP] Incident entity + data-driven generation (seeded, debt-weighted probability, per-sprint cap)
27  [MVP] Incident response: divert capacity, skill-fit resolution, escalating consequences
28  [MVP] Debt↔incident coupling (perceptible, not deterministic)
29  [MVP] View: Incident Banner / Fire Alert + Triage decision
30  [MVP] Silent-success legibility beat in summary
31  [polish] On-call assignment (one burnout vector, minimal)
32  [polish] Harness: incident bars (disrupt-not-pointless, no death-spiral) + retune + integration

=== INCREMENT 4 — People Depth (Archetypes, Growth, Relationships) ===  ⚠ must not overwhelm the juggle
33  [MVP] Archetype entity (data-driven) modulating reaction magnitude/direction; every archetype viable
34  [MVP] Growth/leveling via attention (coaching) + stretch assignments (risk/reward)
35  [MVP] Relationship entity: pairwise rapport modulating collaboration
36  [MVP] Growth + relationship legibility in summary + expanded Engineer Detail view
37  [polish] Morale contagion along strong ties (bounded, no instant spirals)
38  [polish] Harness: people-depth bars (archetypes viable, growth earned-not-grindy) + retune + integration

=== INCREMENT 5 — Closing the People Loop (Attrition Consequences + Hiring) ===  ⚠ CHANGES FAIL STATE; needs Inc 1–4 loss-feel
39  [MVP] Multi-dimensional attrition (skills + relationships + knowledge lost; still foreseeable)
40  [MVP] Revised fail state: team-size floor + departure-cascade collapse (replaces single-quit)
41  [MVP] HiringPipeline entity: attention-costed, multi-sprint lag, seeded fall-through
42  [MVP] Onboarding drag + ramp state (new hire is net-negative before net-positive)
43  [MVP] View: Hiring Pipeline panel + Ramp indicator + expanded Departure Post-Mortem
44  [polish] Harness: prevention-cheaper-than-recovery bar, survivable-not-spiral bar + retune + integration

=== INCREMENT 6 — The Org Layer (Managing Up + Manager Reputation) ===  ⚠ CASHES the attention hook; must not eclipse the core
45  [MVP] Manager entity promoted to first-class (team standing + leadership standing; attention capacity reads from it)
46  [MVP] OrgEvent entity (data-driven mandates/deadlines/freezes/reorgs)
47  [MVP] Shielding: convert org chaos into manager cost instead of team cost (with limits)
48  [MVP] Team standing + leadership standing accrual/decay; standing modulates team response & leadership perks
49  [MVP] View: Manager panel + Org Event interrupt + Shield decision
50  [polish] Episodic reorg/mandate events with real branching choices
51  [polish] Harness: shielding-valuable-not-free, leadership-reachable-without-crunch bars + retune + integration

=== INCREMENT 7 — The Peer Layer (Negotiation, Dependencies, Peer Reputation) ===  ⚠ after vertical org proven; gate politics behind base-layer fun
52  [MVP] PeerManager entity + pairwise peer-reputation track (distinct from team/leadership)
53  [MVP] Negotiation entity: trade/concede/hold/escalate over contested resources
54  [MVP] Cross-team Dependency entity on roadmap tickets (not player-controllable)
55  [MVP] Peer reputation accrual/decay; modulates negotiation + dependency responsiveness
56  [MVP] Internal transfer (lose an engineer sideways; still foreseeable) + View: Peer Board, dependency markers, transfer notices
57  [polish] Reorg advocacy: peer standing mediates Inc-6 reorg outcomes
58  [polish] Harness: negotiation-winnable-without-always-escalating, dependency-risk-not-arbitrary bars + retune + integration

=== INCREMENT 8 — Content & Tone Pass (Event Library + Voice + Manager Burnout) ===  ⚠ second cash-in of attention hook
59  [MVP] Manager burnout: accrues from over-shielding/firefighting; reduces attention capacity; recoverable + foreseeable
60  [MVP] Degraded reads under manager burnout (exhausted manager sees the team less clearly)
61  [MVP] Expanded categorized event library (personal/org/technical/interpersonal) w/ preconditions + multi-system effects
62  [MVP] Voice & tone pass across all text (wry, grounded; never obscures legibility)
63  [MVP] Event data-validation pass (no incoherent event/state combos) + View: Manager state read
64  [polish] Rich event presentation as primary narrative/comedy surface
65  [polish] Harness: manager-burnout recoverable+foreseeable, library-non-repeating bars + retune + integration

=== INCREMENT 9 — Presentation (Art / UX Polish + Unity Port Evaluation) ===  ⚠ changes NO simulation behavior
66  [MVP] Visual identity across all named surfaces (view-only; engine/view wall holds)
67  [MVP] UI framework decision (React vs Svelte) finalized + save format (localStorage + file export)
68  [ENHANCE] Engineer visual identity (portraits / expressive state)
69  [ENHANCE] Moment-of-weight feedback + transitions (view-only; no deterministic change)
70  [GROW] Unity port evaluation: TS→C# engine translation assessment (tests port too); port-or-stay-web decision
71  [polish] Full-campaign regression: all increments' harness bars green together
72  [polish] Determinism/save property tests across the whole campaign feature set
73  [polish] Campaign framing decision-to-validate (endless + self-defined goals + scenario structure) — revisit win/lose at scale
74  [polish] Final integration: a long campaign run exercises every system; all cross-increment invariants (§12) asserted
```

## 14. Definition of done for a prompt
A prompt is done only when: acceptance criteria are met and demonstrably tested (Vitest, headless where engine-side); the engine/view wall is intact; determinism holds (no ambient nondeterminism introduced); changed files were presented for review; and any invented/tuning judgment call was flagged in the summary. If any of these is unmet, report it honestly rather than claiming completion.
