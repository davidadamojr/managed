import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

// The content layer is data, not logic. Two rules make that concrete and keep it
// honest as the data grows:
//   1. Content never imports the engine. Data must not reach into simulation
//      internals; the dependency arrow points engine -> content, never back.
//   2. Content carries no ambient nondeterminism. It feeds a deterministic tick,
//      so a stray Math.random / clock read here would poison reproducibility just
//      as surely as one in the engine.

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'content');

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

const BANNED: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /from\s+['"][^'"]*engine[^'"]*['"]/, reason: 'content importing the engine' },
  { pattern: /\bMath\.random\b/, reason: 'nondeterminism in content' },
  { pattern: /\bDate\.now\b/, reason: 'wall-clock nondeterminism in content' },
  { pattern: /\bnew Date\b/, reason: 'wall-clock nondeterminism in content' },
  { pattern: /\bperformance\.now\b/, reason: 'wall-clock nondeterminism in content' },
];

describe('content purity guard', () => {
  const files = collectTsFiles(contentDir);

  it('finds content source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s stays pure data', (file) => {
    const source = readFileSync(file, 'utf8');
    const violations = BANNED.filter(({ pattern }) => pattern.test(source)).map(
      ({ pattern, reason }) => `${pattern} (${reason})`,
    );
    expect(
      violations,
      `${relative(contentDir, file)} breaks content purity: ${violations.join(', ')}`,
    ).toEqual([]);
  });
});
