import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  collectTsFiles,
  findViolations,
  type BannedPattern,
} from './support/scan';

// The executable form of the engine/view wall: simulation rules never live in, or reach
// into, the presentation layer. Break it and two things go with it — the harness, which
// can only drive an engine that runs headless, and the portability that keeps a future
// port to another language a translation rather than a rewrite.
//
// Determinism is audited separately, in the determinism audit, which covers the engine
// alongside the content and harness it shares the simulation path with. One rule, one
// owner: a failure here always means the wall, never the clock.

const here = dirname(fileURLToPath(import.meta.url));
const engineDir = join(here, '..', 'src', 'engine');

const BANNED: readonly BannedPattern[] = [
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
    const violations = findViolations(readFileSync(file, 'utf8'), BANNED);
    expect(
      violations,
      `${relative(engineDir, file)} violates the engine wall: ${violations.join(', ')}`,
    ).toEqual([]);
  });
});
