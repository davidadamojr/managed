/**
 * The per-sprint summary — the engine's readable account of a resolved sprint, and
 * the single most important surface in the game. It renders what shipped, roadmap
 * progress, any event, and a fuzzy per-engineer read; the view only displays what this
 * produces and computes nothing itself.
 *
 * This is where the fuzzy-readability rule lives: raw morale and burnout integers
 * never cross this boundary. The engine turns morale into a qualitative mood band,
 * turns a sprint-over-sprint change into a direction word, and surfaces the at-risk
 * flag the attrition system set — all as words and enums, never numbers.
 *
 * Three legibility rules shape the read, beyond the current-state band:
 *   - Trends are first-class. A read carries a direction over sprints ("and slipping
 *     again"), because the crunch→burnout→attrition coupling is only legible across
 *     sprints. The first sprint has no prior to compare, so it reads as state without
 *     direction — deliberately.
 *   - A 1:1 sharpens the read. Its target's mood direction resolves; an engineer the
 *     manager did not check in with reads only as a surface vibe, their trajectory
 *     'unknown'. Talking to someone is what tells you which way they are heading.
 *   - The at-risk warning is unconditional. Whether or not a 1:1 was spent, an at-risk
 *     engineer's read is the human observation the fairness guarantee owes, and a
 *     warning that has held more than a sprint says so across sprints. The fairness
 *     surface never depends on how the player spent attention.
 *
 * Derivation is a pure function of already-settled inputs, so it is deterministic and
 * holds the engine/view wall.
 */

import {
  getTuning,
  moodRead,
  trendClause,
  atRiskPersistenceRead,
  type GameEvent,
  type MoodBand,
} from '../content';
import { atRiskWarning } from './attrition';
import type { Engineer, RoadmapProgress } from './entities';

/**
 * The direction a read conveys over the prior sprint. `rising`/`falling`/`steady` are
 * the resolved directions of a sharpened read; `unknown` is the honest default — the
 * first sprint (no prior to compare) and any engineer the manager did not check in
 * with this sprint.
 */
export type ReadTrend = 'rising' | 'steady' | 'falling' | 'unknown';

/**
 * The resolved facts and settled state one sprint hands to the summary. `roster` is
 * the fully-resolved end-of-sprint team (fresh morale, burnout, and at-risk flags);
 * `priorMoraleById` is each engineer's start-of-sprint morale, kept only to compute a
 * direction and never stored; `oneOnOneIds` are the engineers a 1:1 attended this
 * sprint; `priorReads` are the previous sprint's reads, read to tell a two-sprint
 * slide from a one-sprint dip. The raw numbers enter here transiently and leave as
 * words — none of them reaches the returned summary.
 */
export interface SummaryInputs {
  readonly sprintIndex: number;
  readonly shipped: readonly string[];
  readonly roadmap: RoadmapProgress;
  readonly roster: readonly Engineer[];
  readonly priorMoraleById: Readonly<Record<string, number>>;
  readonly oneOnOneIds: readonly string[];
  readonly priorReads?: readonly EngineerRead[];
  readonly event?: SprintEventReport;
}

/**
 * A fuzzy read of one engineer at sprint end. `note` is qualitative prose, never a
 * number, so the player reads the team through observation rather than a health bar.
 * `atRisk` is the fairness surface: when true the player has been shown this person is
 * in danger, and at least one such sprint is owed before they can quit. `mood` and
 * `trend` are the qualitative band and direction the note is built from, exposed as
 * enums so the view can render them (an icon, a colour) without parsing prose.
 * `sharpened` records that a 1:1 resolved this read — the direction is only as trusted
 * as the attention spent to earn it.
 */
export interface EngineerRead {
  readonly engineerId: string;
  readonly note: string;
  readonly atRisk: boolean;
  readonly mood: MoodBand;
  readonly trend: ReadTrend;
  readonly sharpened: boolean;
}

/**
 * The event that surfaced this sprint, if any. Its `id` and `description` borrow the
 * content event's own field types so they cannot drift from the canonical definition.
 * Only the readable surface and who it landed on are kept — not the effect data — so a
 * stored summary stays a narrative record rather than a copy of tuning.
 */
export interface SprintEventReport {
  readonly id: GameEvent['id'];
  readonly description: GameEvent['description'];
  readonly affectedEngineerIds: readonly string[];
}

/**
 * One resolved sprint's account: what shipped, roadmap progress, a fuzzy read per
 * engineer, and any event. This is derived output that resolution produces; no game
 * rule reads back from it. `event` is optional because a sprint may fire none.
 */
