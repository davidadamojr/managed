import { describe, it, expect } from 'vitest';
import { listSkills, isSkill } from '../src/content/skills';

// The skill taxonomy is the shared vocabulary that assignment, roster, and
// sprint resolution all speak. It must be one canonical list sourced from data,
// never re-typed as scattered string literals across the engine.

const EXPECTED_SKILLS = ['frontend', 'backend', 'infra', 'debugging'] as const;

describe('skill taxonomy', () => {
  it('is exactly the four canonical skills', () => {
    // Order-independent equality: the set of skills is the contract, not order.
    expect([...listSkills()].sort()).toEqual([...EXPECTED_SKILLS].sort());
  });

  it('has no duplicates', () => {
    const skills = listSkills();
    expect(new Set(skills).size).toBe(skills.length);
  });

  it('recognizes each canonical skill via the type guard', () => {
    for (const skill of EXPECTED_SKILLS) {
      expect(isSkill(skill)).toBe(true);
    }
  });

  it('rejects strings outside the taxonomy', () => {
    expect(isSkill('devops')).toBe(false);
    expect(isSkill('')).toBe(false);
    expect(isSkill('Frontend')).toBe(false);
  });
});
