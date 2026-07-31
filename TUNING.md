# Tuning — Increment 1 ("The Sprint")

What the parameters in `src/content/tuning.ts` are, why they are what they are, and what
is still unknown about them.

**Status: mechanically validated, not play-validated.** Every number below clears the four
mechanical bars the harness measures. None of it has been confirmed by playing the game.
The bars can tell you a run is not *broken*; they cannot tell you it is *fun*. That gate is
the builder's, and it is the next action after this document.

Reproduce everything here with:

```
npm run harness -- report            # the settled report (harness/reports/settled.txt)
npm run harness -- sweep <parameter> # one parameter's response (harness/reports/sweeps.txt)
```

Both are seeded from a fixed base, so the committed outputs in `harness/reports/` are
exactly what those commands print today.

---

## 1. The settled values

| Parameter | Was | Now | Why it moved |
|---|---|---|---|
| `roadmap.size` | 5 | **16** | The old target was sized for a sprint, not a run. See §3. |
| `morale.throughputAtZero` | 0.70 | **0.40** | Widens the band so attention pays for itself. See §4. |
| `morale.throughputAtHundred` | 1.15 | **1.30** | Same change; the band's other end. |

Everything else is unchanged and now **confirmed by sweep** rather than merely unexamined:

| Parameter | Value | What the sweep showed |
|---|---|---|
| `run.sprints` | 6 | 5 also clears every bar, but crowds the loss into the final sprint. See §5. |
| `run.teamSize` | 4 | Untouched; the attention pool is sized against it. |
| `attention.poolPerSprint` | 3 | The knee. 4 reaches the whole team and removes the choice; 6 changes nothing. |
| `attention.actionCost.*` | 1 each | At cost 2 the pool buys one action instead of three; roadmap output drops 0.85 → 0.77. |
| `burnout.crunchAccrual` | 15 | The only value that both punishes crunch fully *and* spreads the quit across two sprints. |
| `burnout.restfulRecovery` | 5 | **No bar responds to it at any value.** See §6. |
| `attrition.burnoutThreshold` | 80 | 70/75 pull the mean quit to 3.58; 85 pins every quit to one sprint. 80 keeps the spread. |
| `attrition.atRiskBurnout` | 60 | Every swept value clears the bars — but only 58–64 is *legal*. See §7. |
| `attrition.warningLeadSprints` | 1 | 2 crowds the loss to sprint ~4.6; 3 breaks the echo entirely (crunch goes free). |
| `work.baseOutput` | 6 | 7 makes attention-spending strategies ship ≥90% and reopens the free-lunch check. |
| `backlog.ticketSizeMin/Max` | 3 / 8 | A larger band works too, at a bigger roadmap; nothing indicted the current one. |
| `backlog.overCapacityRatio` | 1.5 | No bar responds between 1.2 and 3. See §8. |

---

## 2. The four bars on the settled values

96 seeds per strategy, base seed 20260728. Full output: `harness/reports/settled.txt`.

```
overall: PASS (4/4 bars pass)

[PASS] echo-timing    loss 100%, quits at sprint {3: 7, 4: 89}, mean 3.93, premature 0
[PASS] fairness       96 losses audited, 0 unforeseeable, 0 via the fast-burnout exception
[PASS] dominant       no strategy both survives and ships freely
[PASS] roadmap        mean 85% done, final count reached around sprint 4.81 of 6, 8% ship it all
```

Per strategy:

| Strategy | Loss rate | Roadmap shipped |
|---|---|---|
| always-crunch | 1.00 | 0.67 |
| never-crunch | 0.00 | 0.79 |
| balanced | 0.00 | 0.85 |
| neglectful | 0.00 | 0.69 |
| heeds-warning | 0.00 | 0.85 |

Three things worth reading off that table:

