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
});
