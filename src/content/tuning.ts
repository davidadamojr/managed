/**
 * The single source of every game parameter.
 *
 * IMPORTANT: nothing in the engine may hardcode any of these numbers — the
 * engine reads them from here so the whole game can be retuned by editing this
 * one file, with no logic change. The tuning harness reads these to measure the
 * design's mechanical properties, and the tuning pass rewrites them.
 *
 * These values have been measured against the mechanical bars — the echo lands in its
 * window, the warning always precedes a loss, no strategy both survives and ships for
 * free, and the roadmap is reachable but not comfortably so. That is a *mechanical*
 * result, not a verdict on fun: none of it has been confirmed by playing. Every value is
 * still revisable, and the numbers most likely to move are the roadmap size and the
 * morale throughput band, which is where the mechanical pressure currently comes from.
 *
 * The accompanying tests encode the design *intent* behind these numbers (attention
 * stays scarce, the backlog stays over capacity, crunch debt outruns recovery, the
 * at-risk band is wider than a lone crunch) so a retune that breaks the intent fails
 * loudly rather than quietly changing what the game is about.
 */

export interface TuningConstants {
  readonly run: {
    /** Sprints in a run. The shortest length that lets one crunch round-trip. */
    readonly sprints: number;
    /** Engineers on the team, fixed for the run. */
    readonly teamSize: number;
  };
  readonly roster: {
    /**
     * Morale and burnout every engineer starts a run at. Fixed and uniform on
     * purpose: skills differentiate the team, while a known emotional baseline lets
     * the delayed echo build from play rather than from seed noise.
     */
    readonly startingMorale: number;
    readonly startingBurnout: number;
    /** Proficiency band [min, max] for an engineer's one primary (specialty) skill. */
    readonly primarySkillMin: number;
    readonly primarySkillMax: number;
    /**
     * Band [min, max] for non-primary skills. Reaches down to zero so a poor-fit
     * assignment is always *possible*, never forced.
     */
    readonly secondarySkillMin: number;
    readonly secondarySkillMax: number;
  };
  readonly attention: {
    /** Managerial attention points available each sprint. */
    readonly poolPerSprint: number;
    /** Cost, in attention points, of each managerial action. */
    readonly actionCost: {
      readonly oneOnOne: number;
      readonly unblock: number;
      readonly recognize: number;
    };
  };
  readonly backlog: {
    /**
     * Backlog size as a multiple of a nominal ticket-slot count — one ticket per engineer
     * per sprint. That nominal rate is a construction-time proxy, and it is deliberately
     * generous: real throughput depends on skill fit, morale, and crunch, none of which
     * exist yet when the board is built. Measured against real play the team clears about
     * three-fifths of the nominal rate, so the backlog on screen runs well over twice what
     * a run can finish. Over-shooting is the safe direction — the scarcity is the point,
     * and a backlog that turned out to be clearable would quietly remove it.
     */
    readonly overCapacityRatio: number;
    /** Effort-point band [min, max] for a generated ticket. */
    readonly ticketSizeMin: number;
    readonly ticketSizeMax: number;
  };
  readonly roadmap: {
    /**
     * Number of roadmap tickets — the soft, never-fail target. Sized against what the
     * team actually ships across a whole run (measured, not assumed), so the target sits
     * just out of comfortable reach: disciplined play lands most of it and occasionally
     * all of it, while neglect or sustained crunch visibly falls short. A target the team
     * clears early is the failure mode this guards against — it hands the run back with
     * sprints to spare and drains the pressure out of every later decision.
     */
    readonly size: number;
  };
  readonly crunch: {
    /** Throughput multiplier when an engineer crunches this sprint. */
    readonly throughputMultiplier: number;
  };
  readonly work: {
    /**
     * Effort points a perfectly-fit (proficiency 100), neutral-morale, non-crunch
     * engineer produces against their ticket in one sprint. Skill fit, morale, and
     * crunch scale this up or down at resolution. Sized so a well-fit engineer clears
     * a roughly average ticket in a sprint — the proxy the over-capacity backlog is
     * built against.
     */
    readonly baseOutput: number;
    /**
     * Proficiency at or below which an assignment reads as a poor fit — the morale
     * frustration of the wrong job. This is the boolean threshold for the people
     * response; throughput itself scales continuously with fit, so a fit just above
     * this still ships slowly without counting as a poor fit.
     */
    readonly poorFitThreshold: number;
  };
  readonly events: {
    /**
     * Probability that an event surfaces at all in a sprint. Below 1 on purpose, so
     * some sprints stay quiet — "at most one event per sprint," never guaranteed one.
     */
    readonly perSprintChance: number;
  };
  readonly reads: {
    /**
     * Morale floors for the fuzzy mood bands, keyed by the band name (mirroring the
     * `MoodBand` vocabulary in the content reads). A morale at or above `thriving`
     * reads as thriving, above `steady` as steady, above `dipping` as dipping, and
     * anything lower as struggling. Kept here so legibility — where the read tips from
     * "steady" to "flat" — is retuned as data, not by editing the derivation.
     */
    readonly moodBands: {
      readonly thriving: number;
      readonly steady: number;
      readonly dipping: number;
    };
  };
  readonly morale: {
    /**
     * Throughput multiplier at morale 0 and at morale 100 (linear between). The band is
     * deliberately wide: it is the only thing that makes managerial attention pay for
     * itself in throughput as well as in people. Narrow it and a manager who spends no
     * attention at all ships almost as much as one who spends it every sprint, which
     * quietly removes the attention economy from the game. The midpoint is set so a
     * freshly-started team resolves at roughly 1.0 — morale changes the rate, it does not
     * secretly rescale the whole game's output.
     */
    readonly throughputAtZero: number;
    readonly throughputAtHundred: number;
    /**
     * How a single sprint's treatment moves morale — the fast within-sprint mood.
     * These are summed into one morale delta per engineer, so their combined reach
     * is deliberately wider than any one sprint's burnout swing: mood is the volatile
     * signal the player steers by, while burnout is the slow creep underneath it.
     * Positive lifts, negative erodes.
     */
    readonly response: {
      /** Assigned a sensible, non-overloaded ticket — engaged and well-used. */
      readonly reasonableLoad: number;
      /** Benched with no ticket — not neutral; sitting idle stings a little. */
      readonly idle: number;
      /** Carrying more than they can handle — demoralizing. */
      readonly overload: number;
      /** Stuck on work a poor skill fit — the frustration of the wrong job. */
      readonly poorFit: number;
      /** Grinding through a crunch sprint depresses mood now, on top of burnout later. */
      readonly crunch: number;
      /** A 1:1 — a small lift from being heard (its main job is sharpening the read). */
      readonly oneOnOne: number;
      /** Recognition — the largest single morale lever. */
      readonly recognize: number;
      /** An Unblock — relief from friction. */
      readonly unblock: number;
      /** Received no attention at all this sprint — quiet erosion that makes neglect bite. */
      readonly unattendedDrift: number;
    };
  };
  readonly burnout: {
    /** Burnout added to an engineer who crunches a sprint. */
    readonly crunchAccrual: number;
    /** Burnout added to an engineer carrying an overloaded sprint. */
    readonly overloadAccrual: number;
    /** Burnout shed in a restful (non-crunch, non-overload) sprint. */
    readonly restfulRecovery: number;
  };
  readonly attrition: {
    /** Burnout at or above which an engineer becomes attrition-eligible. */
    readonly burnoutThreshold: number;
    /**
     * Burnout at or above which an engineer reads as at-risk — the lower edge of the
     * warning band [atRiskBurnout, burnoutThreshold). Sits below the threshold so the
     * fuzzy warning surfaces while there is still a sprint to act on it. The band is
     * kept wider than a single crunch's accrual, so a crunch-only climb can never step
     * over it into eligibility unwarned — the structural core of the fairness guarantee.
     */
    readonly atRiskBurnout: number;
    /** Sprints of fuzzy at-risk warning owed before an eligible quit. */
    readonly warningLeadSprints: number;
    /**
     * Single-sprint burnout jump at or above which the fairness lead time may be
     * compressed: the spike was so drastic that showing the warning in the same summary
     * as the loss is fair (the player drove it there in one sprint). Set to the largest
     * accrual a sprint can produce, so only a maxed-out sprint triggers it — and larger
     * than a lone crunch, so ordinary crunch always takes the fully-warned path. This is
     * the narrow, bounded exception; it never swallows the general guarantee.
     */
    readonly fastBurnoutJump: number;
  };
}

