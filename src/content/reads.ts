/**
 * Fuzzy people-read phrasings — declarative text, never behavior.
 *
 * The game never shows a raw morale or burnout number. When an engineer is at risk
 * of quitting, the player instead reads a human observation — "seems checked out
 * lately" — and it is that read, shown at least a sprint before the loss, that makes
 * an attrition fair rather than arbitrary. The phrasings for that read live here as
 * data so the voice can be tuned and grown without touching engine logic, and so the
 * "reads as observation, not a system alert" rule is enforceable against a fixed set.
 *
 * Each entry is a third-person predicate meant to follow an engineer's name: prefix
 * it with the name and it reads as a sentence ("Priya seems checked out lately"). The
 * engine selects one deterministically from a stable key — no randomness — so a given
 * engineer keeps a consistent voice and a resumed save reproduces the same read.
 */

const AT_RISK_WARNINGS: readonly string[] = [
  'seems checked out lately.',
  'has gone quiet in standup — not the good kind of quiet.',
  'is running on fumes, and it is starting to show.',
  'keeps talking about "just getting through this one."',
  'logs off later every night and answers slower every morning.',
  'has that thousand-yard stare in reviews now.',
];

/** The at-risk warning phrasings. Read-only by contract. */
export function listAtRiskWarnings(): readonly string[] {
  return AT_RISK_WARNINGS;
}
