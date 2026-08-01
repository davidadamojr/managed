# Longevity — what a management sim needs to be played for years

A design exploration: what makes Football Manager sustain hundreds of hours, what the
honest engineering-management parallel is for each of those things, and what it would
cost to build them.

---

## 0. What this document is, and is not

**It is a proposal.** Nothing here is settled, measured, or agreed. The standing project
guide and the product spec both outrank this file; where they disagree with it, they win.
Every parallel below is a decision-to-validate, in the same sense the tuning parameters
are — a concrete best-estimate written down so it can be argued with, not a contract.

**It is not a plan.** It deliberately stops short of sequencing. Turning this into
increments and prompts is a separate job, and doing it before the design is agreed would
bake in choices that are still open.

**Its bias is toward honesty about fidelity.** The goal is a game that is both true to the
job and worth playing for a long time, and those two pull against each other in places.
Where a Football Manager mechanic has no honest counterpart in engineering management,
this document says so rather than inventing one. A forced parallel costs realism, and
realism is the thing this game has instead of a licence.

---

## 1. Why this exists

Two observations, made in the same session, that turned out to be one observation.

**"Six sprints is short."** True, and it was never meant to be a game. Six is the shortest
window that lets a single crunch decision go out and come back — a test rig for proving the
delayed echo cheaply.

**"Losing the engineer shrugged."** The first real play of the loss run produced no punch.
The manager understood the warning, believed there was more time, and felt the departure as
arbitrary rather than earned.

The link between them is mechanical, not thematic. **A run ends the moment someone quits.**
Setting the run length to two hundred sprints would not have changed that play-through: it
still ends on the sprint the quit fires. The felt length of a losing run is decided entirely
by when the loss lands, never by the configured length.

So the loss has no *after*. The player never experiences being short-handed, never covers
the gap, never explains it to anyone, never rebuilds. The run stops at the exact moment the
cost would begin to be paid. That is a death on the last page, and it is a strong candidate
for why the loss did not land.

Football Manager does not have this problem, and the reason is worth stating plainly
because it reframes everything below:

> **In Football Manager, losing a player is a setback. Losing your job is the failure.**
> This game currently makes the setback terminal.

---

## 2. What actually makes Football Manager endless

Five pillars. Nothing here is about length; all of it is about renewal.

1. **A repeating medium-horizon frame.** Seasons. Endless, but never formless — each one
   opens with expectations, closes with a verdict, and resets the board. Pure
   open-endedness would remove the pressure that makes every decision matter.
2. **Renewable opposition.** Fixtures regenerate forever. The game never runs out of
   things to be difficult about.
3. **A ladder with stakes in both directions.** Reputation, job offers, promotion,
   relegation, the sack. Long-horizon progression that survives any single season.
4. **A squad that churns by system, not by ending.** Players develop, peak, decline,
   transfer, retire, and are replaced by an infinite supply of new ones. Change is
   continuous and it is the source of most stories.
5. **Drama that generates rather than repeats.** Injuries, form, contract disputes, media.
   A finite content library would be exhausted in a season; generators are not.

---

## 3. The parallel map

Each row carries a fidelity judgment: **strong** (maps cleanly and is true to the job),
**soft** (real but quieter, less legible, or more political than its counterpart), or
**do not force** (the parallel would cost realism and should be replaced, not translated).

### 3.1 The frame

| Football Manager | Parallel | Fidelity |
|---|---|---|
| Seasons | **Planning cycles** — a quarter or half, opening with commitments and closing with a delivered-versus-promised verdict and a review | strong |
| Fixtures | **Work that keeps arriving.** The backlog as a stream fed each sprint, not a board dealt once | strong — real backlogs never empty |
| League table | **Leadership confidence and standing among peer teams** | soft — see §4.2 |
| Promotion / relegation | **Scope.** Upward: a bigger team, more surface, a manager-of-managers role. Downward: reorg, a team split up, scope quietly moved to someone else | strong, though the downward move is rarely called a demotion |
| Cups | **Parallel objectives on their own rhythm** — a migration, a hiring push, an on-call rotation, a compliance deadline | strong |

### 3.2 The squad

| Football Manager | Parallel | Fidelity |
|---|---|---|
| Development, potential vs current ability | **Growth from junior toward senior and staff**, with a sense of ceiling that is itself uncertain | strong — and the most joyful part of the real job |
| Aging and decline | **Do not force.** Renewal pressure comes from disengagement, skill obsolescence in one technology, outgrowing the role, and life changes — never from an age curve | do not force — see §4.1 |
| Transfer market | **The hiring market, poaching, and internal mobility.** You compete for candidates, lose people sideways, and cannot always get who you want | strong |
| Contracts and wages | **Headcount, budget, leveling, promotion cycles, retention offers** | strong — and entirely absent today |
| Squad depth and rotation | **On-call, leave, illness, coverage, bus factor** | strong |
| Personalities, "wants first-team football" | **Temperament, and wanting the interesting project or a visible path upward** | strong |
| Youth intake / regens | **A renewable candidate pool: juniors, interns, internal transfers in** | strong — and required for any endless frame |

