import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

// This test is the executable form of two non-negotiable rules: the engine is a
// pure, headless layer (no DOM, no React/Svelte) and it contains no ambient
// nondeterminism (no Math.random, no wall-clock). Enforcing it in the test suite
// means `npm test` fails the moment either rule is broken, in any engine file.

const here = dirname(fileURLToPath(import.meta.url));
const engineDir = join(here, '..', 'src', 'engine');

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

// Each banned pattern is paired with the reason it must never appear in the engine.
const BANNED: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bMath\.random\b/, reason: 'nondeterminism — use the seeded RNG' },
  { pattern: /\bDate\.now\b/, reason: 'wall-clock nondeterminism' },
  { pattern: /\bnew Date\b/, reason: 'wall-clock nondeterminism' },
  { pattern: /\bperformance\.now\b/, reason: 'wall-clock nondeterminism' },
  { pattern: /\bdocument\b/, reason: 'DOM access in the engine' },
  { pattern: /\bwindow\b/, reason: 'DOM access in the engine' },
  { pattern: /\blocalStorage\b/, reason: 'persistence/DOM access in the engine' },
  { pattern: /from\s+['"]react['"]/, reason: 'React import in the engine' },
  { pattern: /from\s+['"]react-dom['"]/, reason: 'React import in the engine' },
  { pattern: /from\s+['"]svelte['"]/, reason: 'Svelte import in the engine' },
];

describe('engine purity + view-wall guard', () => {
  const files = collectTsFiles(engineDir);

  it('finds engine source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s contains no banned engine patterns', (file) => {
    const source = readFileSync(file, 'utf8');
    const violations = BANNED.filter(({ pattern }) => pattern.test(source)).map(
      ({ pattern, reason }) => `${pattern} (${reason})`,
    );
    expect(
      violations,
      `${relative(engineDir, file)} violates the engine wall: ${violations.join(', ')}`,
    ).toEqual([]);
  });
});
