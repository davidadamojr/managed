/**
 * The harness CLI — the `npm run harness` entry point. It drives the same pure engine
 * the game does, headlessly, and prints one of:
 *   - the mechanical tuning report (default), on the candidate parameters;
 *   - a parameter sweep, showing how the four bars respond as one constant changes;
 *   - the original RNG determinism smoke.
 *
 * The command logic lives in `runCli(args, log)` so it takes an explicit log sink and is
 * testable without spawning a process. The bottom-of-file guard wires it to the real argv
 * only when this file is executed directly, never when imported by a test.
 *
 * Usage:
 *   npm run harness                         # tuning report on candidate params
 *   npm run harness -- report --seeds 40    # report over 40 seeds
 *   npm run harness -- sweep crunchAccrual  # sweep one parameter across a range
 *   npm run harness -- rng 12345 10         # RNG determinism smoke
 */
import { pathToFileURL } from 'node:url';
import { getTuning, type TuningOverride } from '../src/content';
import { runReport, formatReport, DEFAULT_SEED_COUNT } from './report';
import { sweepParameter, formatSweep } from './sweep';
import { printRngDemo, DEFAULT_SEED, DEFAULT_DRAWS } from './rngDemo';

/** A named, ready-to-run sweep: the values to try and the lens that applies each. */
interface NamedSweep {
  readonly values: readonly number[];
  readonly overrideFor: (value: number) => TuningOverride;
}

/**
 * The parameters the CLI can sweep out of the box, each with a range chosen to straddle
 * the interesting regime (crunch free → punished → premature, attention scarce → ample,
 * and so on). Anything nested is reachable through its lens.
 *
 * The set is deliberately wider than the parameters that actually moved: a sweep showing
 * a bar *not* responding is as much a finding as one showing it swing, and a settled
 * value is only trustworthy if the neighbours it beat are still reachable in one command.
 */
export const SWEEPS: Readonly<Record<string, NamedSweep>> = {
  crunchAccrual: {
    values: [8, 10, 12, 15, 18, 20, 25, 35],
    overrideFor: (v) => ({ burnout: { crunchAccrual: v } }),
  },
  restfulRecovery: {
    values: [3, 5, 8, 10],
    overrideFor: (v) => ({ burnout: { restfulRecovery: v } }),
  },
  atRiskBurnout: {
    values: [50, 55, 60, 65, 70],
    overrideFor: (v) => ({ attrition: { atRiskBurnout: v } }),
  },
  burnoutThreshold: {
    values: [70, 75, 80, 85],
    overrideFor: (v) => ({ attrition: { burnoutThreshold: v } }),
  },
  warningLeadSprints: {
    values: [1, 2, 3],
    overrideFor: (v) => ({ attrition: { warningLeadSprints: v } }),
  },
  poolPerSprint: {
    values: [1, 2, 3, 4, 6],
    overrideFor: (v) => ({ attention: { poolPerSprint: v } }),
  },
  actionCost: {
    values: [1, 2, 3],
    overrideFor: (v) => ({
      attention: { actionCost: { oneOnOne: v, unblock: v, recognize: v } },
    }),
  },
  overCapacityRatio: {
    values: [1.2, 1.5, 2, 3],
    overrideFor: (v) => ({ backlog: { overCapacityRatio: v } }),
  },
  roadmapSize: {
    values: [5, 10, 14, 16, 18, 20, 24],
    overrideFor: (v) => ({ roadmap: { size: v } }),
  },
  baseOutput: {
    values: [3, 4, 5, 6, 7],
    overrideFor: (v) => ({ work: { baseOutput: v } }),
  },
  /**
   * The morale throughput band, swept as its full width with both endpoints moving
   * together. The value is the total spread from morale zero to morale 100, and the
   * endpoints are placed so a team at its *starting* morale always resolves at exactly
   * 1.0 — the pivot is the fresh team, not the midpoint of the scale.
   *
   * Pivoting matters more than it looks. Widen the band around the scale's midpoint and
   * a fresh team's multiplier drifts up with it, so the sweep would be measuring "the
   * team got more productive" while claiming to measure "morale started mattering more".
   * Held at the fresh-team pivot, the only thing changing down the column is how far
   * mood can push output either way.
   */
  moraleBand: {
    // Capped short of the width that would drive the zero-morale end negative: a
    // negative multiplier is not a harsher game, it is a broken one.
    values: [0.2, 0.5, 0.9, 1.3],
    overrideFor: (v) => {
      const fresh = getTuning().roster.startingMorale / 100;
      return {
        morale: {
          throughputAtZero: 1 - fresh * v,
          throughputAtHundred: 1 + (1 - fresh) * v,
        },
      };
    },
  },
  ticketSize: {
    values: [5, 7, 8, 10],
    overrideFor: (v) => ({
      backlog: { ticketSizeMin: Math.round(v * 0.6), ticketSizeMax: Math.round(v * 1.4) },
    }),
  },
  sprints: {
    values: [5, 6],
    overrideFor: (v) => ({ run: { sprints: v } }),
  },
};

/** Read `--flag value` out of an argument list, returning the number or a fallback. */
function numberFlag(args: readonly string[], flag: string, fallback: number): number {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Execute the CLI against an argument list, printing through `log`. Pure but for the log
 * sink: it composes the deterministic report / sweep / RNG functions and formats them.
 */
export function runCli(
  args: readonly string[],
  log: (line: string) => void = console.log,
): void {
  // A leading flag (e.g. `--seeds 4`) means "the default command with options", so only
  // a non-flag first token names a subcommand.
  const first = args[0];
  const named = first !== undefined && !first.startsWith('--');
  const command = named ? first : 'report';
  const rest = named ? args.slice(1) : args;
  const seedCount = numberFlag(rest, '--seeds', DEFAULT_SEED_COUNT);

  if (command === 'rng') {
    const seed = rest[0] === undefined ? DEFAULT_SEED : Number(rest[0]);
    const draws = rest[1] === undefined ? DEFAULT_DRAWS : Number(rest[1]);
    printRngDemo(seed, draws, log);
    return;
  }

  if (command === 'sweep') {
    const name = rest[0];
    const sweep = name ? SWEEPS[name] : undefined;
    if (!sweep) {
      log(`unknown sweep: ${name ?? '(none)'}`);
      log(`available sweeps: ${Object.keys(SWEEPS).join(', ')}`);
      return;
    }
    const result = sweepParameter(name!, sweep.values, sweep.overrideFor, { seedCount });
    formatSweep(result).forEach((line) => log(line));
    return;
  }

  if (command === 'report') {
    formatReport(runReport({ seedCount })).forEach((line) => log(line));
    return;
  }

  log(`unknown command: ${command}`);
  log('usage: harness [report|sweep <param>|rng] [--seeds N]');
}

// Run only when executed directly, not when imported by a test.
const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  runCli(process.argv.slice(2));
}
