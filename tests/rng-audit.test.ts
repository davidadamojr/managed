import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import {
  collectTsFiles,
  findViolations,
  type BannedPattern,
} from './support/scan';

// The determinism audit. Identical state plus identical actions must always produce an
// identical result — that is what makes a save resume exactly, a bug reproduce from a
// seed, and the tuning harness's numbers mean anything. Every one of those rests on the
// simulation reading nothing from outside itself.
//
// The seeded RNG is the sanctioned source of variation and it lives inside the state.
// Anything else that differs between two executions of the same code — a clock, an
// unseeded random, an environment variable, the host's collation order — is ambient
// nondeterminism, and one call is enough to poison reproducibility. Types cannot catch
// that, and a unit test only catches it on the path it happens to walk, so it is caught
// here instead: by reading the source of every file on the simulation path.
//
// Scope is the simulation path — the engine, the data it reads, and the harness that
// drives it headlessly. The view is deliberately outside it: the engine/view wall means
// nothing the renderer does can change a tick, and a presentation layer may one day
// have honest reasons to format a date. The one thing the view must not do is invent a
// run's seed from the clock, and that is asserted on its own below.

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** The three roots that make up the simulation path. */
const AUDITED_DIRS: ReadonlyArray<{ label: string; dir: string }> = [
  { label: 'src/engine', dir: join(root, 'src', 'engine') },
  { label: 'src/content', dir: join(root, 'src', 'content') },
  { label: 'harness', dir: join(root, 'harness') },
];

/**
 * Every way a value can enter the simulation from outside the seeded stream. Each entry
 * carries the reason it is banned so a failure explains itself without a lookup.
 */
export const AMBIENT_NONDETERMINISM: readonly BannedPattern[] = [
  { pattern: /\bMath\.random\b/, reason: 'unseeded randomness — draw from the RNG in GameState' },
  { pattern: /\bDate\.now\b/, reason: 'wall-clock read' },
  { pattern: /\bnew Date\b/, reason: 'wall-clock read' },
  { pattern: /\bperformance\.now\b/, reason: 'wall-clock read' },
  { pattern: /\bprocess\.hrtime\b/, reason: 'wall-clock read' },
  { pattern: /\bprocess\.env\b/, reason: 'ambient configuration — a result must not depend on the environment' },
  { pattern: /\bcrypto\b/, reason: 'unseeded randomness' },
  { pattern: /\brandomUUID\b/, reason: 'unseeded randomness' },
  { pattern: /\bgetRandomValues\b/, reason: 'unseeded randomness' },
  { pattern: /\blocaleCompare\b/, reason: "host collation — ordering must not depend on the machine's locale" },
  { pattern: /\btoLocale[A-Z]\w*\b/, reason: "host locale — output must not depend on the machine's locale" },
  { pattern: /\bIntl\./, reason: 'host locale — formatting must not depend on the machine' },
  { pattern: /\bsetTimeout\b/, reason: 'time-dependent scheduling — the tick is synchronous' },
  { pattern: /\bsetInterval\b/, reason: 'time-dependent scheduling — the tick is synchronous' },
];

describe('the simulation path reads nothing ambient', () => {
  const files = AUDITED_DIRS.flatMap(({ label, dir }) =>
    collectTsFiles(dir).map((file) => ({ label, file })),
  );

  it('scans every root, and finds source in each', () => {
    for (const { label, dir } of AUDITED_DIRS) {
      expect(collectTsFiles(dir).length, `no files found under ${label}`).toBeGreaterThan(0);
    }
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map(({ file }) => file))('%s draws only from the seeded stream', (file) => {
    const violations = findViolations(readFileSync(file, 'utf8'), AMBIENT_NONDETERMINISM);
    expect(
      violations,
      `${relative(root, file)} introduces ambient nondeterminism: ${violations.join(', ')}`,
    ).toEqual([]);
  });

  it("does not invent a run's seed from the clock at the view's composition root", () => {
    const main = readFileSync(join(root, 'src', 'view', 'main.ts'), 'utf8');
    // A seeded run is only reproducible if the seed itself is reproducible. The view
    // may render however it likes; it may not make up a seed the player cannot return to.
    expect(findViolations(main, AMBIENT_NONDETERMINISM)).toEqual([]);
  });
});

// A guard nobody has watched fail is a guard nobody knows works. These exercise the
// detector against sources written to break it, so the audit above is known to have
// teeth rather than merely to be green.
describe('the audit has teeth', () => {
  it.each(AMBIENT_NONDETERMINISM.map((banned) => [String(banned.pattern), banned] as const))(
    'catches %s in code',
    (_label, banned) => {
      const offending = `const value = ${sampleUse(banned.pattern)};`;
      expect(findViolations(offending, AMBIENT_NONDETERMINISM)).not.toEqual([]);
    },
  );

  it('catches a deliberately-inserted Math.random in an otherwise ordinary file', () => {
    const source = [
      'export function drawTargetIndex(roster) {',
      '  return Math.floor(Math.random() * roster.length);',
      '}',
    ].join('\n');
    const violations = findViolations(source, AMBIENT_NONDETERMINISM);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('unseeded randomness');
  });

  it('reports every distinct offender in one file, not just the first', () => {
    const source = 'const a = Date.now(); const b = Math.random();';
    expect(findViolations(source, AMBIENT_NONDETERMINISM)).toHaveLength(2);
  });

  it('passes clean simulation code, including the seeded RNG and Math it does use', () => {
    const source = [
      "import { nextInt } from './rng';",
      'export function pick(rng, size) {',
      '  const drawn = nextInt(rng, 0, size);',
      '  return { value: Math.floor(drawn.value), next: drawn.next };',
      '}',
      'const scrambled = Math.imul(seed, 0x6d2b79f5) >>> 0;',
    ].join('\n');
    expect(findViolations(source, AMBIENT_NONDETERMINISM)).toEqual([]);
  });

  it('judges code, not prose: an offender named in a comment is not a violation', () => {
    const documented = '// never call Math.random() here — use the seeded RNG\nconst x = 1;';
    expect(findViolations(documented, AMBIENT_NONDETERMINISM)).toEqual([]);

    const smuggled = 'const x = 1; // ordinary comment\nconst y = Math.random();';
    expect(findViolations(smuggled, AMBIENT_NONDETERMINISM)).not.toEqual([]);
  });

  it('does not let a URL in a string hide the code after it', () => {
    const source = "const docs = 'https://example.com/rng'; const t = Date.now();";
    expect(findViolations(source, AMBIENT_NONDETERMINISM)).not.toEqual([]);
  });

  it('leaves the CLI free to read argv, which is input rather than ambience', () => {
    expect(findViolations('const args = process.argv.slice(2);', AMBIENT_NONDETERMINISM)).toEqual([]);
  });
});

/** A minimal expression that genuinely uses the banned API the pattern describes. */
function sampleUse(pattern: RegExp): string {
  const source = pattern.source;
  if (source.includes('new Date')) return 'new Date()';
  if (source.includes('toLocale')) return 'x.toLocaleString()';
  if (source.includes('Intl')) return 'Intl.Collator()';
  // The remaining patterns all match a plain member or bare identifier: recover it by
  // stripping the word boundaries and escapes the pattern is written with.
  return `${source.replace(/\\b/g, '').replace(/\\./g, '.')}()`;
}
