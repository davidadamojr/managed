import { describe, it, expect } from 'vitest';
import {
  clampAttribute,
  ATTRIBUTE_MIN,
  ATTRIBUTE_MAX,
  roadmapProgress,
  attentionCapacityFor,
  type Engineer,
  type Ticket,
  type Roadmap,
  type ManagerState,
  type AttentionPool,
} from '../src/engine';
import { getTuning } from '../src/content';

// A minimal engineer used as a spread base so tests can vary one field at a time.
const baseEngineer: Engineer = {
  id: 'e1',
  name: 'Priya Nair',
  flavor: 'Ships quietly.',
  skills: { frontend: 70, backend: 40, infra: 20, debugging: 55 },
  morale: 60,
  burnout: 30,
  assignment: null,
};

describe('Engineer', () => {
  it('constructs with the full set of typed fields', () => {
    expect(baseEngineer.skills.frontend).toBe(70);
    expect(baseEngineer.assignment).toBeNull();
  });

  it('keeps morale and burnout as distinct, independently set fields', () => {
    const stressed: Engineer = { ...baseEngineer, morale: 20, burnout: 85 };
    expect(stressed.morale).toBe(20);
    expect(stressed.burnout).toBe(85);

    // Changing one leaves the other untouched — proof they are not one number.
    const cheeredUp: Engineer = { ...stressed, morale: 90 };
    expect(cheeredUp.morale).toBe(90);
    expect(cheeredUp.burnout).toBe(85);
  });

  it('carries an assignment when working this sprint', () => {
    const working: Engineer = {
      ...baseEngineer,
      assignment: { ticketIds: ['t1', 't2'], crunch: true },
    };
    expect(working.assignment?.ticketIds).toEqual(['t1', 't2']);
    expect(working.assignment?.crunch).toBe(true);
  });
});

describe('clampAttribute', () => {
  it('pins values below the floor and above the ceiling', () => {
    expect(clampAttribute(-40)).toBe(ATTRIBUTE_MIN);
    expect(clampAttribute(140)).toBe(ATTRIBUTE_MAX);
  });

  it('leaves in-range values unchanged', () => {
    expect(clampAttribute(0)).toBe(0);
    expect(clampAttribute(55)).toBe(55);
    expect(clampAttribute(100)).toBe(100);
  });
});

describe('roadmapProgress', () => {
  const backlog: readonly Ticket[] = [
    { id: 't1', size: 3, requiredSkill: 'frontend', progress: 3, status: 'done' },
    { id: 't2', size: 5, requiredSkill: 'backend', progress: 2, status: 'in-progress' },
    { id: 't3', size: 2, requiredSkill: 'infra', progress: 2, status: 'done' },
  ];

  it('counts only roadmap tickets that are done', () => {
    const roadmap: Roadmap = { ticketIds: ['t1', 't2', 't3'] };
    expect(roadmapProgress(roadmap, backlog)).toEqual({ completed: 2, total: 3 });
  });

  it('ignores roadmap ids with no matching backlog ticket', () => {
    const roadmap: Roadmap = { ticketIds: ['t1', 'ghost'] };
    expect(roadmapProgress(roadmap, backlog)).toEqual({ completed: 1, total: 2 });
  });

  it('reports zero completed for an all-open roadmap', () => {
    const roadmap: Roadmap = { ticketIds: ['t2'] };
    expect(roadmapProgress(roadmap, backlog)).toEqual({ completed: 0, total: 1 });
  });
});

describe('attentionCapacityFor', () => {
  const base = getTuning().attention.poolPerSprint;

  it('returns the base pool from tuning, not a hardcoded literal', () => {
    const manager: ManagerState = { reputation: 0, burnout: 0 };
    expect(attentionCapacityFor(manager)).toBe(base);
  });

  it('ignores the manager fields for now (capacity is stable across states)', () => {
    const calm: ManagerState = { reputation: 0, burnout: 0 };
    const strained: ManagerState = { reputation: 90, burnout: 75 };
    expect(attentionCapacityFor(strained)).toBe(attentionCapacityFor(calm));
  });

  it('is the source a pool derives its capacity from', () => {
    const manager: ManagerState = { reputation: 10, burnout: 5 };
    const capacity = attentionCapacityFor(manager);
    const pool: AttentionPool = { capacity, remaining: capacity };
    expect(pool.capacity).toBe(base);
    expect(pool.remaining).toBe(base);
  });
});
