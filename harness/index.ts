/**
 * Headless harness stub: proves the engine runs and produces a deterministic
 * stream with no UI whatsoever. Run with `npm run harness`, optionally passing a
 * seed and draw count: `npm run harness -- 12345 10`.
 *
 * The draw loop is factored into `generateSequence` (pure, exported) so it can be
 * asserted directly in tests; `main` is only the print wrapper.
 */
import { pathToFileURL } from 'node:url';
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

export function main(
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

// Run only when executed directly, not when imported by a test.
const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const seedArg = process.argv[2];
  const countArg = process.argv[3];
  const seed = seedArg === undefined ? DEFAULT_SEED : Number(seedArg);
  const count = countArg === undefined ? DEFAULT_DRAWS : Number(countArg);
  main(seed, count);
}