### 3.3 The manager

| Football Manager | Parallel | Fidelity |
|---|---|---|
| **Job security and the sack** | **Being managed out, put on a plan, or having the team reorged out from under you** | strong — and this is the pivot the whole design turns on |
| Job offers, moving clubs | **Taking a bigger team, or leaving a burning one.** A new team is a fresh board played with accumulated standing | strong |
| Board expectations | **Commitments negotiated with leadership each cycle, and judged at the end of it** | strong |
| Manager reputation | **Standing with your team, with leadership, and with peers** — three separate tracks that move independently | strong |
| Manager attributes | **Your own growth: coaching, hiring, influence — and technical currency decaying the longer you manage** | strong, and quietly poignant |

### 3.4 Texture and depth

| Football Manager | Parallel | Fidelity |
|---|---|---|
| Player interactions and **promises you can break** | **Commitments made in a 1:1 — "you'll lead the next one", "I'll get you promoted this cycle" — remembered, and cashed or defaulted on** | strong. Today a 1:1 is a stateless mood bump; a promise ledger is close to free and very true to life |
| Press conferences | **Skip-levels, all-hands, incident reviews, and what you say when a reorg lands** | strong |
| Injuries | **Incidents, outages, a key person out sick mid-crunch** | strong |
| Form and confidence | **Momentum after a good launch or a bad one** | strong |
| Backroom staff | **Tech leads, and eventually managers reporting to you.** The late game stops being about engineers | strong |
| **Tactics** | **How the work is organized** — team topology, work-in-progress limits, pairing, how much is bet on one architecture | strong, and the **largest depth gap**: assignment is currently the only expressive choice a player has |
| Training | **Coaching, stretch assignments, mentorship pairings** | strong |
| Data screens | **Delivery metrics** — but only for systems, never for people (see §6.4) | soft, with a hard constraint attached |
| Scouting | **Interviewing, references, trial projects.** Knowing who is good before hiring them is genuinely hard | strong |

---

## 4. Where the analogy must not be forced

### 4.1 Decline

Footballers decline on a schedule everyone can see. Engineers do not, and modelling them as
if they did would be both false and unpleasant. The renewal pressure a long game needs must
come from somewhere honest: people disengage, their specialty stops being the one that
matters, they outgrow what you can offer them, or their life changes shape. Those produce
the same design effect — a roster that cannot stay static — without importing a curve that
would be a lie.

### 4.2 The table

Football Manager's league table is a single number that says exactly where you stand, and a
great deal of the game's legibility rests on it. Engineering management has no such number,
and inventing one would be the most damaging possible concession to gamefeel: a visible
objective ranking is precisely the thing that makes managers crunch.

The honest substitute is standing — with the team, with leadership, with peers — which is
softer, slower, partly political, and never fully knowable. That is more true and much less
legible, and the gap between those two is a real design problem this document does not
solve.

### 4.3 Match day

Covered in §5. It is the deepest structural difference and it gets its own section.

---

## 5. The scene problem

Football Manager's rhythm is **prepare → match → consequence.** The match is a *scene*: it
takes time, its uncertainty resolves in front of you, and you can intervene while it is
still undecided. Everything before it is anticipation and everything after it is
consequence, and the scene is what makes both of those feel like anything.

This game's rhythm is **plan → resolve → read.** Resolve is a button. Numbers change, prose
appears. There is no duration, no reversal, and no moment where you are inside an outcome
rather than being told about one.

This is very likely part of why the departure shrugged. The player was *informed* of a
resignation on a summary screen. In the real job — and in Football Manager's equivalent — a
person leaving is a conversation you are sitting in, with a moment where you know and cannot
yet do anything about it.

Two candidates for what a scene looks like here, both already latent in the design:

- **The fire.** An incident that arrives mid-sprint, forces a decision while the outcome is
  still open, and resolves in front of the player.
- **The conversation.** The resignation, the difficult 1:1, the promise being called in.
  A departure that happens *as a scene* would land harder than a well-written post-mortem,
  because the player would be in it rather than reading about it.

The recommendation is not to invent a match day. It is to recognize that the raw material
for scenes is already planned as *modifiers* — things that adjust numbers — and that the
longevity case argues for building them as *events the player is inside of* instead.

---

## 6. What the map reveals is missing

Eight things, none of which appear anywhere in the current build plan.

1. **Renewable work.** The backlog is generated once at construction and never refilled.
   Nothing in any planned system feeds it. A career needs work to arrive.
2. **The repeating cycle.** There is one run with one ending. Nothing recurs, so nothing
   can accumulate across recurrences.
3. **Job loss as the failure.** The planned revision of the fail state moves from a single
   quit to a team-size floor. Both are still "the run ends because of the roster." Neither
   is "you are no longer this team's manager."
