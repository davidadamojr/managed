# Managed — Full Campaign Build Prompts (Increments 1–9)

Claude Code build-prompt series for **Managed**, a single-player, turn-based engineering-management simulation ("the Football Manager of engineering management"). This directory contains the **entire** nine-increment plan as **74 globally-numbered, phase-tagged prompt files**, plus the standing session guide (`CLAUDE.md`).

## How to use this

1. **Load `CLAUDE.md` at the start of every Claude Code session.** It holds the hard contracts, the cross-increment invariants, and the honesty rule. It does not drift.
2. **Execute prompts in global order, `01` → `74`.** Each is a self-contained Claude Code prompt: Context, User Story, Acceptance Criteria, Technical Specs, Testing, Out of Scope.
3. **Build one increment at a time, then play it, then proceed.** This is not optional — it is the core methodology (see "The honesty rule" below).

## ⚠ The honesty rule — read before building anything

- **Increment 1 (`01`–`18`) is fully grounded and ready to build.** Its numbers were tuned to a validated core.
- **Increments 2–9 (`19`–`74`) are a revisable plan at spec fidelity — NOT a build contract.** Every numeric value and many design choices in later increments are **decisions-to-validate**: concrete best-estimates that must be re-checked against play once the increment they depend on is built and felt.
- Every prompt from `19` onward opens with a **⚠ VALIDATE-FIRST** note naming exactly what earlier play must confirm before that prompt's parameters can be trusted.
- **Do not batch increments.** The locked principle (PRD §2): each increment is independently playable and evaluated *for fun* before the next begins. Later tuning is genuinely parameterized by what earlier play teaches — e.g. tech-debt rates are set *relative to* how Increment 1's burnout curve actually felt.

Treating the later numbers as settled just because they're written concretely is the one way to misuse this series.

## Directory layout

```
managed-full-campaign/
├── CLAUDE.md                       ← standing session guide (load every session)
├── README.md                       ← this file
└── 01…74 *.md                      ← all 74 prompt files, flat, executed in global order

Increment groupings (for reference — the files are flat, not foldered):
  01–18  inc1-the-sprint      ← GROUNDED; ready to build
  19–25  inc2-tech-debt
  26–32  inc3-chaos-engine
  33–38  inc4-people-depth
  39–44  inc5-people-loop
  45–51  inc6-org-layer
  52–58  inc7-peer-layer
  59–65  inc8-content-tone
  66–74  inc9-presentation
```

## Phase tags

- `[MVP]` — required for that increment to be worth shipping/playing.
- `[polish]` — deferrable within the increment (usually the harness-retune-integration prompts, and refinements).
- `[ENHANCE]` / `[GROW]` — depth gated behind the base version proving fun in play (per the "depth from interaction, not enumeration" guardrail). Build only if earned.

## The full map (global numbering)

### Increment 1 — The Sprint `01–18` — *GROUNDED*
Proves the delayed echo: crunch early → burnout → **foreseeable, warned** attrition later. Scaffold/determinism, content-as-data, entities+serialization, new-run construction, assignment+crunch, attention economy (with the depletable-attention forward hook), morale+burnout, sprint tick, attrition+fairness warning, summary derivation, run lifecycle+persistence, tuning harness, the two view slices, then polish (property tests, framing, tuning pass, full-run integration).

### Increment 2 — Technical Debt `19–25`
Systems-side echo. `19` debt entity+accrual · `20` compounding velocity penalty · `21` paydown (costs capacity) · `22` legibility (debt is explicit — a deliberate asymmetry with fuzzy people-reads) · `23` view · `24` harness debt bars+retune · `25` run-length extension+integration.

### Increment 3 — The Chaos Engine `26–32`
Incidents/fires. `26` incident entity+generation (debt-weighted, capped) · `27` response+triage · `28` debt↔incident coupling · `29` Fire Alert view · `30` silent-success beat · `31` on-call (minimal) · `32` harness incident bars+integration.

### Increment 4 — People Depth `33–38`
Individuals who grow. `33` archetypes · `34` growth/leveling · `35` relationships/chemistry · `36` growth+relationship legibility+detail view · `37` morale contagion · `38` harness people-depth+integration.

### Increment 5 — Closing the People Loop `39–44`
**Changes the fail state.** `39` multi-dimensional attrition · `40` revised fail state (team-floor + cascade) · `41` hiring pipeline (attention-costed, laggy) · `42` onboarding drag+ramp · `43` hiring/ramp/post-mortem view · `44` harness (prevention-cheaper-than-recovery)+integration.

