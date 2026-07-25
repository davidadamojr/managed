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
  };
  readonly roadmap: {
    /** Number of roadmap tickets — the soft, never-fail target. */
    readonly size: number;
  };
  readonly crunch: {
    /** Throughput multiplier when an engineer crunches this sprint. */
    readonly throughputMultiplier: number;
  };
  readonly morale: {
    /** Throughput multiplier at morale 0 and at morale 100 (linear between). */
    readonly throughputAtZero: number;
    readonly throughputAtHundred: number;
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
  },
  roadmap: {
    size: 5,
  },
  crunch: {
    throughputMultiplier: 1.4,
  },
  morale: {
    throughputAtZero: 0.7,
    throughputAtHundred: 1.15,
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
