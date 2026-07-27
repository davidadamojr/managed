/**
 * The per-sprint summary — the engine's readable account of a resolved sprint. The
 * type is fixed here so the run history and the view share one stable contract; the
 * fields are filled in when sprint resolution is built.
 *
 * This is where the fuzzy-readability rule lives: raw morale and burnout integers
 * are never carried here. The engine turns them into qualitative words and an
 * at-risk flag, and the view renders those without computing anything itself.
 */

import type { GameEvent } from '../content';
import type { RoadmapProgress } from './entities';

/**
 * The resolved facts one sprint hands to the summary: what shipped, overall roadmap
 * progress, and the event that fired (if any). The fuzzy per-engineer reads and
 * at-risk flags are added by later prompts — resolution supplies the outcomes; the
 * derivation turns them, and the team's state, into the readable account.
 */
export interface SummaryInputs {
  readonly sprintIndex: number;
  readonly shipped: readonly string[];
  readonly roadmap: RoadmapProgress;
  readonly event?: SprintEventReport;
}

/**
 * A fuzzy read of one engineer at sprint end. `note` is qualitative prose, never a
 * number, so the player reads the team through observation rather than a health
 * bar. `atRisk` is the fairness surface: when true the player has been shown this
 * person is in danger, and at least one such sprint is owed before they can quit.
 */
export interface EngineerRead {
  readonly engineerId: string;
  readonly note: string;
  readonly atRisk: boolean;
}

/**
 * The event that surfaced this sprint, if any. Its `id` and `description` borrow
 * the content event's own field types so they cannot drift from the canonical
 * definition. Only the readable surface and who it landed on are kept — not the
 * effect data — so a stored summary stays a narrative record rather than a copy of
 * tuning.
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

/**
 * Build a sprint's summary from its resolved facts. This is the derivation the tick
 * calls; keeping it a pure function of already-settled inputs holds the engine/view
 * wall — the view renders what this returns and computes nothing itself.
 *
 * At this stage the summary carries the resolved outcomes and any fired event. The
 * fuzzy per-engineer `reads` and their at-risk flags are the derivation prompts' work
 * (from the roster's morale/burnout and prior history); they start empty here so no
 * placeholder read is mistaken for a real one.
 */
export function deriveSummary(inputs: SummaryInputs): SprintSummary {
  const summary: SprintSummary = {
    sprintIndex: inputs.sprintIndex,
    shipped: inputs.shipped,
    roadmap: inputs.roadmap,
    reads: [],
  };
  return inputs.event ? { ...summary, event: inputs.event } : summary;
}
