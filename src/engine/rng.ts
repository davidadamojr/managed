/**
 * Seeded, deterministic RNG — the determinism spine of the whole engine.
 *
 * Why the state is a plain `{ seed, cursor }` value rather than a class:
 * it must round-trip through JSON so a saved game resumes the exact same stream,
 * and every draw must be a pure function (state in ⇒ `{ value, next }` out) so
 * identical inputs always reproduce identical results — no globals, no mutation.
 *
 * Why counter-based mulberry32: classic mulberry32 threads one evolving 32-bit
 * integer, which does not map onto a serializable `{ seed, cursor }`. Deriving that
 * integer from the cursor (`seed + (cursor + 1) * STEP`) reproduces exactly the
 * mulberry32(seed) sequence indexed by position, while keeping the state plain and
 * jumpable. All math is kept in 32-bit space (`Math.imul`, `>>> 0`) so it stays
 * exact and ports cleanly to other languages later.
 */

export interface RngState {
  /** Fixed for the run's lifetime — this is what makes a run reproducible. */
  readonly seed: number;
  /** Stream position; advances by 1 per draw. */
  readonly cursor: number;
}

/** A drawn value plus the advanced state; the input state is left untouched. */
export interface Draw<T> {
  readonly value: T;
  readonly next: RngState;
}

const STEP = 0x6d2b79f5;
const UINT32_RANGE = 0x1_0000_0000;

export function createRng(seed: number): RngState {
  // Coerce to uint32 so the seed serializes and behaves identically on resume.
  return { seed: seed >>> 0, cursor: 0 };
}

function scramble(a: number): number {
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

function internalState(state: RngState): number {
  // Math.imul keeps the multiply in 32-bit space, so large cursors never lose precision.
  return (state.seed + Math.imul(state.cursor + 1, STEP)) >>> 0;
}

function advance(state: RngState): RngState {
  return { seed: state.seed, cursor: state.cursor + 1 };
}

/** Draw a uint32 in [0, 2^32). */
export function nextUint32(state: RngState): Draw<number> {
  return { value: scramble(internalState(state)), next: advance(state) };
}

/** Draw a float in [0, 1). */
export function nextFloat(state: RngState): Draw<number> {
  const { value, next } = nextUint32(state);
  return { value: value / UINT32_RANGE, next };
}

/** Draw an integer in [minInclusive, maxExclusive). */
export function nextInt(
  state: RngState,
  minInclusive: number,
  maxExclusive: number,
): Draw<number> {
  if (!(maxExclusive > minInclusive)) {
    throw new RangeError(
      `nextInt requires maxExclusive > minInclusive (got ${minInclusive}, ${maxExclusive})`,
    );
  }
  const span = maxExclusive - minInclusive;
  const { value, next } = nextFloat(state);
  return { value: minInclusive + Math.floor(value * span), next };
}
