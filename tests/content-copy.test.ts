import { describe, it, expect } from 'vitest';
import {
  framingCopy,
  panelCopy,
  controlLabel,
  screenNote,
  attentionActionLabels,
  listAllCopy,
  type PanelKey,
} from '../src/content/copy';

// The chrome copy is data, and these are the rules that data has to obey: the framing is a
// line or two rather than a tutorial, the named vocabulary is actually named, and nothing
// is blank. Phrasing is meant to be edited freely — these tests pin the shape and the
// promises, not the wording, except where a word is the whole point.

const NAMED_VOCABULARY: readonly PanelKey[] = [
  'roster',
  'backlog',
  'roadmap',
  'attention',
  'crunch',
  'reads',
];

describe('the framing copy', () => {
  it('sets the goal in a line or two', () => {
    const framing = framingCopy();
    expect(framing.lines.length).toBeGreaterThanOrEqual(1);
    expect(framing.lines.length).toBeLessThanOrEqual(2);
    expect(framing.title).not.toBe('');
  });

  it('names the one thing that ends a run', () => {
    // Attrition is the only fail state, so the goal has to say so up front. A player who
    // learns that from the post-mortem learned it too late.
    expect(framing()).toMatch(/lose anyone/i);
  });

  it('reads as the goal, not as a lesson plan', () => {
    // No step numbering, no "first…then", nothing that promises a walkthrough.
    expect(framing()).not.toMatch(/step \d|tutorial|lesson|first,|next,/i);
  });

  /** The whole framing as one string — the way the player reads it. */
  function framing(): string {
    return framingCopy().lines.join(' ');
  }
});

describe('the panel labels', () => {
  it('names each element of the game\'s vocabulary', () => {
    const titles = NAMED_VOCABULARY.map((key) => panelCopy(key).title);
    expect(titles).toEqual([
      'The Roster',
      'The Backlog',
      'The Roadmap',
      'The Attention Tray',
      'The Crunch Toggle',
      'How Everyone Seemed',
    ]);
  });

  it('explains every element a first-time player meets cold, in one line each', () => {
    for (const key of NAMED_VOCABULARY) {
      const note = panelCopy(key).note;
      expect(note, `${key} has no in-context note`).toBeDefined();
      expect(note!.length).toBeGreaterThan(0);
      // One line, not a paragraph — labels, not a walkthrough.
      expect(note!.length).toBeLessThanOrEqual(90);
      expect(note).not.toContain('\n');
    }
  });

  it('says plainly that the roadmap is pressure and not a fail line', () => {
    // The one note carrying a rule the player could otherwise misread: a run behind
    // schedule has not failed, and only human outcomes end a run.
    expect(panelCopy('roadmap').note).toMatch(/does not end the run/i);
  });
});

describe('the control labels', () => {
  it('gives every control a word', () => {
    for (const key of ['start', 'resolve', 'planNext', 'seeEnding', 'newRun', 'crunch', 'assign', 'idle'] as const) {
      expect(controlLabel(key).length).toBeGreaterThan(0);
    }
  });

  it('offers one way into a run', () => {
    expect(controlLabel('start')).toBe('Start the run');
  });
});

describe('the screen notes', () => {
  it('says what the player is looking at on each screen', () => {
    expect(screenNote('planning')).toBe('Planning');
    expect(screenNote('summary')).toBe('Sprint summary');
    expect(screenNote('completed')).not.toBe('');
    expect(screenNote('failed')).not.toBe('');
  });

  it('does not dress an ending as a win or a defeat', () => {
    expect(screenNote('completed')).not.toMatch(/win|victory|congratulations/i);
    expect(screenNote('failed')).not.toMatch(/lose|loser|defeat|game over/i);
  });
});

describe('the attention action labels', () => {
  it('names the three managerial actions', () => {
    expect(attentionActionLabels()).toEqual({
      oneOnOne: '1:1',
      unblock: 'Unblock',
      recognize: 'Recognize',
    });
  });
});

describe('the copy set as a whole', () => {
  it('carries nothing blank or ragged', () => {
    for (const line of listAllCopy()) {
      expect(line).not.toBe('');
      expect(line).toBe(line.trim());
    }
  });

  it('never numbers itself into a tutorial', () => {
    for (const line of listAllCopy()) {
      expect(line, `"${line}" reads like a tutorial step`).not.toMatch(/\bstep \d/i);
    }
  });
});
