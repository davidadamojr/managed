/**
 * `tick` — the central pure function of the whole engine. It is the "Resolve" verb:
 * one sprint's plan in, the next state plus a readable summary out. Every other system
 * built so far (work resolution, the people model, attention, events, attrition) is a
 * pure unit; this file only assembles them, in a fixed order, and threads the seeded
 * RNG through the one step that needs it.
 *
 * The order of operations is LOCKED and must not drift — determinism and the fairness
 * guarantee both depend on it:
 *
 *   1. resolve work        at start-of-sprint morale and fit (before mood shifts)
 *   2. update people       morale (within-sprint) + burnout (across-sprint) per engineer
 *   3. evaluate attrition   after burnout is written, so a quit is judged on fresh state
 *   4. fire event          at most one, only while the run continues
 *   5. derive the summary  the readable account of everything above
 *   6. advance             next sprint index + a refreshed attention pool
 *
 * Purity is absolute: the input `state` is never mutated, no I/O or clock is touched,
 * and the only randomness is the RNG carried inside `state`, whose advanced position is
 * written into the returned state so a resume replays the sprint exactly.
 */

import { freshAttentionPool } from './attention';
import { attentionKindsFor, type SprintActions } from './actions';
import { roadmapProgress, type Engineer } from './entities';
import { applyPeopleResponse, type SprintExperience } from './people';
import { resolveWork } from './work';
import { fireEvent } from './sprintEvents';
import { evaluateAttrition } from './attrition';
import { deriveSummary, type SprintSummary } from './summary';
import type { GameState, RunStatus } from './state';

/**
 * The locked tick contract (§5.1): the next state and the sprint's summary. The
 * summary is returned for immediate use and is also retained on the state's history.
 */
export interface TickResult {
  readonly state: GameState;
  readonly summary: SprintSummary;
}

/**
 * Resolve one sprint. Pure and deterministic: identical `state` (carrying the seed and
 * RNG cursor) and identical `actions` always produce an identical result.
 */
export function tick(state: GameState, actions: SprintActions): TickResult {
  // 1. Resolve work against the plan at start-of-sprint morale and fit.
  const work = resolveWork(state.roster, state.backlog, actions);

  // 2. Update each engineer's morale and burnout from the sprint they lived through —
  //    the work classification plus the attention they received — and project the
  //    resolved plan onto their assignment.
  const peopleRoster: readonly Engineer[] = state.roster.map((engineer) => {
    const classified = work.classifications[engineer.id]!;
    const experience: SprintExperience = {
      workload: classified.workload,
      poorFit: classified.poorFit,
      crunch: classified.crunch,
      attention: attentionKindsFor(actions, engineer.id),
    };
    const people = applyPeopleResponse(engineer, experience);
    return {
      ...engineer,
      morale: people.morale,
      burnout: people.burnout,
      assignment: classified.assignment,
    };
  });

  // 3. Evaluate attrition on the freshly-updated burnout (prompt 09 fills the body).
  const attrition = evaluateAttrition(peopleRoster, state);
  let roster = attrition.roster;
  let status: RunStatus = attrition.status;
  let rngState = state.rngState;

  // 4. Fire at most one event — only a continuing run has a mood to move.
  let event;
  if (status === 'active') {
    const fired = fireEvent(roster, rngState);
    roster = fired.roster;
    rngState = fired.rng;
    event = fired.report ?? undefined;
  }

  // 5. Derive the readable summary from everything resolved above.
  const summary = deriveSummary({
    sprintIndex: state.sprintIndex,
    shipped: work.shipped,
    roadmap: roadmapProgress(state.roadmap, work.backlog),
    event,
  });

  // 6. Advance — only a continuing run moves to the next sprint. Reaching the run
  //    length with the team intact completes the run.
  const advancing = status === 'active';
  const sprintIndex = advancing ? state.sprintIndex + 1 : state.sprintIndex;
  if (advancing && sprintIndex >= state.runLength) status = 'completed';

  const base: GameState = {
    ...state,
    rngState,
    sprintIndex,
    roster,
    backlog: work.backlog,
    attention: freshAttentionPool(state.manager),
    status,
    history: [...(state.history ?? []), summary],
  };
  // The departure trace is recorded only on the sprint a quit fires; the run ends
  // there, so it never needs carrying across ticks.
  const newState = attrition.departure
    ? { ...base, departure: attrition.departure }
    : base;

  return { state: newState, summary };
}
