import { describe, it, expect } from 'vitest';
import {
  skillFit,
  isPoorFit,
  workOutput,
  resolveWork,
  emptyActions,
  assign,
  setCrunch,
  type Engineer,
  type Ticket,
  type SkillProficiencies,
} from '../src/engine';
import { getTuning, listSkills, type Skill } from '../src/content';

// Work resolution is the juggle half of the tick: skill fit + morale + crunch decide
// how far a ticket moves, and the classification decides what the people model then
// responds to. These tests fix the throughput ordering (good fit and good morale ship
// more; crunch lifts it), the total handling of odd plans (idle, poor fit, wasted or
// impossible assignments), and the two resolution rules the module owns (crunch skips
// the idle bench; over-capacity work is simply left unserved).

const t = getTuning();

/** All four skills at `base`, with overrides — a total map with controlled holes. */
function skillsWith(
  base: number,
  overrides: Partial<Record<Skill, number>> = {},
): SkillProficiencies {
  const map = {} as Record<Skill, number>;
  for (const s of listSkills()) map[s] = overrides[s] ?? base;
  return map;
}

function engineer(id: string, skills: SkillProficiencies, morale = 65): Engineer {
  return { id, name: id, flavor: 'vibe', skills, morale, burnout: 10, assignment: null };
}

function ticket(id: string, requiredSkill: Skill, size = 5): Ticket {
  return { id, size, requiredSkill, progress: 0, status: 'open' };
}

describe('skillFit — proficiency as a 0–1 fraction', () => {
  it('reads the required skill straight off the engineer', () => {
    const eng = engineer('e', skillsWith(0, { backend: 80 }));
    expect(skillFit(eng, 'backend')).toBeCloseTo(0.8);
    expect(skillFit(eng, 'frontend')).toBe(0);
  });
});

describe('isPoorFit — the boolean morale frustration, not the throughput curve', () => {
  it('is true at or below the tuning threshold, false above it', () => {
    const th = t.work.poorFitThreshold;
    const weak = engineer('weak', skillsWith(0, { infra: th }));
    const ok = engineer('ok', skillsWith(0, { infra: th + 1 }));
    expect(isPoorFit(weak, ticket('k', 'infra'))).toBe(true);
    expect(isPoorFit(ok, ticket('k', 'infra'))).toBe(false);
  });
});

describe('workOutput — base scaled by fit, morale, and crunch', () => {
  const good = engineer('good', skillsWith(0, { backend: 100 }), 100);
  const k = ticket('k', 'backend');

  it('is base × fit × morale × crunch, exactly', () => {
    const expected =
      t.work.baseOutput * 1 * t.morale.throughputAtHundred * t.crunch.throughputMultiplier;
    expect(workOutput(good, k, true)).toBeCloseTo(expected);
  });

  it('a good fit ships more than a poor fit, all else equal', () => {
    const poor = engineer('poor', skillsWith(0, { backend: 20 }), 100);
    expect(workOutput(good, k, false)).toBeGreaterThan(workOutput(poor, k, false));
  });

  it('higher morale ships more than lower morale, all else equal', () => {
    const low = engineer('low', skillsWith(0, { backend: 100 }), 10);
    expect(workOutput(good, k, false)).toBeGreaterThan(workOutput(low, k, false));
  });

  it('crunch ships strictly more than the same non-crunch sprint', () => {
    expect(workOutput(good, k, true)).toBeGreaterThan(workOutput(good, k, false));
  });
});