### Increment 6 — The Org Layer `45–51`
Managing up; **the attention hook pays off**. `45` Manager entity first-class (attention capacity now reads manager state) · `46` org events/mandates · `47` shielding · `48` dual-track standing (team vs leadership) · `49` Manager panel+org view · `50` episodic reorgs · `51` harness org bars+integration.

### Increment 7 — The Peer Layer `52–58`
Managing sideways. `52` PeerManager entity+peer reputation (third track, pairwise) · `53` negotiation · `54` cross-team dependencies (not player-controllable) · `55` peer-reputation modulation · `56` internal transfer + Peer Board view · `57` reorg advocacy `[ENHANCE]` · `58` harness peer bars+integration.

### Increment 8 — Content & Tone `59–65`
The emotional peak + the soul-carrying content. `59` manager burnout (**second cash-in of the attention hook**) · `60` degraded reads under burnout · `61` expanded categorized event library · `62` voice & tone lock · `63` event data-validation + Manager state read · `64` rich event presentation · `65` harness manager-burnout+integration.

### Increment 9 — Presentation `66–74`
Polish last; dress a proven game. `66` visual identity · `67` UI framework + save format · `68` engineer portraits `[ENHANCE]` · `69` moment-of-weight feedback `[ENHANCE]` · `70` Unity port **evaluation** `[GROW]` · `71` full-campaign harness regression · `72` campaign-wide determinism/save property tests · `73` campaign framing decision · `74` final integration (all invariants asserted).

## Cross-increment invariants (the load-bearing threads)

These hold from the increment that introduces them through every increment after. Full statements in `CLAUDE.md` §12.

- **I-1 Fairness guarantee** — every people-loss path (attrition, cascade, internal transfer) is preceded by a fuzzy at-risk warning. No unforeseeable loss, ever — even under Increment 8's manager-burnout degraded reads.
- **I-2 Depletable-attention hook** — attention capacity is a function of manager state from Increment 1; Increment 6 makes standing modulate it, Increment 8 makes burnout modulate it. Never a hardcoded constant.
- **I-3 Engine/view wall** — simulation logic never lives in the view, through Increment 9's polish. This is what keeps the Unity port cheap.
- **I-4 Determinism** — seeded RNG in `GameState`; every system threads it; identical inputs reproduce identical runs.
- **I-5 Human-outcome fail axis** — the run only ever ends on human outcomes (attrition/collapse), never a metric miss. Debt and incidents pressure; they never end the run.
- **I-6 Content-as-data** — events, archetypes, org events, negotiations, tuning constants are always data.
- **I-7 Fuzzy people-reads** — human interiors (including the manager's own burnout) are always qualitative; debt is the one deliberate explicit exception.
- **I-8 Depth from interaction, not enumeration** — simplest model that produces emergent behavior; richer depth only where play proves it earns its weight.
- **I-9 Harness grows with the engine** — each increment adds its bars and re-runs the whole suite green.

## The dependency chain (why the order is locked)

```
1 Sprint → 2 Debt → 3 Incidents → 4 People Depth → 5 People Loop (fail-state change)
        → 6 Org Layer (attention hook cashed) → 7 Peer Layer → 8 Content+Manager Burnout
        → 9 Presentation (polish + Unity eval)
```

Each increment is a delta on all before it. The order is not arbitrary: later tuning is parameterized by what earlier play teaches, the fail-state change (Inc 5) is only safe once loss's sting is known (Inc 1–4), and polish (Inc 9) waits until the whole game is proven fun in raw form.

## Preference translation

David's `MY_PREFERENCES.md` / `QUICK_REFERENCE.md` are mobile-first web-app defaults. For this pure-TypeScript-engine + thin-desktop-view project they are **translated, not applied literally** (documented in `CLAUDE.md` §7): mobile-first → determinism-first; touch targets → keyboard operability; skeleton loaders → instant deterministic ticks; 3G budgets → seeded reproducibility. Vitest is kept as-is.

## What is *not* in this series

- A full **scenario content library** (specced as decisions-to-validate in prompt `73`, not built out).
- **Executing** a Unity port (prompt `70` is the *evaluation*; the port itself, if recommended, is separate downstream work).