4. **Headcount, budget, and compensation.** Absent entirely, despite being among the most
   real constraints of the job.
5. **A tactics layer.** How work is organized, not merely who does it. This is the biggest
   gap in expressive depth against the reference game.
6. **Promises with memory.** Commitments made and then kept or broken.
7. **Career mobility.** The player can never leave, and can never be given a bigger job.
8. **Managing managers.** The planned organizational layer is entirely about managing
   upward; nothing lets the player build a layer beneath them.

---

## 7. The minimum career shape

The smallest set of changes that turns a run into something playable indefinitely. Ordered
by dependency, not by effort.

1. **A quit stops ending the run.** You continue short-handed, with the capacity gap and
   the knowledge gap as the actual consequence. This alone is what gives a loss an after.
2. **Work arrives.** The backlog becomes a stream fed on a cadence, so the board never
   empties and the juggle never resolves.
3. **The cycle replaces the run.** A fixed number of sprints forms a cycle that opens with
   negotiated commitments and closes with a verdict. Sprints stay the turn; the cycle
   becomes the season.
4. **People arrive as well as leave.** Hiring with a lag, ramping, and an internal supply,
   so the roster is renewable rather than depleting.
5. **The fail state moves to the manager.** You lose the job when the accumulated human
   damage becomes undeniable — not when a single person leaves.
6. **Standing accrues across cycles.** With the team, with leadership, with peers. This is
   the thread that makes cycle forty feel different from cycle one.

Items 1–2 are small. Items 3–6 are each a system.

---

## 8. What survives the pivot untouched

Checked against the code, not assumed. The pivot is far cheaper than it sounds.

- **The four-layer split** — pure engine, data-only content, thin view, persistence — is
  indifferent to how long a run is.
- **The tick contract** is already the right shape. A career is more ticks, not different
  ones.
- **Determinism** is unaffected; a longer seeded stream is still a seeded stream.
- **The attention capacity hook** was designed for a manager whose capacity changes over a
  long horizon. It is more useful in a career than in a run.
- **Content-as-data** is what makes a generator-driven event supply possible at all.
- **Run length is shallow.** It is set at construction, read once as a completion boundary,
  and otherwise only reported to the view and the harness. **No game rule depends on it.**

What genuinely changes: the run lifecycle, the backlog as a fixed board, the roadmap as a
one-shot target, and every mechanical bar in the harness — which are all currently phrased
as "does this happen in the right sprint of six" and would need re-expressing as rates.

---

## 9. What the pivot costs the guarantees

The standing invariants are not negotiable, so each one is checked here rather than
discovered later.

**Human outcomes as the only failure.** This is the invariant most at risk, and the risk is
subtle. A manager fired for *missing the roadmap* is metric-based failure, and it would
re-import the exact crunch incentive this game exists to defeat — it would invert the whole
thesis. A manager who loses the job because they burned through people, lost the team's
trust, and could not keep anyone is a human outcome, and it holds. **The endless fail state
must be "you lost the people," never "you missed the numbers."** If that distinction cannot
be made legible to the player, the pivot is not safe.

**The fairness guarantee.** Every path that removes a person must be preceded by a fuzzy
warning. A career adds several new ones — poached, outgrew the role, transferred, life
changed — and each has to earn its own warning. Worse, a career introduces a failure mode a
short run cannot have: **warning fatigue.** A signal that fires two hundred times stops
being a warning. Long-horizon fairness needs the warning to be rare, escalating, and
specific, which is the same conclusion the shrug diagnosis reached from the other direction.

**Fuzzy people-reads.** Unchanged and more important. Systems may carry explicit meters;
human interiors stay qualitative, however many cycles pass.

**The engine/view wall, determinism, content-as-data.** Unaffected.

**Depth from interaction, not enumeration.** This document is a long list of systems, and
that is exactly the pressure this invariant exists to resist. Most of §3 should never be
built. The list is a map of the possible, not a backlog.

**The harness stays first-class.** Every bar needs re-deriving in rate terms, and a career
needs bars a run does not: does the roster stay renewable, does standing move on both axes,
does anything reach a steady state and stop being interesting.

---

## 10. The open questions

Honest unknowns, in the order they most need answering.

1. **Does a survivable loss produce the punch?** The cheapest test of the shrug diagnosis,
   and the first brick of everything above. Until it is answered, every other item here is
   speculative.
2. **What replaces the table?** Standing is more honest and much less legible. If a player
   cannot tell how they are doing, a career has no shape.
3. **Can a cycle carry enough pressure without an ending?** The current run's tension comes
   partly from having six sprints and no more. A cycle verdict has to do that work instead.
4. **What is the scene?** Whether incidents and conversations can be built as moments the
   player is inside of, rather than as modifiers, may matter more than any system on the
   list.
5. **How much of this is actually wanted?** The reference game is thirty years of
   accretion. The version of this that is worth playing is probably far smaller, and
   choosing what to leave out is the real design work — not this document, which is only
   the inventory.
