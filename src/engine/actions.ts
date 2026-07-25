/**
 * `SprintActions` — the player's plan for one sprint, and the pure operations that
 * build and check it. This is the second half of the tick input, `tick(state,
 * actions)`. It models INTENT only: who is slated to work on what, and whether the
 * team crunches. No throughput, morale, or burnout moves here — those belong to
 * resolution. Keeping the plan separate from the committed `Engineer.assignment`
 * lets a plan be built and revised freely; it is only projected onto engineers when
 * the sprint resolves.
 *
 * The plan stays deliberately permissive. Everything the design means to allow and
 * later punish is legal to express: an idle engineer, a poor-fit assignment, an
 * under-served over-capacity backlog, and two engineers sharing one ticket. Only
 * genuinely impossible references — an unknown engineer or an unknown ticket — are
 * ever rejected, and only by `validateActions`, which reports them rather than
 * throwing so a caller can present a shortfall without treating the plan as an error.
 */

import type { GameState } from './state';

/**
 * A sprint's plan. `assignments` maps an engineer id to the single ticket they are
 * slated for; an engineer absent from the map is idle. A plain object (not a Map) so
 * the plan is JSON-serializable and takes part in deterministic replay unchanged.
 *
 * `crunch` is one flag for the whole team — there is no per-engineer crunch here.
 * Its throughput-now / burnout-later cost is applied deterministically at
 * resolution; the plan only records the choice.
 */
export interface SprintActions {
  readonly assignments: Readonly<Record<string, string>>;
  readonly crunch: boolean;
}

/** A fresh, empty plan: nobody assigned, no crunch. */
export function emptyActions(): SprintActions {
  return { assignments: {}, crunch: false };
}

/**
 * Slate an engineer onto a ticket, returning a new plan. Records intent only — it
 * does not consult the backlog, so an unknown ticket is captured here and surfaces
 * later through `validateActions`. Re-assigning the same engineer replaces their
 * prior ticket, since an engineer carries one ticket this increment. Never mutates
 * the input.
 */
export function assign(
  actions: SprintActions,
  engineerId: string,
  ticketId: string,
): SprintActions {
  return {
    ...actions,
    assignments: { ...actions.assignments, [engineerId]: ticketId },
  };
}

/**
 * Return an engineer to idle, yielding a new plan. Clearing an already-idle engineer
 * is a harmless no-op that still returns a fresh object, so callers can rely on a
 * new plan every time. Never mutates the input.
 */
export function clearAssignment(
  actions: SprintActions,
  engineerId: string,
): SprintActions {
  const assignments = { ...actions.assignments };
  delete assignments[engineerId];
  return { ...actions, assignments };
}

/** The ticket an engineer is slated for, or `null` if idle. */
export function assignmentFor(
  actions: SprintActions,
  engineerId: string,
): string | null {
  return actions.assignments[engineerId] ?? null;
}

/** Set the team-wide crunch flag to a known value, returning a new plan. */
export function setCrunch(
  actions: SprintActions,
  crunch: boolean,
): SprintActions {
  return { ...actions, crunch };
}

/** Flip the team-wide crunch flag, returning a new plan. */
export function toggleCrunch(actions: SprintActions): SprintActions {
  return { ...actions, crunch: !actions.crunch };
}

/**
 * Roster ids with no ticket this sprint, in roster order. This is the shortfall the
 * design promises to present and never balance away: an over-capacity backlog means
 * work goes untouched and engineers can sit idle — both legal, both surfaced here
 * rather than corrected.
 */
export function idleEngineerIds(
  state: GameState,
  actions: SprintActions,
): readonly string[] {
  return state.roster
    .filter((e) => !(e.id in actions.assignments))
    .map((e) => e.id);
}

/**
 * A single impossible reference in a plan: an assignment naming an engineer not on
 * the roster, or a ticket not in the backlog. These are the only things a plan can
 * get outright wrong — everything else is a legal-but-costly choice.
 */
export type AssignmentProblem =
  | {
      readonly kind: 'unknown-engineer';
      readonly engineerId: string;
      readonly ticketId: string;
    }
  | {
      readonly kind: 'unknown-ticket';
      readonly engineerId: string;
      readonly ticketId: string;
    };

/** The outcome of checking a plan against a run. `ok` iff there are no problems. */
export interface ActionValidation {
  readonly ok: boolean;
  readonly problems: readonly AssignmentProblem[];
}

/**
 * Check a plan against the run, reporting only genuinely impossible references. It is
 * intentionally permissive: a poor fit, an idle engineer, an under-served backlog, a
 * ticket already done, and two engineers on one ticket all pass — the design means to
 * allow and later punish them, never to block them. Problems are returned, not thrown,
 * so the caller can show them without treating a plan as a failure. An unknown
 * engineer short-circuits its ticket check, so each bad assignment yields one problem.
 */
export function validateActions(
  state: GameState,
  actions: SprintActions,
): ActionValidation {
  const engineerIds = new Set(state.roster.map((e) => e.id));
  const ticketIds = new Set(state.backlog.map((t) => t.id));
  const problems: AssignmentProblem[] = [];
  for (const [engineerId, ticketId] of Object.entries(actions.assignments)) {
    if (!engineerIds.has(engineerId)) {
      problems.push({ kind: 'unknown-engineer', engineerId, ticketId });
    } else if (!ticketIds.has(ticketId)) {
      problems.push({ kind: 'unknown-ticket', engineerId, ticketId });
    }
  }
  return { ok: problems.length === 0, problems };
}
