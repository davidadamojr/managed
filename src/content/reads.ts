/**
 * Fuzzy people-read phrasings — declarative text, never behavior.
 *
 * The game never shows a raw morale or burnout number. The player reads the team
 * through human observation instead: a mood band ("seems a little flat lately"), a
 * direction over sprints ("and slipping again"), and — when someone is in danger of
 * quitting — an at-risk warning ("seems checked out lately") shown at least a sprint
 * before the loss. It is those reads, not any interior value, that make an attrition
 * fair rather than arbitrary and a decline legible before it is terminal.
 *
 * All of it lives here as data so the voice can be tuned and grown without touching
 * engine logic, and so the "reads as observation, not a system alert" rule is
 * enforceable against a fixed set. The engine composes these fragments into a
 * sentence and selects deterministically (a stable hash, no randomness), so a given
 * engineer keeps a consistent voice and a resumed save reproduces the same read.
 *
 * Fragments are written to follow an engineer's name and to compose: the mood reads
 * and trend clauses carry no trailing period (the engine punctuates once it has
 * assembled the sentence), while the at-risk lines are whole sentences the engine
 * concatenates. None of them carries a digit — the read stays fuzzy by construction.
 */

/**
 * The qualitative mood bands, coarsest-worst to best. This is the vocabulary the
 * fuzzy morale read is expressed in; the numeric floor for each band lives in tuning
 * so legibility can be retuned as data. Defined here, alongside the phrasings, so the
 * words and their names travel together; the engine imports the type.
 */
export type MoodBand = 'thriving' | 'steady' | 'dipping' | 'struggling';

/**
 * The two directions a read can carry a clause for. A steady or not-yet-legible
 * ('unknown') trend adds no clause, so only these two need phrasings.
 */
export type ReadDirection = 'rising' | 'falling';

const AT_RISK_WARNINGS: readonly string[] = [
  'seems checked out lately.',
  'has gone quiet in standup — not the good kind of quiet.',
  'is running on fumes, and it is starting to show.',
  'keeps talking about "just getting through this one."',
  'logs off later every night and answers slower every morning.',
  'has that thousand-yard stare in reviews now.',
];

/**
 * Appended to an at-risk read that has held for more than one sprint. It carries the
 * cross-sprint signal for the danger case without a raw streak count and without
 * needing a 1:1 — the fairness surface must read plainly whether or not the player
 * checked in.
 */
const AT_RISK_PERSISTENCE = 'Still no better.';

/**
 * The mood-band reads, one per band. Fragments meant to follow a name with no trailing
 * period, so the engine can append a trend clause and punctuate the whole sentence
 * once. Observational, never a health-bar word.
 */
const MOOD_READS: Readonly<Record<MoodBand, string>> = {
  thriving: 'looks genuinely energized',
  steady: 'seems steady enough',
  dipping: 'seems a little flat lately',
  struggling: 'looks worn down',
};

/**
 * The trend clauses, keyed by direction, each with a first-time reading and a
 * sustained ("again") reading for when the same direction held the prior sprint. Also
 * name-following fragments with no trailing period.
 */
const TREND_CLAUSES: Readonly<
  Record<ReadDirection, { readonly once: string; readonly again: string }>
> = {
  rising: { once: 'and picking up', again: 'and still climbing' },
  falling: { once: 'and slipping', again: 'and slipping again' },
};

/** The at-risk warning phrasings. Read-only by contract. */
export function listAtRiskWarnings(): readonly string[] {
  return AT_RISK_WARNINGS;
}

/** The sentence appended to a sustained at-risk read. */
export function atRiskPersistenceRead(): string {
  return AT_RISK_PERSISTENCE;
}

/** The mood-read fragment for a band. */
export function moodRead(band: MoodBand): string {
  return MOOD_READS[band];
}

/**
 * The trend clause for a direction. `sustained` picks the "again" reading — used when
 * the same direction held the prior sprint, so a two-sprint slide reads as one.
 */
export function trendClause(direction: ReadDirection, sustained: boolean): string {
  const clause = TREND_CLAUSES[direction];
  return sustained ? clause.again : clause.once;
}

/**
 * Every read fragment and sentence, flattened. Only the phrasing tests use this, to
 * hold the whole set to the observation-not-alarm and no-raw-number rules at once.
 */
export function listAllReadPhrasings(): readonly string[] {
  return [
    ...AT_RISK_WARNINGS,
    AT_RISK_PERSISTENCE,
    ...Object.values(MOOD_READS),
    ...Object.values(TREND_CLAUSES).flatMap((c) => [c.once, c.again]),
  ];
}
