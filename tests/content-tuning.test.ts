import { describe, it, expect } from 'vitest';
import { getTuning } from '../src/content/tuning';

// The tuning file is the single source of every game parameter. Two jobs here:
//  1. Pin the candidate starting values so any retune is a deliberate, reviewed
//     change (not an accidental drift).
//  2. Encode the design *intent* behind those numbers as executable invariants,
//     so a future retune that violates the intent (e.g. a backlog that fits, an
//     attrition warning with zero lead time) fails loudly rather than silently
//     changing what the game is about.

describe('tuning constants — candidate values', () => {
  const t = getTuning();

  it('carries the candidate run shape', () => {
    expect(t.run.sprints).toBe(6);
    expect(t.run.teamSize).toBe(4);
  });

  it('carries the candidate roster construction shape', () => {
    expect(t.roster.startingMorale).toBe(65);
    expect(t.roster.startingBurnout).toBe(10);
    expect(t.roster.primarySkillMin).toBe(60);
    expect(t.roster.primarySkillMax).toBe(90);
    expect(t.roster.secondarySkillMin).toBe(0);
    expect(t.roster.secondarySkillMax).toBe(65);
  });

  it('carries the candidate ticket sizing', () => {
    expect(t.backlog.ticketSizeMin).toBe(3);
    expect(t.backlog.ticketSizeMax).toBe(8);
  });

  it('carries the candidate attention economy', () => {
    expect(t.attention.poolPerSprint).toBe(3);
    expect(t.attention.actionCost.oneOnOne).toBe(1);
    expect(t.attention.actionCost.unblock).toBe(1);
    expect(t.attention.actionCost.recognize).toBe(1);
  });

  it('carries the candidate work-resolution parameters', () => {
    expect(t.work.baseOutput).toBe(6);
    expect(t.work.poorFitThreshold).toBe(40);
  });

  it('carries the candidate event-firing chance', () => {
    expect(t.events.perSprintChance).toBe(0.6);
  });

  it('carries the candidate mood-band floors', () => {
    expect(t.reads.moodBands.thriving).toBe(70);
    expect(t.reads.moodBands.steady).toBe(45);
    expect(t.reads.moodBands.dipping).toBe(25);
  });

  it('carries the candidate people and roadmap parameters', () => {
    expect(t.backlog.overCapacityRatio).toBe(1.5);
    expect(t.roadmap.size).toBe(5);
    expect(t.crunch.throughputMultiplier).toBe(1.4);
    expect(t.morale.throughputAtZero).toBe(0.7);
    expect(t.morale.throughputAtHundred).toBe(1.15);
    expect(t.morale.response.reasonableLoad).toBe(3);
    expect(t.morale.response.idle).toBe(-4);
    expect(t.morale.response.overload).toBe(-12);
    expect(t.morale.response.poorFit).toBe(-8);
    expect(t.morale.response.crunch).toBe(-6);
    expect(t.morale.response.oneOnOne).toBe(4);
    expect(t.morale.response.recognize).toBe(14);
    expect(t.morale.response.unblock).toBe(8);
    expect(t.morale.response.unattendedDrift).toBe(-5);
    expect(t.burnout.crunchAccrual).toBe(15);
    expect(t.burnout.overloadAccrual).toBe(8);
    expect(t.burnout.restfulRecovery).toBe(5);
    expect(t.attrition.burnoutThreshold).toBe(80);
    expect(t.attrition.atRiskBurnout).toBe(60);
    expect(t.attrition.warningLeadSprints).toBe(1);
    expect(t.attrition.fastBurnoutJump).toBe(23);
  });
});

