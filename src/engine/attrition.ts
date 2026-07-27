/**
 * Attrition — the fail state, and the fairness guarantee that makes it land.
 *
 * The sprint tick calls `evaluateAttrition` at one fixed point, immediately after
 * burnout is updated, so a quit is judged on the freshest state. This is the single
 * most important coupling in the game: crunch, sprints ago, returns here as a burnout
 * that has crossed a line, and the run ends. A loss only *means* something if it was
 * foreseeable, so the whole module is built around one non-negotiable rule.
 *
 * The fairness guarantee. No engineer may quit without the player first being shown a
 * fuzzy at-risk read. That read is not cosmetic — it is a state the engineer must
 * enter and hold for a lead time before a quit is allowed. The guarantee is made
 * airtight by how the tuning band is shaped, not by hope:
 *
 *   - The at-risk band [atRiskBurnout, burnoutThreshold) is wider than a single
 *     crunch's accrual, so an ordinary crunch climb cannot step over it into
 *     eligibility — it must land in the band, and be warned, at least one sprint first.
 *   - The one jump large enough to clear the band in a single sprint is also large
 *     enough to trip the fast-burnout exception, which shows the warning in the same
 *     summary as the loss. So a band-skipping spike is warned *coincidentally* rather
 *     than not at all.
 *
 * Between them, every path to a quit carries a warning that precedes it or coincides
 * with it. The exception is deliberately narrow — only the largest possible sprint
 * spike trips it — so it never becomes the rule.
 *
 * Purity holds: the input roster is never mutated, no clock or RNG is touched (the
 * at-risk phrasing is chosen by a stable hash, not a draw, so it stays out of the
 * event stream and reproduces exactly on resume), and the run's status only ever
 * moves from active to failed here.
 */

import { getTuning, listAtRiskWarnings } from '../content';
import type { Engineer } from './entities';
import type { DepartureTrace, GameState, RunStatus } from './state';

/**
 * The outcome of an attrition check: the roster to carry forward (with at-risk and
 * crunch bookkeeping refreshed), the run's resulting status (`failed` when a quit
 * fires, otherwise unchanged), and — only when a quit fires — the departure trace.
 */
export interface AttritionOutcome {
  readonly roster: readonly Engineer[];
  readonly status: RunStatus;
  readonly departure?: DepartureTrace;
}

/** Whether a burnout level reads as at-risk — inside or above the warning band. */
export function isAtRisk(burnout: number): boolean {
  return burnout >= getTuning().attrition.atRiskBurnout;
}

/**
 * A stable string hash (FNV-ish, kept in 32-bit space with `Math.imul` so it ports
 * cleanly and never loses precision). Deterministic and RNG-free: the same id always
 * maps to the same phrasing, giving each engineer a consistent voice when they read
 * as checked out, and reproducing exactly across a save.
 */
function hashId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * The at-risk warning phrasing for one engineer — a human observation drawn from the
 * content pool by a stable hash of the id. Selection is deterministic and carries no
 * raw number, so the read the summary shows stays fuzzy. The summary derivation reads
 * this to fill an engineer's note; attrition itself only decides *whether* someone is
 * at risk, not how the read is worded.
 */
export function atRiskWarning(engineerId: string): string {
  const pool = listAtRiskWarnings();
  return pool[hashId(engineerId) % pool.length]!;
}

/** Refreshed per-engineer bookkeeping: the two flags this sprint leaves behind. */
interface Bookkeeping {
  readonly atRiskSprints: number;
  readonly crunchSprints: number;
}

/**
 * Compute an engineer's post-sprint flags. `atRiskSprints` counts consecutive at-risk
 * sprints (including this one) and resets the moment burnout leaves the band, so it is
 * exactly "how many sprints of warning the player has now been shown." `crunchSprints`
 * only ever grows, tallying the crunch that drove the burnout for the post-mortem.
 */
function refreshBookkeeping(engineer: Engineer): Bookkeeping {
  const priorAtRisk = engineer.flags?.atRiskSprints ?? 0;
  const priorCrunch = engineer.flags?.crunchSprints ?? 0;
  const crunchedThisSprint = engineer.assignment?.crunch === true;
  return {
    atRiskSprints: isAtRisk(engineer.burnout) ? priorAtRisk + 1 : 0,
    crunchSprints: crunchedThisSprint ? priorCrunch + 1 : priorCrunch,
  };
}

