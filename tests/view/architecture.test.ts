import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The executable form of the rule that keeps the engine/view wall standing at its
// thinnest point. The renderer is allowed to lay out values and wire events; it is not
// allowed to work anything out. A fuzzy read, a trend, a why-trace, a roadmap figure —
// each must arrive already derived, or the wall has a hole in it exactly where the
// game's most important screen is.

const here = dirname(fileURLToPath(import.meta.url));

/** Comments describe the rule; only the code can break it, so scan the code alone. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const renderer = stripComments(
  readFileSync(join(here, '..', '..', 'src', 'view', 'dom.ts'), 'utf8'),
);

/** Every `from '<module>'` import statement in the renderer, with its full text. */
function importsFrom(source: string, module: string): string[] {
  const pattern = new RegExp(`import[^;]*?from\\s+'${module}';`, 'g');
  return source.match(pattern) ?? [];
}

describe('the renderer derives nothing', () => {
  it('imports only types from the engine and content layers', () => {
    const layerImports = [
      ...importsFrom(renderer, '\\.\\./engine'),
      ...importsFrom(renderer, '\\.\\./content'),
    ];
    expect(layerImports.length).toBeGreaterThan(0); // the guard is actually looking at something
    for (const statement of layerImports) {
      expect(statement.startsWith('import type')).toBe(true);
    }
  });

  it('never names a GameState — it only ever sees view models', () => {
    expect(renderer).not.toMatch(/\bGameState\b/);
  });

  it('calls no engine derivation', () => {
    for (const derivation of ['deriveSummary', 'deriveOutcome', 'roadmapProgress', 'tick(']) {
      expect(renderer).not.toContain(derivation);
    }
  });
});
