/**
 * The people model — how a sprint's work and treatment move an engineer's morale
 * and burnout. This is one half of the core coupling (the juggle drives people; the
 * next prompt's resolution drives the juggle). It is a set of pure response
 * functions: a per-engineer `SprintExperience` in, morale and burnout deltas out.
 *
 * Morale and burnout are kept on two separate paths on purpose (§5.4). They live on
 * different timescales, and the whole delayed echo depends on that difference:
 *
 *   morale   — fast mood. Swings meaningfully in a single sprint, up (recognition,
 *              relief, a sensible load) and down (overload, poor fit, crunch grind,
 *              neglect). Its combined per-sprint reach is wider than burnout's, so it
 *              is the volatile signal the player reads and steers by.
 *   burnout  — slow accumulation. A crunch or an overloaded sprint adds a fixed
 *              amount now; a restful sprint sheds only a little. Because each step is
 *              small relative to the climb to the attrition threshold, sustained
 *              crunch takes several sprints to surface as risk — the echo is delayed
 *              not because the bookkeeping waits, but because the accrual is slow.
 *
 * Classification is not this module's job. Whether an engineer was idle, assigned, or
 * overloaded, and whether their ticket was a poor fit, is decided at resolution and
 * handed here as an already-settled `SprintExperience`. That keeps this a pure,
 * trivially testable unit with no reach into the plan or the backlog.
 *
 * Everything here is deterministic — no RNG. The relative rates matter more than the
 * absolute numbers, and all of them come from the tuning file so a retune is a data
 * edit, never a logic change.
 */

import { getTuning } from '../content';
import type { AttentionActionKind } from './actions';
import { ATTRIBUTE_MAX, clampAttribute } from './entities';

/**
 * How loaded an engineer was this sprint. `overloaded` is included even though
 * Increment-1 assignment rarely produces it, because the people response to too much
 * work is part of the model; deciding *when* a sprint counts as overloaded belongs to
 * resolution, not here.
 */
export type Workload = 'idle' | 'assigned' | 'overloaded';

/**
 * What one engineer lived through in a sprint — the already-classified facts the
 * response functions read. `attention` is the list of managerial actions this
 * engineer received; an empty list means they were left unattended, which is its own
 * (eroding) input rather than a no-op.
 */
export interface SprintExperience {
  readonly workload: Workload;
  readonly poorFit: boolean;
  readonly crunch: boolean;
  readonly attention: readonly AttentionActionKind[];
}

/**
 * The two people attributes, together. An `Engineer` satisfies this structurally, so
 * the tick can pass an engineer straight in and spread the result back.
 */
export interface PeopleState {
  readonly morale: number;
  readonly burnout: number;
}

/** The morale lift for one received attention action, from tuning. */
function attentionMoraleLift(kind: AttentionActionKind): number {
  const { response } = getTuning().morale;
  switch (kind) {
    case 'oneOnOne':
      return response.oneOnOne;
    case 'recognize':
      return response.recognize;
    case 'unblock':
      return response.unblock;
  }
}

/** The morale contribution of the sprint's workload, from tuning. */
function workloadMoraleShift(workload: Workload): number {
  const { response } = getTuning().morale;
  switch (workload) {
    case 'idle':
      return response.idle;
    case 'assigned':
      return response.reasonableLoad;
    case 'overloaded':
      return response.overload;
  }
}

/**
 * The within-sprint morale change for one engineer. Sums every driver the sprint
 * presented — workload, poor fit, the crunch grind, each attention action received,
 * and (only when nothing was received) the erosion of being left unattended — so a
 * good sprint lifts mood and a bad one tanks it, both meaningfully, in one sprint.
 * Returns a delta; clamping happens in `applyPeopleResponse`.
 */
export function moraleDelta(experience: SprintExperience): number {
  const { response } = getTuning().morale;
  let delta = workloadMoraleShift(experience.workload);
  if (experience.poorFit) delta += response.poorFit;
  if (experience.crunch) delta += response.crunch;
  for (const kind of experience.attention) {
    delta += attentionMoraleLift(kind);
  }
  if (experience.attention.length === 0) delta += response.unattendedDrift;
  return delta;
}

/**
 * The across-sprint burnout change for one engineer. Crunch and overload each add a
 * fixed accrual (and stack when both apply); any sprint that is neither — a sensible
 * load or an idle bench — sheds a smaller amount of recovery. Poor fit and neglect
 * are morale frustrations, not burnout, so they deliberately do not appear here.
 *
 * The accruals are much larger than the recovery on purpose: that asymmetry is what
 * makes sustained crunch a debt that outruns rest and eventually surfaces, while a
 * single crunch followed by calm sprints decays away. Returns a delta; clamping
 * happens in `applyPeopleResponse`.
 */
export function burnoutDelta(experience: SprintExperience): number {
  const { burnout } = getTuning();
  let delta = 0;
  if (experience.crunch) delta += burnout.crunchAccrual;
  if (experience.workload === 'overloaded') delta += burnout.overloadAccrual;
  const strained = experience.crunch || experience.workload === 'overloaded';
  if (!strained) delta -= burnout.restfulRecovery;
  return delta;
}

/**
 * Apply both responses to an engineer's current attributes, each on its own path and
 * each clamped to 0–100 independently, and return the new pair. The two never touch:
 * morale is computed and clamped separately from burnout, so they can never collapse
 * into one value. The tick spreads the result back onto the engineer.
 */
export function applyPeopleResponse(
  current: PeopleState,
  experience: SprintExperience,
): PeopleState {
  return {
    morale: clampAttribute(current.morale + moraleDelta(experience)),
    burnout: clampAttribute(current.burnout + burnoutDelta(experience)),
  };
}

/**
 * How morale scales throughput: a linear read from the tuning multiplier at morale 0
 * up to the one at morale 100. Defined here so the model owns the morale→throughput
 * relationship, but deliberately *not* applied here — the tick multiplies raw output
 * by this when it resolves work. A checked-out team ships less; a lifted one ships
 * more.
 */
export function moraleThroughputMultiplier(morale: number): number {
  const { throughputAtZero, throughputAtHundred } = getTuning().morale;
  const fraction = clampAttribute(morale) / ATTRIBUTE_MAX;
  return throughputAtZero + fraction * (throughputAtHundred - throughputAtZero);
}