/**
 * Rebuild an engineer with refreshed flags, omitting either flag while it is zero so a
 * never-at-risk, never-crunched engineer carries no bookkeeping. When the refreshed
 * flags are empty but the engineer still holds stale ones (an at-risk streak that just
 * ended), the flags are cleared to `undefined` — which drops out on serialization —
 * rather than left to linger. An engineer with no flags before or after is returned by
 * identity, keeping the roster stable for equality checks.
 */
function withBookkeeping(engineer: Engineer, book: Bookkeeping): Engineer {
  const flags: { atRiskSprints?: number; crunchSprints?: number } = {};
  if (book.atRiskSprints > 0) flags.atRiskSprints = book.atRiskSprints;
  if (book.crunchSprints > 0) flags.crunchSprints = book.crunchSprints;
  if (Object.keys(flags).length > 0) return { ...engineer, flags };
  return engineer.flags === undefined ? engineer : { ...engineer, flags: undefined };
}

/**
 * Whether this engineer quits this sprint. A quit requires eligibility (burnout at or
 * past the threshold) plus a satisfied warning: either the lead time of prior at-risk
 * sprints was met, or the fast-burnout exception applies because this one sprint's
 * jump was drastic enough to warrant a coincident-only warning.
 */
function quitDecision(
  engineer: Engineer,
  priorAtRiskSprints: number,
  burnoutJump: number,
): { quits: boolean; fastBurnout: boolean } {
  const { burnoutThreshold, warningLeadSprints, fastBurnoutJump } =
    getTuning().attrition;
  const eligible = engineer.burnout >= burnoutThreshold;
  const warned = priorAtRiskSprints >= warningLeadSprints;
  const fastBurnout = burnoutJump >= fastBurnoutJump;
  return { quits: eligible && (warned || fastBurnout), fastBurnout };
}

/**
 * Evaluate attrition against the post-burnout-update roster. `roster` is authoritative
 * for the fresh burnout; `state` supplies the pre-update roster (to measure each
 * engineer's one-sprint jump), the sprint index, and the run context.
 *
 * Every engineer's flags are refreshed first, so the at-risk read is surfaced this
 * sprint regardless of whether anyone quits. Then the first engineer (in roster order,
 * for determinism) who satisfies the quit decision ends the run: status goes to
 * `failed` and a departure trace is recorded. Inc-1 loses the run on a single quit, so
 * later quitters this same sprint do not need separate handling — one loss is enough.
 * The quitter stays in the roster; nothing removes them, because the run is over and
 * the post-mortem still wants the whole team, the departed included.
 */
export function evaluateAttrition(
  roster: readonly Engineer[],
  state: GameState,
): AttritionOutcome {
  if (state.status !== 'active') return { roster, status: state.status };

  const priorBurnoutById = new Map(
    state.roster.map((engineer) => [engineer.id, engineer.burnout]),
  );

  let departure: DepartureTrace | undefined;
  const nextRoster = roster.map((engineer) => {
    const book = refreshBookkeeping(engineer);
    const priorAtRiskSprints = engineer.flags?.atRiskSprints ?? 0;
    const burnoutJump =
      engineer.burnout - (priorBurnoutById.get(engineer.id) ?? engineer.burnout);
    const { quits, fastBurnout } = quitDecision(
      engineer,
      priorAtRiskSprints,
      burnoutJump,
    );
    if (quits && departure === undefined) {
      departure = {
        engineerId: engineer.id,
        engineerName: engineer.name,
        sprintIndex: state.sprintIndex,
        // The warnings the player was shown in prior summaries and could act on —
        // not this sprint's coincident read, which arrives with the loss itself.
        warningsShown: priorAtRiskSprints,
        crunchSprints: book.crunchSprints,
        fastBurnout,
      };
    }
    return withBookkeeping(engineer, book);
  });

  const status: RunStatus = departure ? 'failed' : state.status;
  return departure
    ? { roster: nextRoster, status, departure }
    : { roster: nextRoster, status };
}
