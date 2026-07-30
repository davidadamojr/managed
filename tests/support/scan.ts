/**
 * Shared machinery for the source-scanning guards — the tests that enforce rules no
 * type or assertion can reach: that the engine never touches the DOM, that content
 * never imports the engine, that nothing anywhere reads a clock or an unseeded random.
 *
 * These rules are about what the *code* does, so comments are stripped before scanning.
 * That is not a loophole: a comment cannot call `Date.now()`. Stripping is what lets a
 * file document the rule it obeys — "no wall-clock here" — without tripping the guard
 * that checks it.
 *
 * Not a `*.test.ts` file, so the runner treats it as the helper it is.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** One banned pattern and the reason it is banned, reported together on a hit. */
export interface BannedPattern {
  readonly pattern: RegExp;
  readonly reason: string;
}

/** Every `.ts` file under `dir`, recursively, in a stable directory order. */
export function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Remove block and line comments so only code is scanned. Deliberately simple: it is a
 * guard's pre-filter, not a parser. The one case worth handling is a `//` inside a
 * string (a URL), which would otherwise swallow the rest of the line and hide code
 * from the scan — so quoted spans are stepped over rather than searched.
 */
export function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (two === '//') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }
    const ch = source[i]!;
    if (ch === '"' || ch === "'" || ch === '`') {
      const close = closingQuote(source, i);
      out += source.slice(i, close);
      i = close;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Index just past the quote closing the string that opens at `start`. */
function closingQuote(source: string, start: number): number {
  const quote = source[start]!;
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === quote) return i + 1;
    // An unterminated single- or double-quoted string cannot span a newline; stopping
    // there keeps a stray apostrophe in prose from eating the rest of the file.
    if (ch === '\n' && quote !== '`') return i;
    i += 1;
  }
  return source.length;
}

/**
 * The reasons a source violates a rule set, empty when it is clean. Returning reasons
 * rather than a boolean is what makes a guard failure name its own cause.
 */
export function findViolations(
  source: string,
  banned: readonly BannedPattern[],
): string[] {
  const code = stripComments(source);
  return banned
    .filter(({ pattern }) => pattern.test(code))
    .map(({ pattern, reason }) => `${pattern} (${reason})`);
}