describe('resolveWork — progress, shipping, and classification', () => {
  it('a good-fit engineer completes a small ticket and ships it', () => {
    const eng = engineer('e', skillsWith(0, { backend: 100 }), 100);
    const k = ticket('k', 'backend', 3);
    const plan = assign(emptyActions(), 'e', 'k');
    const out = resolveWork([eng], [k], plan);

    expect(out.shipped).toEqual(['k']);
    expect(out.backlog[0]!.status).toBe('done');
    expect(out.classifications['e']).toMatchObject({ workload: 'assigned', poorFit: false });
  });

  it('a poor fit makes real-but-slow progress and does not ship', () => {
    const eng = engineer('e', skillsWith(0, { backend: 10 }), 65);
    const k = ticket('k', 'backend', 8);
    const plan = assign(emptyActions(), 'e', 'k');
    const out = resolveWork([eng], [k], plan);

    expect(out.shipped).toEqual([]);
    expect(out.backlog[0]!.status).toBe('in-progress');
    expect(out.backlog[0]!.progress).toBeGreaterThan(0);
    expect(out.backlog[0]!.progress).toBeLessThan(k.size);
    expect(out.classifications['e']!.poorFit).toBe(true);
  });

  it('an idle engineer produces no work and is classified idle', () => {
    const eng = engineer('e', skillsWith(50));
    const k = ticket('k', 'backend');
    const out = resolveWork([eng], [k], emptyActions());

    expect(out.shipped).toEqual([]);
    expect(out.backlog[0]!.progress).toBe(0);
    expect(out.backlog[0]!.status).toBe('open');
    expect(out.classifications['e']).toEqual({
      workload: 'idle',
      poorFit: false,
      crunch: false,
      assignment: null,
    });
  });

  it('two engineers on one ticket pool their output', () => {
    const a = engineer('a', skillsWith(0, { backend: 100 }), 100);
    const b = engineer('b', skillsWith(0, { backend: 100 }), 100);
    const k = ticket('k', 'backend', 5);
    const plan = assign(assign(emptyActions(), 'a', 'k'), 'b', 'k');
    const soloProgress = resolveWork([a], [k], assign(emptyActions(), 'a', 'k')).backlog[0]!.progress;
    const pairProgress = resolveWork([a, b], [k], plan).backlog[0]!.progress;

    expect(pairProgress).toBeCloseTo(2 * soloProgress);
  });

  it('leaves an already-done ticket done and does not re-ship it', () => {
    const eng = engineer('e', skillsWith(0, { backend: 100 }), 100);
    const done: Ticket = { id: 'k', size: 5, requiredSkill: 'backend', progress: 5, status: 'done' };
    const plan = assign(emptyActions(), 'e', 'k');
    const out = resolveWork([eng], [done], plan);

    expect(out.shipped).toEqual([]);
    expect(out.backlog[0]).toEqual(done); // untouched: no wasted progress accrues
    expect(out.classifications['e']!.workload).toBe('assigned'); // still given a job
  });

  it('treats an impossible ticket reference as assigned-but-no-work, never throwing', () => {
    const eng = engineer('e', skillsWith(50));
    const plan = assign(emptyActions(), 'e', 'ghost');
    const out = resolveWork([eng], [ticket('k', 'backend')], plan);

    expect(out.shipped).toEqual([]);
    expect(out.backlog[0]!.progress).toBe(0);
    expect(out.classifications['e']).toMatchObject({ workload: 'assigned', poorFit: false });
    expect(out.classifications['e']!.assignment).toEqual({ ticketIds: ['ghost'], crunch: false });
  });

  it('leaves over-capacity backlog unserved — no auto-balance', () => {
    const eng = engineer('e', skillsWith(0, { backend: 100 }), 100);
    const served = ticket('served', 'backend', 3);
    const spare1 = ticket('spare-1', 'backend', 3);
    const spare2 = ticket('spare-2', 'frontend', 3);
    const plan = assign(emptyActions(), 'e', 'served');
    const out = resolveWork([eng], [served, spare1, spare2], plan);

    expect(out.shipped).toEqual(['served']);
    expect(out.backlog.find((k) => k.id === 'spare-1')).toEqual(spare1);
    expect(out.backlog.find((k) => k.id === 'spare-2')).toEqual(spare2);
  });
});

describe('resolveWork — crunch is a per-engineer effect, and only for the assigned', () => {
  it('marks an assigned engineer as crunching under a team crunch', () => {
    const eng = engineer('e', skillsWith(50));
    const plan = setCrunch(assign(emptyActions(), 'e', 'k'), true);
    const out = resolveWork([eng], [ticket('k', 'backend')], plan);
    expect(out.classifications['e']!.crunch).toBe(true);
    expect(out.classifications['e']!.assignment).toEqual({ ticketIds: ['k'], crunch: true });
  });

  it('does not crunch an idle engineer even when the team crunches', () => {
    const eng = engineer('e', skillsWith(50));
    const plan = setCrunch(emptyActions(), true); // crunch on, but nobody assigned
    const out = resolveWork([eng], [ticket('k', 'backend')], plan);
    expect(out.classifications['e']!.crunch).toBe(false);
    expect(out.classifications['e']!.workload).toBe('idle');
  });
});