/**
 * A partial view of the tuning tree: any subset of sections and fields, nested to any
 * depth, with every leaf optional. This is the shape the harness passes to override a
 * few parameters while leaving the rest at their candidate values.
 */
export type TuningOverride = DeepPartial<TuningConstants>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const TUNING: TuningConstants = {
  run: {
    sprints: 6,
    teamSize: 4,
  },
  roster: {
    startingMorale: 65,
    startingBurnout: 10,
    primarySkillMin: 60,
    primarySkillMax: 90,
    secondarySkillMin: 0,
    secondarySkillMax: 65,
  },
  attention: {
    poolPerSprint: 3,
    actionCost: {
      oneOnOne: 1,
      unblock: 1,
      recognize: 1,
    },
  },
  backlog: {
    overCapacityRatio: 1.5,
    ticketSizeMin: 3,
    ticketSizeMax: 8,
  },
  roadmap: {
    size: 16,
  },
  crunch: {
    throughputMultiplier: 1.4,
  },
  work: {
    baseOutput: 6,
    poorFitThreshold: 40,
  },
  events: {
    perSprintChance: 0.6,
  },
  reads: {
    moodBands: {
      thriving: 70,
      steady: 45,
      dipping: 25,
    },
  },
  morale: {
    throughputAtZero: 0.4,
    throughputAtHundred: 1.3,
    response: {
      reasonableLoad: 3,
      idle: -4,
      overload: -12,
      poorFit: -8,
      crunch: -6,
      oneOnOne: 4,
      recognize: 14,
      unblock: 8,
      unattendedDrift: -5,
    },
  },
  burnout: {
    crunchAccrual: 15,
    overloadAccrual: 8,
    restfulRecovery: 5,
  },
  attrition: {
    burnoutThreshold: 80,
    atRiskBurnout: 60,
    warningLeadSprints: 1,
    fastBurnoutJump: 23,
  },
};

