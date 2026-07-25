/**
 * The skill taxonomy — the shared vocabulary of assignment, roster, and sprint
 * resolution.
 *
 * The union type is DERIVED from the data array (`as const` + indexed access) so
 * there is exactly one source of truth: adding or removing a skill here updates
 * the type everywhere, and no engine file can silently re-type the set as loose
 * string literals.
 */

const SKILLS = ['frontend', 'backend', 'infra', 'debugging'] as const;

/** One of the four canonical engineering skills. */
export type Skill = (typeof SKILLS)[number];

/** The canonical skill list, in declaration order. Read-only by contract. */
export function listSkills(): readonly Skill[] {
  return SKILLS;
}

/**
 * Narrowing guard for untrusted strings (e.g. deserialized save data). Lets the
 * engine validate a value into the `Skill` union without duplicating the list.
 */
export function isSkill(value: string): value is Skill {
  return (SKILLS as readonly string[]).includes(value);
}
