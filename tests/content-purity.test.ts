import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  collectTsFiles,
  findViolations,
  type BannedPattern,
} from './support/scan';

// The content layer is data, not logic. The rule that keeps it that way as the data
// grows: content never imports the engine. Data must not reach into simulation
// internals; the dependency arrow points engine -> content, never back.
//
// Content's other obligation — carrying no ambient nondeterminism, since it feeds a
// deterministic tick — is checked in the determinism audit, which holds that rule for
// the whole simulation path at once.

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'content');

const BANNED: readonly BannedPattern[] = [
  {
    pattern: /from\s+['"][^'"]*engine[^'"]*['"]/,
    reason: 'content importing the engine',
  },
];

describe('content purity guard', () => {
  const files = collectTsFiles(contentDir);

  it('finds content source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s stays pure data', (file) => {
    const violations = findViolations(readFileSync(file, 'utf8'), BANNED);
    expect(
      violations,
      `${relative(contentDir, file)} breaks content purity: ${violations.join(', ')}`,
    ).toEqual([]);
  });
});
