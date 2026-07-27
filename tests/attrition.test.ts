import { describe, it, expect } from 'vitest';
import {
  evaluateAttrition,
  isAtRisk,
  atRiskWarning,
  tick,
  newRun,
  emptyActions,
  assign,
  setCrunch,
  createRng,
  nextFloat,
  shouldFireEvent,
  type Engineer,
  type GameState,
  type RngState,
  type SkillProficiencies,
} from '../src/engine';
import { listAtRiskWarnings, getTuning, listSkills } from '../src/content';

// Attrition is the fail state and, more importantly, the fairness guarantee that makes
// it land: no one quits without the player first being shown a fuzzy at-risk read.
// These tests work at two levels. The unit level exercises `evaluateAttrition` directly
// — the decision function that owns the at-risk state machine, the quit gate, and the
// bounded fast-burnout exception. The integration level scripts the canonical run
// through `tick` and asserts the warning precedes the loss, the summary still renders,
// and the run ends. The whole point is that a loss is never a surprise.

const t = getTuning();

// ---- fixtures -------------------------------------------------------------

function flatSkills(value = 50): SkillProficiencies {
  const map = {} as Record<string, number>;
  for (const s of listSkills()) map[s] = value;
  return map as SkillProficiencies;
}

/** An engineer at a chosen burnout, with optional prior warnings and this-sprint crunch. */
function person(
  burnout: number,
  opts: {
    id?: string;
    name?: string;
    priorWarnings?: number;
    priorCrunchSprints?: number;
    crunch?: boolean;
  } = {},
): Engineer {
  const flags: { atRiskSprints?: number; crunchSprints?: number } = {};
  if (opts.priorWarnings) flags.atRiskSprints = opts.priorWarnings;
  if (opts.priorCrunchSprints) flags.crunchSprints = opts.priorCrunchSprints;
  const base: Engineer = {
    id: opts.id ?? 'e',
    name: opts.name ?? 'Priya',
    flavor: 'vibe',
    skills: flatSkills(),
    morale: 50,
    burnout,
    assignment: opts.crunch ? { ticketIds: ['k'], crunch: true } : null,
  };
  return Object.keys(flags).length > 0 ? { ...base, flags } : base;
}

/**
 * Evaluate one attrition step. `priorBurnout` is what the engineer carried into the
 * sprint (in `state.roster`, used to measure the one-sprint jump); the `post` engineer
 * carries the freshly-updated burnout, prior warnings, and this sprint's crunch.
 */
function evaluate(
  post: Engineer,
  priorBurnout: number,
  over: Partial<GameState> = {},
) {
  const pre: Engineer = { ...post, burnout: priorBurnout, flags: undefined };
  const state: GameState = { ...newRun(1), roster: [pre], sprintIndex: 0, ...over };
  return evaluateAttrition([post], state);
}

/** The at-risk flag left on the (single) returned engineer, or 0 if none. */
function atRiskSprintsOf(outcome: { roster: readonly Engineer[] }): number {
  return outcome.roster[0]!.flags?.atRiskSprints ?? 0;
}

// ---- the at-risk state machine -------------------------------------------

describe('evaluateAttrition — the at-risk state', () => {
  it('flags an engineer who enters the at-risk band, without quitting them', () => {
    // Burnout climbs into [atRiskBurnout, threshold): at-risk, but not yet eligible.
    const outcome = evaluate(person(70), 55);
    expect(outcome.status).toBe('active');
    expect(outcome.departure).toBeUndefined();
    expect(atRiskSprintsOf(outcome)).toBe(1);
  });

  it('accumulates consecutive at-risk sprints', () => {
    const outcome = evaluate(person(70, { priorWarnings: 1 }), 65);
    expect(atRiskSprintsOf(outcome)).toBe(2);
  });

  it('clears the at-risk flag once burnout falls back out of the band', () => {
    const outcome = evaluate(person(40, { priorWarnings: 2 }), 55);
    expect(atRiskSprintsOf(outcome)).toBe(0);
    expect(outcome.roster[0]!.flags?.atRiskSprints).toBeUndefined();
  });

  it('leaves a calm engineer carrying no bookkeeping at all', () => {
    const outcome = evaluate(person(30), 35);
    expect(outcome.roster[0]!.flags).toBeUndefined();
  });

  it('exposes the at-risk band boundary through isAtRisk', () => {
    expect(isAtRisk(t.attrition.atRiskBurnout)).toBe(true);
    expect(isAtRisk(t.attrition.atRiskBurnout - 1)).toBe(false);
    expect(isAtRisk(t.attrition.burnoutThreshold)).toBe(true);
  });
});