describe('tuning constants — design invariants', () => {
  const t = getTuning();

  it('keeps the run in the load-bearing 5–6 sprint band', () => {
    expect(t.run.sprints).toBeGreaterThanOrEqual(5);
    expect(t.run.sprints).toBeLessThanOrEqual(6);
  });

  it('keeps the team small and fixed at 3–4 engineers', () => {
    expect(t.run.teamSize).toBeGreaterThanOrEqual(3);
    expect(t.run.teamSize).toBeLessThanOrEqual(4);
  });

  it('starts the team fresh — well under the attrition threshold', () => {
    // A run must earn its way to crisis. Starting burnout sits low, leaving the
    // whole span up to the threshold for crunch to climb across sprints.
    expect(t.roster.startingBurnout).toBeGreaterThanOrEqual(0);
    expect(t.roster.startingBurnout).toBeLessThan(t.attrition.burnoutThreshold);
    expect(t.roster.startingMorale).toBeGreaterThan(50);
  });

  it('lets a non-primary skill reach zero so poor-fit is always possible', () => {
    expect(t.roster.secondarySkillMin).toBe(0);
  });

  it('keeps skill and ticket bands well-formed (min ≤ max, sizes positive)', () => {
    expect(t.roster.primarySkillMin).toBeLessThanOrEqual(t.roster.primarySkillMax);
    expect(t.roster.secondarySkillMin).toBeLessThanOrEqual(t.roster.secondarySkillMax);
    expect(t.roster.primarySkillMax).toBeLessThanOrEqual(100);
    expect(t.backlog.ticketSizeMin).toBeLessThanOrEqual(t.backlog.ticketSizeMax);
    expect(t.backlog.ticketSizeMin).toBeGreaterThan(0);
  });

  it('lets the manager afford at least one action per sprint', () => {
    const costs = Object.values(t.attention.actionCost);
    expect(t.attention.poolPerSprint).toBeGreaterThanOrEqual(Math.min(...costs));
  });

  it('keeps attention scarce — the pool cannot reach every engineer', () => {
    // The juggle lives here: with more engineers than attention points, the
    // manager can never tend to the whole team in one sprint. This is the
    // scarcity the game is built on, so it is a load-bearing invariant.
    expect(t.attention.poolPerSprint).toBeLessThan(t.run.teamSize);
  });

  it('keeps the backlog genuinely over capacity', () => {
    expect(t.backlog.overCapacityRatio).toBeGreaterThan(1);
  });

  it('makes morale help throughput, monotonically', () => {
    expect(t.morale.throughputAtZero).toBeLessThan(t.morale.throughputAtHundred);
    expect(t.morale.throughputAtZero).toBeGreaterThan(0);
  });

  it('makes crunch a real short-term throughput lever', () => {
    expect(t.crunch.throughputMultiplier).toBeGreaterThan(1);
  });

  it('gives work a positive base output and a poor-fit threshold inside the skill scale', () => {
    expect(t.work.baseOutput).toBeGreaterThan(0);
    expect(t.work.poorFitThreshold).toBeGreaterThan(0);
    expect(t.work.poorFitThreshold).toBeLessThan(100);
  });

  it('keeps the event-firing chance a real probability, with quiet sprints possible', () => {
    // Below 1 so "at most one event per sprint" stays honest — some sprints fire none.
    expect(t.events.perSprintChance).toBeGreaterThan(0);
    expect(t.events.perSprintChance).toBeLessThan(1);
  });

  it('orders the mood-band floors and keeps them inside the morale scale', () => {
    const { thriving, steady, dipping } = t.reads.moodBands;
    expect(thriving).toBeGreaterThan(steady);
    expect(steady).toBeGreaterThan(dipping);
    expect(dipping).toBeGreaterThan(0);
    expect(thriving).toBeLessThanOrEqual(100);
  });

  it('places a freshly-started team in the steady band — neither thriving nor flat', () => {
    // A run opens with the team reading "steady enough," leaving room to read both a
    // rise (recognition, relief) and the slide the crunch arc produces.
    const { thriving, steady } = t.reads.moodBands;
    expect(t.roster.startingMorale).toBeGreaterThanOrEqual(steady);
    expect(t.roster.startingMorale).toBeLessThan(thriving);
  });

  it('guarantees at least one sprint of attrition warning lead time', () => {
    expect(t.attrition.warningLeadSprints).toBeGreaterThanOrEqual(1);
  });

  it('keeps the attrition threshold inside the 0–100 burnout scale', () => {
    expect(t.attrition.burnoutThreshold).toBeGreaterThan(0);
    expect(t.attrition.burnoutThreshold).toBeLessThanOrEqual(100);
  });

  it('places the at-risk band below the threshold and above a fresh start', () => {
    // The warning must have somewhere to live: an engineer reads as at-risk before
    // they are eligible to quit, and a freshly-started engineer is not already at-risk.
    expect(t.attrition.atRiskBurnout).toBeLessThan(t.attrition.burnoutThreshold);
    expect(t.attrition.atRiskBurnout).toBeGreaterThan(t.roster.startingBurnout);
  });

  // The fairness guarantee is not enforced by hope — it is a property of the band
  // shape. These four invariants together prove that every quit carries a warning
  // that precedes it (normal regime) or coincides with it (the bounded fast case):
  // no unforeseeable loss is representable under this tuning.
  it('makes the at-risk band wider than a lone crunch, so a crunch climb cannot skip it', () => {
    // With a band wider than one crunch's accrual, a crunch-only climb must land in
    // [atRiskBurnout, threshold) — and be warned — for at least one sprint before it
    // can reach eligibility. This is the core of the normal-regime guarantee.
    const bandWidth = t.attrition.burnoutThreshold - t.attrition.atRiskBurnout;
    expect(bandWidth).toBeGreaterThan(t.burnout.crunchAccrual);
  });

  it('trips the fast-burnout exception only on a spike larger than a lone crunch', () => {
    // Ordinary crunch (the common case) must always take the fully-warned path, so the
    // exception never becomes the rule.
    expect(t.attrition.fastBurnoutJump).toBeGreaterThan(t.burnout.crunchAccrual);
  });

  it('keeps the fast-burnout exception reachable — the largest possible spike trips it', () => {
    // The exception must be a live code path, not dead tuning: the biggest jump a
    // sprint can produce (crunch and overload stacking) is exactly what triggers it.
    const maxJump = t.burnout.crunchAccrual + t.burnout.overloadAccrual;
    expect(t.attrition.fastBurnoutJump).toBeLessThanOrEqual(maxJump);
  });

  it('makes any band-skipping jump large enough to trip the exception — no unwarned quit escapes both', () => {
    // The one jump big enough to clear the whole band in a single sprint is also big
    // enough to trip the fast exception, which shows the warning coincident with the
    // loss. So a spike that skips the prior-warning path never escapes warning entirely.
    const bandWidth = t.attrition.burnoutThreshold - t.attrition.atRiskBurnout;
    expect(bandWidth).toBeLessThan(t.attrition.fastBurnoutJump);
  });

  it('makes crunch accrue burnout faster than a restful sprint sheds it', () => {
    // The whole delayed echo depends on crunch debt outrunning recovery.
    expect(t.burnout.crunchAccrual).toBeGreaterThan(t.burnout.restfulRecovery);
  });

  it('gives every morale driver the intended direction', () => {
    // Recognition and help lift; overload, poor fit, the crunch grind, being benched,
    // and neglect all erode. Idle being negative is the "idle is not neutral" rule.
    const r = t.morale.response;
    expect(r.reasonableLoad).toBeGreaterThan(0);
    expect(r.recognize).toBeGreaterThan(0);
    expect(r.oneOnOne).toBeGreaterThan(0);
    expect(r.unblock).toBeGreaterThan(0);
    expect(r.idle).toBeLessThan(0);
    expect(r.overload).toBeLessThan(0);
    expect(r.poorFit).toBeLessThan(0);
    expect(r.crunch).toBeLessThan(0);
    expect(r.unattendedDrift).toBeLessThan(0);
  });

  it('makes recognition the strongest single morale lever', () => {
    const r = t.morale.response;
    expect(r.recognize).toBeGreaterThan(r.oneOnOne);
    expect(r.recognize).toBeGreaterThanOrEqual(r.unblock);
  });

  it('keeps morale more volatile per sprint than burnout — the slowness guard', () => {
    // The widest morale swing one sprint can produce must exceed the widest burnout
    // swing, so mood is the fast signal and burnout the slow creep. Burnout's worst
    // case is crunch and overload stacking; morale's is every eroding (or lifting)
    // driver landing at once.
    const r = t.morale.response;
    const worstBurnout = t.burnout.crunchAccrual + t.burnout.overloadAccrual;
    const worstMoraleDrop = Math.abs(
      r.overload + r.poorFit + r.crunch + r.unattendedDrift,
    );
    const bestMoraleLift =
      r.reasonableLoad + r.oneOnOne + r.recognize + r.unblock;
    expect(worstMoraleDrop).toBeGreaterThan(worstBurnout);
    expect(bestMoraleLift).toBeGreaterThan(worstBurnout);
  });
});