export interface SprintSummary {
  readonly sprintIndex: number;
  /** Ticket ids that reached done during this sprint. */
  readonly shipped: readonly string[];
  readonly roadmap: RoadmapProgress;
  readonly reads: readonly EngineerRead[];
  readonly event?: SprintEventReport;
}

/** Map a morale value to its qualitative band using the tuning floors. */
function moodBandFor(morale: number): MoodBand {
  const { moodBands } = getTuning().reads;
  if (morale >= moodBands.thriving) return 'thriving';
  if (morale >= moodBands.steady) return 'steady';
  if (morale >= moodBands.dipping) return 'dipping';
  return 'struggling';
}

/**
 * The direction of this sprint's morale change — but only when it can be trusted. It
 * resolves to a direction just for an engineer a 1:1 attended (`sharpened`) and only
 * once there is a prior sprint to have moved from (`sprintIndex >= 1`); otherwise it
 * is `unknown`. This is both the "1:1 sharpens the read" rule and the "first sprint
 * shows state without direction" rule, in one place.
 */
function trendFor(
  morale: number,
  priorMorale: number | undefined,
  sharpened: boolean,
  sprintIndex: number,
): ReadTrend {
  if (!sharpened || sprintIndex < 1 || priorMorale === undefined) return 'unknown';
  const delta = morale - priorMorale;
  if (delta > 0) return 'rising';
  if (delta < 0) return 'falling';
  return 'steady';
}

/**
 * The note for an at-risk engineer: the human at-risk observation the fairness
 * guarantee owes, sourced from the content pool by the engineer's stable voice. A
 * warning that has held more than one sprint (the streak the attrition system keeps)
 * gains a persistence line, so a sustained decline reads across sprints — with no
 * 1:1 required, because the fairness surface must never depend on attention spent.
 */
function atRiskNoteFor(engineer: Engineer): string {
  const base = `${engineer.name} ${atRiskWarning(engineer.id)}`;
  const streak = engineer.flags?.atRiskSprints ?? 0;
  return streak >= 2 ? `${base} ${atRiskPersistenceRead()}` : base;
}

/**
 * The note for an engineer who is not at risk: the mood band read, plus a trend clause
 * when the direction resolved. A direction that matches the prior read's direction is
 * the "again" reading, turning two sprints of the same slide into a single sentence.
 */
function moodNoteFor(
  name: string,
  mood: MoodBand,
  trend: ReadTrend,
  priorRead: EngineerRead | undefined,
): string {
  const base = `${name} ${moodRead(mood)}`;
  if (trend !== 'rising' && trend !== 'falling') return `${base}.`;
  const sustained = priorRead?.trend === trend;
  return `${base}, ${trendClause(trend, sustained)}.`;
}

/** Build one engineer's fuzzy read from their resolved state and this sprint's context. */
function readFor(
  engineer: Engineer,
  priorMorale: number | undefined,
  sharpened: boolean,
  priorRead: EngineerRead | undefined,
  sprintIndex: number,
): EngineerRead {
  const atRisk = (engineer.flags?.atRiskSprints ?? 0) >= 1;
  const mood = moodBandFor(engineer.morale);
  const trend = trendFor(engineer.morale, priorMorale, sharpened, sprintIndex);
  const note = atRisk
    ? atRiskNoteFor(engineer)
    : moodNoteFor(engineer.name, mood, trend, priorRead);
  return { engineerId: engineer.id, note, atRisk, mood, trend, sharpened };
}

/**
 * Build a sprint's summary from its resolved facts and the team's settled state. This
 * is the derivation the tick calls; keeping it a pure function of already-settled
 * inputs holds the engine/view wall — the view renders what this returns and computes
 * nothing itself. Every per-engineer read is fuzzy by construction: the raw morale and
 * burnout that enter through the inputs are turned into a band, a direction, and an
 * at-risk flag, and never carried onto the returned summary.
 */
export function deriveSummary(inputs: SummaryInputs): SprintSummary {
  const sharpenedIds = new Set(inputs.oneOnOneIds);
  const priorReadById = new Map(
    (inputs.priorReads ?? []).map((read) => [read.engineerId, read]),
  );

  const reads = inputs.roster.map((engineer) =>
    readFor(
      engineer,
      inputs.priorMoraleById[engineer.id],
      sharpenedIds.has(engineer.id),
      priorReadById.get(engineer.id),
      inputs.sprintIndex,
    ),
  );

  const summary: SprintSummary = {
    sprintIndex: inputs.sprintIndex,
    shipped: inputs.shipped,
    roadmap: inputs.roadmap,
    reads,
  };
  return inputs.event ? { ...summary, event: inputs.event } : summary;
}