/**
 * A scoped override of the candidate constants, or `null` when the base values are in
 * force. This is the one piece of mutable state in the content layer, and it exists for
 * exactly one caller: the tuning harness, which measures the design's mechanical
 * properties under *alternate* parameter sets so a sweep can show how each bar responds.
 *
 * The locked tick contract takes `(state, actions)` and nothing else, so tuning cannot
 * be threaded in as a parameter — `getTuning()` is the only seam the engine reads
 * through. `withTuning` sets this cell for the duration of a single synchronous call and
 * restores it in a `finally`, so determinism is untouched: outside the scope every read
 * returns the base constants, and inside it every read returns the same pre-merged
 * object. It is a scoped dynamic binding, not ambient global state.
 */
let activeOverride: TuningConstants | null = null;

/** Whether a value is a plain object (a tuning section), not a primitive leaf. */
function isSection(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge a partial override onto a full tuning tree, returning a new tree. Sections
 * recurse so a patch to one field leaves its siblings intact; leaves replace. Pure — it
 * never mutates `base`.
 */
function mergeTuning<T>(base: T, patch: DeepPartial<T>): T {
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(patch as object)) {
    const patchValue = (patch as Record<string, unknown>)[key];
    const baseValue = merged[key];
    if (isSection(baseValue) && isSection(patchValue)) {
      merged[key] = mergeTuning(baseValue, patchValue as DeepPartial<typeof baseValue>);
    } else if (patchValue !== undefined) {
      merged[key] = patchValue;
    }
  }
  return merged as T;
}

/**
 * The tuning constants in force. The scoped override wins when one is active (inside a
 * `withTuning` call); otherwise the base candidate constants. Read-only by contract.
 */
export function getTuning(): TuningConstants {
  return activeOverride ?? TUNING;
}

/**
 * Run `body` with `override` deep-merged onto the constants currently in force, then
 * restore. `body` MUST be synchronous — the whole engine is, and the scope is torn down
 * the instant `body` returns, so an override never leaks into a later tick. Calls nest:
 * an inner `withTuning` layers onto the outer one and unwinds cleanly. Returns whatever
 * `body` returns, so a caller can simulate a full run under alternate parameters in one
 * expression.
 */
export function withTuning<T>(override: TuningOverride, body: () => T): T {
  const previous = activeOverride;
  activeOverride = mergeTuning(previous ?? TUNING, override);
  try {
    return body();
  } finally {
    activeOverride = previous;
  }
}
