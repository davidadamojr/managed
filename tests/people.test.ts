import { describe, it, expect } from 'vitest';
import {
  moraleDelta,
  burnoutDelta,
  applyPeopleResponse,
  moraleThroughputMultiplier,
  ATTRIBUTE_MIN,
  ATTRIBUTE_MAX,
  type SprintExperience,
  type PeopleState,
} from '../src/engine';
import { getTuning } from '../src/content';

// The people model is a pair of pure response functions over one engineer's sprint.
// These tests fix the properties the delayed echo rests on: morale is the fast,
// volatile signal (big swings in a single sprint, both directions); burnout is the
// slow creep (small steps that accumulate and do not reset); the two never merge; and
// every coefficient comes from tuning so the shape is retunable as data.

const t = getTuning();
const R = t.morale.response;

/** A neutral experience — assigned, well-fit, no crunch, unattended — to vary from. */
function experience(over: Partial<SprintExperience> = {}): SprintExperience {
  return { workload: 'assigned', poorFit: false, crunch: false, attention: [], ...over };
}

describe('morale — moves meaningfully within a single sprint, both ways', () => {
  it('rises on recognition, an unblock, and a sensible load', () => {
    expect(moraleDelta(experience({ attention: ['recognize'] }))).toBeGreaterThan(0);
    expect(moraleDelta(experience({ attention: ['unblock'] }))).toBeGreaterThan(0);
    // Assigned-and-attended (a 1:1) is a net lift: no drift, sensible load, a small lift.
    expect(moraleDelta(experience({ attention: ['oneOnOne'] }))).toBeGreaterThan(0);
  });

  it('falls on overload, poor fit, the crunch grind, and neglect', () => {
    expect(moraleDelta(experience({ workload: 'overloaded' }))).toBeLessThan(0);
    expect(moraleDelta(experience({ poorFit: true }))).toBeLessThan(0);
    expect(moraleDelta(experience({ crunch: true }))).toBeLessThan(0);
    // A plain unattended sprint (neglect) erodes on drift alone.
    expect(moraleDelta(experience({ attention: [] }))).toBeLessThan(0);
  });

  it('sums the drivers a sprint presents, straight from tuning', () => {
    // Assigned + recognized, attended (no drift): the two positive drivers only.
    expect(moraleDelta(experience({ attention: ['recognize'] }))).toBe(
      R.reasonableLoad + R.recognize,
    );
    // Every eroding driver landing at once.
    expect(moraleDelta(experience({ workload: 'overloaded', poorFit: true, crunch: true }))).toBe(
      R.overload + R.poorFit + R.crunch + R.unattendedDrift,
    );
  });

  it('lets lavish attention stack (two actions on one engineer both count)', () => {
    const once = moraleDelta(experience({ attention: ['recognize'] }));
    const twice = moraleDelta(experience({ attention: ['recognize', 'recognize'] }));
    expect(twice - once).toBe(R.recognize);
  });
});

describe('idle is not neutral, and neglect drifts over time', () => {
  it('an idle engineer has a defined, non-zero response — not a stub', () => {
    // Idle + unattended: benched and ignored. Both dings land; the result is clearly
    // negative, never zero.
    const delta = moraleDelta(experience({ workload: 'idle', attention: [] }));
    expect(delta).toBe(R.idle + R.unattendedDrift);
    expect(delta).not.toBe(0);
  });

  it('an engineer left unattended sprint after sprint erodes', () => {
    // No attention across three sprints: morale keeps falling, giving the no-op sprint
    // a real, compounding cost.
    let person: PeopleState = { morale: t.roster.startingMorale, burnout: t.roster.startingBurnout };
    const neglect = experience({ attention: [] });
    const start = person.morale;
    for (let sprint = 0; sprint < 3; sprint += 1) {
      const next = applyPeopleResponse(person, neglect);
      expect(next.morale).toBeLessThan(person.morale);
      person = next;
    }
    expect(person.morale).toBeLessThan(start);
  });
});

describe('burnout — accumulates across sprints and does not reset', () => {
  it('adds a fixed amount for crunch, immediately and deterministically', () => {
    const delta = burnoutDelta(experience({ crunch: true }));
    expect(delta).toBe(t.burnout.crunchAccrual);
    // Deterministic: the same input always yields the same accrual, no RNG.
    expect(burnoutDelta(experience({ crunch: true }))).toBe(delta);
  });

  it('stacks crunch and overload, and sheds only a little when restful', () => {
    expect(burnoutDelta(experience({ crunch: true, workload: 'overloaded' }))).toBe(
      t.burnout.crunchAccrual + t.burnout.overloadAccrual,
    );
    // Neither crunch nor overload — a sensible or idle sprint recovers slowly.
    expect(burnoutDelta(experience({ workload: 'assigned' }))).toBe(-t.burnout.restfulRecovery);
    expect(burnoutDelta(experience({ workload: 'idle' }))).toBe(-t.burnout.restfulRecovery);
  });

  it('climbs across sustained crunch and a single calm sprint does not undo it', () => {
    let person: PeopleState = { morale: t.roster.startingMorale, burnout: t.roster.startingBurnout };
    const start = person.burnout;
    const crunch = experience({ crunch: true });
    for (let sprint = 0; sprint < 3; sprint += 1) {
      const next = applyPeopleResponse(person, crunch);
      expect(next.burnout).toBeGreaterThan(person.burnout); // monotonic climb
      person = next;
    }
    const peak = person.burnout;
    expect(peak).toBe(start + 3 * t.burnout.crunchAccrual);

    // One restful sprint recovers only `restfulRecovery` — burnout stays far above
    // where it began. The debt does not wash out in a sprint.
    const afterRest = applyPeopleResponse(person, experience({ workload: 'assigned' }));
    expect(afterRest.burnout).toBe(peak - t.burnout.restfulRecovery);
    expect(afterRest.burnout).toBeGreaterThan(start);
  });
});