// ---- the fairness guarantee: a warning must precede a quit ----------------

describe('evaluateAttrition — the fairness gate', () => {
  it('quits an eligible engineer who was warned a prior sprint', () => {
    const outcome = evaluate(person(85, { priorWarnings: 1 }), 70);
    expect(outcome.status).toBe('failed');
    expect(outcome.departure).toBeDefined();
    expect(outcome.departure!.fastBurnout).toBe(false);
    expect(outcome.departure!.warningsShown).toBe(1);
  });

  it('does NOT quit an eligible engineer with no recorded warning and an ordinary jump', () => {
    // Eligibility alone is never enough — the gate requires a warning the player was
    // actually shown. Absent one (and absent a drastic spike), the quit is withheld and
    // the warning is surfaced this sprint instead, to be honored next sprint.
    const outcome = evaluate(person(85), 70); // jump 15, below the fast bound
    expect(outcome.status).toBe('active');
    expect(outcome.departure).toBeUndefined();
    expect(atRiskSprintsOf(outcome)).toBe(1);
  });

  it('cannot even reach eligibility from below the band on an ordinary jump — it only warns', () => {
    // The band is wider than a lone crunch, so a crunch-only climb from below it lands
    // in the at-risk band (warned), never straight past the threshold. This is the
    // structural reason the normal-regime guarantee holds.
    const jump = t.burnout.crunchAccrual;
    const pre = t.attrition.atRiskBurnout - 1; // just below the band
    const outcome = evaluate(person(pre + jump), pre);
    expect(pre + jump).toBeLessThan(t.attrition.burnoutThreshold); // never eligible
    expect(outcome.status).toBe('active');
    expect(atRiskSprintsOf(outcome)).toBe(1);
  });
});

// ---- the bounded fast-burnout exception ----------------------------------

describe('evaluateAttrition — the fast-burnout exception (bounded)', () => {
  it('quits on a band-skipping spike, with the warning coincident (no prior warning owed)', () => {
    // A jump at the fast bound clears the whole band in one sprint. The spike is
    // drastic enough that the warning may coincide with the loss rather than precede it.
    const pre = t.attrition.atRiskBurnout - 1;
    const post = pre + t.attrition.fastBurnoutJump;
    expect(post).toBeGreaterThanOrEqual(t.attrition.burnoutThreshold); // eligible
    const outcome = evaluate(person(post), pre);
    expect(outcome.status).toBe('failed');
    expect(outcome.departure!.fastBurnout).toBe(true);
    expect(outcome.departure!.warningsShown).toBe(0);
  });

  it('does not fire on a jump below the fast bound — the exception stays narrow', () => {
    // One below the bound, an eligible-but-unwarned engineer is still withheld: the
    // exception does not swallow the general guarantee.
    const jump = t.attrition.fastBurnoutJump - 1;
    const pre = t.attrition.burnoutThreshold - jump; // lands exactly at the threshold
    const outcome = evaluate(person(pre + jump), pre);
    expect(outcome.status).toBe('active');
    expect(outcome.departure).toBeUndefined();
  });
});

// ---- the why-trace + bookkeeping -----------------------------------------

