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

/** The module path of the one import the renderer is allowed to take values from. */
const COPY_MODULE = '../content/copy';

interface ImportStatement {
  readonly module: string;
  readonly typeOnly: boolean;
}

/** Every import statement in the renderer, with the module it names. */
function imports(source: string): ImportStatement[] {
  const statements = source.match(/import[^;]*?from\s+'[^']+';/g) ?? [];
  return statements.map((statement) => ({
    module: /from\s+'([^']+)';/.exec(statement)![1]!,
    typeOnly: statement.startsWith('import type'),
  }));
}

/** Imports reaching out of the view, into the engine or the content layers. */
function crossLayerImports(): ImportStatement[] {
  return imports(renderer).filter((i) => i.module.startsWith('../'));
}

describe('the renderer derives nothing', () => {
  it('imports only types from the engine layer', () => {
    const engineImports = crossLayerImports().filter((i) => i.module.startsWith('../engine'));
    expect(engineImports.length).toBeGreaterThan(0); // the guard is actually looking at something
    for (const statement of engineImports) {
      expect(statement.typeOnly, `${statement.module} is imported for its values`).toBe(true);
    }
  });

  it('takes values from one place only: the words it is meant to render', () => {
    // The renderer holds no copy of its own, so it has to read the labels from somewhere.
    // Words are the single exception to "types only" across a layer boundary, and it is a
    // narrow one: a string table cannot smuggle a game rule into the view.
    const valueImports = crossLayerImports().filter((i) => !i.typeOnly);
    expect(valueImports.map((i) => i.module)).toEqual([COPY_MODULE]);
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