describe('the slowness invariant — morale swings wider per sprint than burnout', () => {
  it('the widest one-sprint morale swing exceeds the widest burnout swing', () => {
    // If a single sprint could move burnout as far as morale, one crunch would spike
    // straight to the attrition threshold and the echo would not be delayed. So the
    // most morale can move in a sprint must beat the most burnout can.
    const worstDrop = experience({ workload: 'overloaded', poorFit: true, crunch: true });
    const bestLift = experience({ workload: 'assigned', attention: ['recognize', 'oneOnOne', 'unblock'] });
    const worstBurnout = experience({ workload: 'overloaded', crunch: true });

    const maxMoraleSwing = Math.max(Math.abs(moraleDelta(worstDrop)), moraleDelta(bestLift));
    const maxBurnoutSwing = burnoutDelta(worstBurnout);

    expect(maxBurnoutSwing).toBeLessThan(maxMoraleSwing);
    // And for one and the same brutal sprint, mood reacts harder than burnout accrues.
    expect(Math.abs(moraleDelta(worstDrop))).toBeGreaterThan(burnoutDelta(worstDrop));
  });
});

describe('morale and burnout stay two values on two paths', () => {
  it('can move in opposite directions in the same sprint', () => {
    // Assigned, recognized, no crunch: mood lifts while burnout recovers. A single
    // merged number could never do this.
    const before: PeopleState = { morale: 50, burnout: 50 };
    const after = applyPeopleResponse(before, experience({ attention: ['recognize'] }));
    expect(after.morale).toBeGreaterThan(before.morale);
    expect(after.burnout).toBeLessThan(before.burnout);
  });

  it('a morale-only driver leaves burnout untouched', () => {
    // Poor fit and attention are morale frustrations/lifts, never burnout inputs.
    // Toggling them must not move the burnout path at all.
    const base = experience();
    expect(burnoutDelta(experience({ poorFit: true }))).toBe(burnoutDelta(base));
    expect(burnoutDelta(experience({ attention: ['recognize'] }))).toBe(burnoutDelta(base));
    // But they clearly move morale.
    expect(moraleDelta(experience({ poorFit: true }))).not.toBe(moraleDelta(base));
  });
});

describe('both attributes clamp to 0–100 — no overflow', () => {
  it('caps burnout at 100 under heavy accrual', () => {
    const after = applyPeopleResponse({ morale: 50, burnout: 95 }, experience({ crunch: true, workload: 'overloaded' }));
    expect(after.burnout).toBe(ATTRIBUTE_MAX);
  });

  it('floors burnout at 0 when recovery would take it below', () => {
    const after = applyPeopleResponse({ morale: 50, burnout: 3 }, experience({ workload: 'assigned' }));
    expect(after.burnout).toBe(ATTRIBUTE_MIN);
  });

  it('caps morale at 100 and floors it at 0', () => {
    const lifted = applyPeopleResponse({ morale: 96, burnout: 50 }, experience({ attention: ['recognize'] }));
    expect(lifted.morale).toBe(ATTRIBUTE_MAX);

    const crushed = applyPeopleResponse({ morale: 4, burnout: 50 }, experience({ workload: 'overloaded', poorFit: true, crunch: true }));
    expect(crushed.morale).toBe(ATTRIBUTE_MIN);
  });
});

describe('moraleThroughputMultiplier — defined here, applied by the tick', () => {
  it('reads its endpoints straight from tuning', () => {
    expect(moraleThroughputMultiplier(ATTRIBUTE_MIN)).toBe(t.morale.throughputAtZero);
    expect(moraleThroughputMultiplier(ATTRIBUTE_MAX)).toBe(t.morale.throughputAtHundred);
  });

  it('rises monotonically between the endpoints', () => {
    expect(moraleThroughputMultiplier(25)).toBeGreaterThan(moraleThroughputMultiplier(0));
    expect(moraleThroughputMultiplier(75)).toBeGreaterThan(moraleThroughputMultiplier(25));
    expect(moraleThroughputMultiplier(100)).toBeGreaterThan(moraleThroughputMultiplier(75));
  });

  it('clamps an out-of-range morale rather than extrapolating', () => {
    expect(moraleThroughputMultiplier(150)).toBe(moraleThroughputMultiplier(100));
    expect(moraleThroughputMultiplier(-20)).toBe(moraleThroughputMultiplier(0));
  });
});