describe('evaluateAttrition — the departure trace', () => {
  it('records who left, when, the warnings ignored, and the crunch behind it', () => {
    const post = person(85, {
      id: 'p1',
      name: 'Priya',
      priorWarnings: 2,
      priorCrunchSprints: 3,
      crunch: true,
    });
    const outcome = evaluate(post, 70, { sprintIndex: 4 });
    expect(outcome.departure).toEqual({
      engineerId: 'p1',
      engineerName: 'Priya',
      sprintIndex: 4,
      warningsShown: 2,
      crunchSprints: 4, // 3 prior + this crunch sprint
      fastBurnout: false,
    });
  });

  it('tallies crunch sprints only when the engineer actually crunched', () => {
    const crunched = evaluate(person(30, { priorCrunchSprints: 2, crunch: true }), 30);
    expect(crunched.roster[0]!.flags?.crunchSprints).toBe(3);
    const rested = evaluate(person(30, { priorCrunchSprints: 2, crunch: false }), 30);
    expect(rested.roster[0]!.flags?.crunchSprints).toBe(2);
  });
});

// ---- determinism + inertness ---------------------------------------------

describe('evaluateAttrition — determinism and guards', () => {
  it('is a pure function of its inputs — evaluated twice, identical', () => {
    const post = person(85, { priorWarnings: 1, crunch: true });
    expect(evaluate(post, 70)).toEqual(evaluate(post, 70));
  });

  it('does nothing on a run that is not active', () => {
    const post = person(90, { priorWarnings: 3 });
    const pre: Engineer = { ...post, burnout: 70, flags: undefined };
    const state: GameState = { ...newRun(1), roster: [pre], status: 'completed' };
    const outcome = evaluateAttrition([post], state);
    expect(outcome.status).toBe('completed');
    expect(outcome.departure).toBeUndefined();
    // The roster passes straight through — no quit, no bookkeeping rewrite, even though
    // this engineer is eligible and warned. A finished run is not re-evaluated.
    expect(outcome.roster[0]).toBe(post);
    expect(outcome.roster[0]!.flags?.atRiskSprints).toBe(3);
  });

  it('quits only the first eligible engineer in roster order — one loss ends the run', () => {
    const a = person(85, { id: 'a', name: 'Ada', priorWarnings: 1 });
    const b = person(90, { id: 'b', name: 'Ben', priorWarnings: 1 });
    const preA: Engineer = { ...a, burnout: 70, flags: undefined };
    const preB: Engineer = { ...b, burnout: 70, flags: undefined };
    const state: GameState = { ...newRun(1), roster: [preA, preB] };
    const outcome = evaluateAttrition([a, b], state);
    expect(outcome.status).toBe('failed');
    expect(outcome.departure!.engineerId).toBe('a');
  });
});

// ---- warning phrasing: content-sourced, deterministic, human -------------

describe('atRiskWarning — the fuzzy read phrasing', () => {
  it('draws the phrasing from the content pool', () => {
    const pool = listAtRiskWarnings();
    expect(pool).toContain(atRiskWarning('anyone'));
  });

  it('is deterministic — the same engineer always reads the same way', () => {
    expect(atRiskWarning('priya-01')).toBe(atRiskWarning('priya-01'));
  });
});

// ---- integration: the canonical crunch -> warning -> quit run ------------

/** The RNG state at a chosen cursor for a small positive seed. */
function at(seed: number, cursor: number): RngState {
  return { seed: createRng(seed).seed, cursor };
}

/** A starting cursor whose next `sprints` event-gate draws are all quiet. */
function quietRunRng(seed: number, sprints: number): RngState {
  outer: for (let cursor = 0; cursor < 200_000; cursor += 1) {
    for (let i = 0; i < sprints; i += 1) {
      if (shouldFireEvent(nextFloat(at(seed, cursor + i)).value)) continue outer;
    }
    return at(seed, cursor);
  }
  throw new Error('no quiet run cursor found');
}