- **Crunch pays, sustained crunch does not.** `balanced` crunches selectively and ships the
  most of any surviving strategy (0.85 vs `never-crunch`'s 0.79). `always-crunch` ships the
  *least* of all (0.67) and loses someone every single time. The tool is real; leaning on it
  is what fails.
- **Attention buys throughput, not just goodwill.** `never-crunch` and `neglectful` differ
  only in whether attention is spent, and that alone is worth 0.105 of the roadmap — about
  1.7 tickets a run.
- **Heeding the warning works, exactly.** `heeds-warning` crunches flat out until the
  at-risk read appears and then stops for good. It keeps the whole team on 96 of 96 seeds
  while shipping as much as the disciplined `balanced` manager. The fairness guarantee is
  not just a promise that you were *told* — it is a promise that acting on it *works*.

---

## 3. Why the roadmap moved from 5 to 16

This is the one genuine mis-sizing the harness found, and it was failing two bars at once.

A 4-person team over 6 sprints ships **about 14 tickets**. The roadmap was 5. The measured
consequence: the final roadmap count was reached around **sprint 2.79 of 6**, and *every*
strategy — including the one that spends no attention and never crunches — finished ~98% of
it. The soft target was being cleared before half the run, which drains the pressure out of
every decision after it and makes the crunch temptation hypothetical.

Sizing the roadmap against a whole run's measured output rather than a sprint's fixes both
bars at once, because they were two symptoms of one cause:

```
road=  5 | dominant BAD triv=4 | roadmap BAD avg=0.97   <- every strategy ships it all
road= 10 | dominant BAD triv=3 | roadmap ok  avg=0.96
road= 14 | dominant ok  triv=0 | roadmap ok  avg=0.89
road= 16 | dominant ok  triv=0 | roadmap ok  avg=0.85   <- settled
road= 18 | dominant ok  triv=0 | roadmap ok  avg=0.80
road= 20 | dominant ok  triv=0 | roadmap ok  avg=0.74
```

**Why 16 and not 18 or 20.** Anything from 14 up clears the bars, so the choice inside that
range is a design judgment, not a measurement. 16 is the largest target that a run can still
*finish*: 8% of runs ship all 16, and the modal run lands 14 of 16. Push to 18 and full
completion falls to 2%; at 20 it is zero. Increment 1 has no win state, so a roadmap that is
occasionally completable is the only positive note a run can end on besides "everyone is
still here" — worth keeping reachable. The cost is a thinner margin on the free-lunch check
(the best strategy ships 0.85 against a 0.90 ceiling), which is why the committed regression
test runs at 96 seeds rather than a couple of dozen: at 24 seeds that same number reads 0.89
and the verdict is inside the noise.

**A sharper player does not beat this much.** The harness bots pick tickets by skill fit. A
strategy picking by cheapest-remaining-effort-per-fit instead — what a player chasing the
count would do — ships 0.81 against the bots' 0.80 at roadmap 18. Ticket selection is not
where the headroom is, so the bots' numbers are a fair estimate of a decent player's, not a
floor far beneath one.

---

## 4. Why the morale band widened (and what it is not)

**No bar required this change.** Roadmap 16 alone passes all four bars with the old
0.70–1.15 band. This is a design choice, made on measurement, and it should be labelled that
way rather than smuggled in as part of the fix.

The problem it addresses: with the narrow band, spending managerial attention was worth
almost nothing in throughput. A manager who ignored the team entirely shipped nearly as much
as one who spent every point, every sprint:

| Morale band | attention's worth (`never-crunch` − `neglectful`) |
|---|---|
| 0.70 – 1.15 | 0.063 |
| **0.40 – 1.30** | **0.105** |

Attention's payoff roughly doubles. It also sharpens the crunch story from the other side:
the morale cost of grinding now bites harder, dropping `always-crunch` from 0.707 to 0.673.

Two things keep the wider band honest, both locked as invariants in
`tests/content-tuning.test.ts`:

- The band's **width** exceeds the crunch multiplier's lift, so mood matters more across its
  range than grinding does in a sprint.
- The band is **centred on the fresh team**: at starting morale the multiplier is 0.985. The
  band changes how much morale *matters*, not how productive the team *is* — otherwise it
  would quietly rescale ticket sizes, base output, and the roadmap while looking like a
  change to mood alone.

The `moraleBand` sweep is pivoted the same way, for the same reason. An earlier version of
it widened the band around the middle of the morale scale, which pushed a fresh team's
multiplier up along with the width; it appeared to show the band failing the free-lunch
check when widened, and that was an artifact of the extra output, not the width. Pivoted
correctly, no width in the legal range moves any bar. The band is not on a knife edge.

---

## 5. Run length stays at 6

Both 5 and 6 clear every bar. 6 is chosen because of where the loss lands.

Quits cluster at sprint index 3–4 either way. In a 6-sprint run that leaves a sprint on the
far side of the loss; in a 5-sprint run the departure and the end of the run arrive together,
and the run has no room to show what backing off would have done. Six sprints is the shorter
of the two that still lets one crunch decision go out and come back.

---

## 6. Findings the bars cannot see

Reported because they are true, not because they are convenient.

**`restfulRecovery` is unmeasured.** No bar responds to it at any value from 3 to 10. It only
matters to a manager who crunches and *then* backs off, and until this pass no harness
strategy did that. `heeds-warning` was added for exactly this reason and does exercise the
recovery arc — but it survives at every recovery rate, so the value remains a guess. It
governs how long a rest costs you after a push, which is a *feel* question. Watch it in play.

**The `overload` workload is unreachable.** Nothing in Increment-1 resolution ever classifies
a sprint as overloaded, so `morale.response.overload`, `burnout.overloadAccrual`, and the
`fastBurnoutJump` exception they feed are all dead paths in real play. They are unit-tested
and correctly shaped; they are not exercised by the game. This is known and expected — the
pressure that would produce them arrives with debt and incidents in later increments.

---

## 7. The design finding: heeding the warning is risk-free

The dominant-strategy bar passes, but it passes **entirely on the roadmap axis**. On the
survival axis it has no teeth, and no parameter set can give it any.

The reason is structural. In Increment 1 burnout rises from exactly one source — the crunch
toggle, which the player controls completely. The fairness guarantee requires the at-risk
band (20 wide) to be wider than a single crunch's accrual (15), so that a crunch climb can
never step over the warning unwarned. But that same inequality means a manager who stops
crunching the sprint after the first warning lands at most at 74 against a threshold of 80.
They cannot lose anyone. Measured, not argued: `heeds-warning` keeps the whole team on 96 of
96 seeds, and it does so reading only the fuzzy summary text a player actually sees.

So Increment 1 has a safe optimal line: *crunch until someone reads at-risk, then stop.*

This is not a tuning failure and it is not fixable by tuning — tightening the band to make
heeding insufficient would break the fairness guarantee, which is the one thing the increment
must not trade. Two things make it less alarming than it sounds:

- The strategies read a signal the player reads too, but they read it *perfectly* and act on
  it *immediately*. A person is judging fuzzy prose under roadmap pressure with three
  attention points and four people. The bots' loss rates are an upper bound on how safe a
  player is, not a prediction of it.
- The ambiguity that would make the line genuinely risky is burnout the player does not
  control, and that arrives on schedule: technical debt, then incidents. Increment 1's job is
  to prove the echo lands and the warning is fair — both of which it does — not to be the
  finished game.

**Flagged for the play-validation gate:** if the run feels solved once you learn the rule,
that is this finding surfacing, and the answer is the next increment rather than a retune.

### A related caution: the bars do not police the fairness band

`atRiskBurnout` sweeps clean at every value from 50 to 70, fairness bar green throughout.
That is misleading. The band shape is constrained by two pinned invariants — it must be
wider than one crunch's accrual (or a climb could skip the warning) and narrower than the
fast-burnout jump (or a band-skipping spike could escape warning entirely) — which leaves
only **58–64** legal against the current threshold and accrual. At 70 the band is 10 wide
against an accrual of 15, and it survives the bar purely because *this* arithmetic happens
to land an engineer inside the band for one sprint on the way past it.

The invariants in `tests/content-tuning.test.ts` guarantee the property for every path; the
fairness bar only samples the paths five bots produce. Both are needed, and the invariants
are the stronger of the two. Do not read a green fairness bar as permission to move the
band.

---

## 8. Two constants whose documented meaning drifted

**`backlog.overCapacityRatio` = 1.5 does not mean the backlog is 1.5× what the team can
clear.** It multiplies a nominal ticket-slot count — one ticket per engineer per sprint —
fixed at construction time, before skill fit, morale, or crunch exist to be measured. Real
throughput is about three-fifths of nominal (14.1 tickets against a nominal 24), so the
on-screen backlog of 36 runs closer to **2.6×** what a run finishes, not 1.5×.
Over-shooting is the safe direction here (the scarcity is the
point, and a backlog that turned out to be clearable would quietly remove it), and no bar
responds anywhere between ratio 1.2 and 3. The constant was left alone and its documentation
corrected. If the backlog panel reads as noise in play, this is the knob.

**The bar thresholds are themselves decisions-to-validate.** `trivialMinRoadmap = 0.90` is
the line between "the best strategy" and "a free lunch", and it was not moved during this
pass — deliberately, since loosening a threshold to admit a parameter set is the exact
self-flattery the harness exists to prevent. If anything the honest direction is tighter:
0.85 would still admit the settled values, with a 0.05 margin.

---

## 9. What is still open

Everything here is revisable. The values most likely to move, in order:

1. **`roadmap.size` (16).** Sits in a 14–20 range that all passes; picked for the chance of
   finishing. If landing 14 of 16 feels like failure rather than pressure, come down. If
   finishing feels cheap, go up.
2. **The morale band (0.40–1.30).** A checked-out engineer at 40% output is a strong claim.
   Nothing measured objects; it may still read as too punishing.
3. **`burnout.restfulRecovery` (5).** Unmeasured by construction — see §6.
4. **`run.sprints` (6).** If the middle of a run drags, 5 also passes every bar.

**Next action, and it is not automatable:** play runs on these values and judge whether the
loss lands as a punch. If the echo shrugs, the fix belongs in the core, not in this file.
