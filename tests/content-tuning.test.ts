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
    expect(t.attrition.warningLeadSprints).toBe(1);
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

  it('guarantees at least one sprint of attrition warning lead time', () => {
    expect(t.attrition.warningLeadSprints).toBeGreaterThanOrEqual(1);
  });

  it('keeps the attrition threshold inside the 0–100 burnout scale', () => {
    expect(t.attrition.burnoutThreshold).toBeGreaterThan(0);
    expect(t.attrition.burnoutThreshold).toBeLessThanOrEqual(100);
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