describe('tick — the delayed echo lands, foreseeably (canonical scenario)', () => {
  // One engineer, one unfinishable ticket, crunch every sprint, no events: burnout
  // climbs a clean +crunchAccrual each sprint from a fresh start. With the candidate
  // tuning this crosses into at-risk mid-run and into a quit a sprint later — the whole
  // delayed echo, with the warning strictly preceding the loss.
  function crunchRun(): GameState {
    const eng: Engineer = {
      id: 'e',
      name: 'Priya',
      flavor: 'vibe',
      skills: flatSkills(0),
      morale: t.roster.startingMorale,
      burnout: t.roster.startingBurnout,
      assignment: null,
    };
    return {
      ...newRun(1),
      roster: [{ ...eng, skills: { ...eng.skills, backend: 100 } }],
      backlog: [{ id: 'k', size: 1000, requiredSkill: 'backend', progress: 0, status: 'open' }],
      roadmap: { ticketIds: [] },
      sprintIndex: 0,
      runLength: 6,
      rngState: quietRunRng(1, 6),
    };
  }

  // The plan is the same every sprint: the one engineer crunches the one ticket.
  const crunchPlan = setCrunch(assign(emptyActions(), 'e', 'k'), true);

  it('shows an at-risk warning at least one sprint before the quit, then ends the run', () => {
    let state = crunchRun();
    const warnedBeforeQuit: boolean[] = [];
    let quitState: GameState | undefined;

    for (let i = 0; i < 6 && state.status === 'active'; i += 1) {
      const before = state;
      const { state: next } = tick(state, crunchPlan);
      if (next.status === 'failed') {
        // The engineer must have been flagged at-risk on the state going INTO the
        // quitting tick — the warning was on the board before the loss.
        expect((before.roster[0]!.flags?.atRiskSprints ?? 0)).toBeGreaterThanOrEqual(
          t.attrition.warningLeadSprints,
        );
        quitState = next;
        break;
      }
      warnedBeforeQuit.push((next.roster[0]!.flags?.atRiskSprints ?? 0) > 0);
      state = next;
    }

    expect(quitState).toBeDefined();
    // At least one sprint surfaced the at-risk read before the quit fired.
    expect(warnedBeforeQuit.filter(Boolean).length).toBeGreaterThanOrEqual(1);
  });

  it('records a foreseeable departure trace and stops advancing on the quit', () => {
    let state = crunchRun();
    let quitState: GameState | undefined;
    let sprintsRun = 0;
    while (state.status === 'active' && sprintsRun < 6) {
      const { state: next } = tick(state, crunchPlan);
      sprintsRun += 1;
      if (next.status === 'failed') {
        quitState = next;
        break;
      }
      state = next;
    }

    expect(quitState!.status).toBe('failed');
    const d = quitState!.departure!;
    expect(d.engineerId).toBe('e');
    expect(d.fastBurnout).toBe(false); // ordinary crunch takes the fully-warned path
    expect(d.warningsShown).toBeGreaterThanOrEqual(t.attrition.warningLeadSprints);
    expect(d.crunchSprints).toBe(sprintsRun); // crunched every sprint up to the loss
    // The run failed mid-length, before it could complete — the crunch cost the run.
    expect(quitState!.sprintIndex).toBeLessThan(quitState!.runLength);
  });

  it('still renders the summary on the quitting sprint', () => {
    let state = crunchRun();
    let quitSummary;
    while (state.status === 'active') {
      const { state: next, summary } = tick(state, crunchPlan);
      if (next.status === 'failed') {
        quitSummary = summary;
        break;
      }
      state = next;
    }
    expect(quitSummary).toBeDefined();
    expect(quitSummary!.roadmap).toBeDefined();
  });

  it('is fully deterministic — the same seeded run reproduces the same quit sprint', () => {
    function runToQuit(): number {
      let state = crunchRun();
      let sprint = 0;
      while (state.status === 'active') {
        const { state: next } = tick(state, crunchPlan);
        if (next.status === 'failed') return next.sprintIndex;
        state = next;
        sprint += 1;
      }
      return sprint;
    }
    expect(runToQuit()).toBe(runToQuit());
  });
});
