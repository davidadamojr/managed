/**
 * The single source of every game parameter.
 *
 * IMPORTANT: nothing in the engine may hardcode any of these numbers — the
 * engine reads them from here so the whole game can be retuned by editing this
 * one file, with no logic change. The tuning harness reads these to measure the
 * design's mechanical properties, and the tuning pass rewrites them.
 *
 * Every value below is a CANDIDATE starting point, not a settled truth. They are
 * best-estimates meant to be re-checked against play and revised. The
 * accompanying tests encode the design *intent* behind them (attention stays
 * scarce, the backlog stays over capacity, crunch debt outruns recovery) so a
 * retune that breaks the intent fails loudly.
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
    /** Backlog size as a multiple of what the team can plausibly clear (>1). */
    readonly overCapacityRatio: number;
    /** Effort-point band [min, max] for a generated ticket. */
    readonly ticketSizeMin: number;
    readonly ticketSizeMax: number;
  };
  readonly roadmap: {
    /** Number of roadmap tickets — the soft, never-fail target. */
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
  readonly morale: {
    /** Throughput multiplier at morale 0 and at morale 100 (linear between). */
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
    /** Sprints of fuzzy at-risk warning owed before an eligible quit. */
    readonly warningLeadSprints: number;
  };
}

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
    size: 5,
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
  morale: {
    throughputAtZero: 0.7,
    throughputAtHundred: 1.15,
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
    warningLeadSprints: 1,
  },
};

/** The tuning constants. Read-only by contract. */
export function getTuning(): TuningConstants {
  return TUNING;
}
