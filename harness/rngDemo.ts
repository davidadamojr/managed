/**
 * The original prompt-01 determinism smoke: prove the seeded RNG produces a
 * reproducible stream with no UI. Superseded as the harness entry point by the tuning
 * report (see `index.ts`), but kept here as a tiny, self-contained determinism check —
 * still runnable via `npm run harness -- rng [seed] [draws]`.
 *
 * The draw loop is factored into `generateSequence` (pure, exported) so it can be
 * asserted directly in tests; `printRngDemo` is only the print wrapper.
 */
import { createRng, nextFloat } from '../src/engine/rng';

export const DEFAULT_SEED = 12345;
export const DEFAULT_DRAWS = 10;

export function generateSequence(seed: number, count: number): number[] {
  let state = createRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const { value, next } = nextFloat(state);
    out.push(value);
    state = next;
  }
  return out;
}

export function printRngDemo(
  seed: number = DEFAULT_SEED,
  count: number = DEFAULT_DRAWS,
  log: (line: string) => void = console.log,
): void {
  log('Managed — headless RNG harness');
  log(`seed=${seed} draws=${count}`);
  generateSequence(seed, count).forEach((value, i) => {
    log(`  [${i}] ${value}`);
  });
}
