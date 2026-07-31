/**
 * Player-facing chrome copy — the framing line the game opens on, the labels on every
 * named panel, and the words on every control. Declarative text, never behavior.
 *
 * It lives in the content layer for the same reason the read phrasings do: voice is data.
 * Tuning how the game speaks should mean editing this file, not editing a renderer. The
 * renderer therefore holds no words of its own — it lays out what it is given here — which
 * is also what keeps a later framework swap from taking the copy hostage.
 *
 * Deliberately **not** exported from the content barrel. The barrel is the seam the engine
 * reads content through, and the engine has no business knowing what a panel is called;
 * only the view reaches in here, by importing this module directly.
 *
 * The framing is two lines and a button, on purpose. The audience is fluent — engineers and
 * managers who have played this kind of game and, more to the point, lived this job — so the
 * opening points at the goal and gets out of the way. There is no tutorial: the labels below
 * name the surface, and the first sprint's summary teaches the loop.
 */

/**
 * The panels that carry a label, keyed by the class name the renderer gives them so a
 * label and the thing it labels cannot drift apart.
 */
export type PanelKey =
  | 'roster'
  | 'backlog'
  | 'roadmap'
  | 'attention'
  | 'crunch'
  | 'shipped'
  | 'reads'
  | 'event'
  | 'run-facts'
  | 'completion';

/** Every interactive control that carries a word: buttons, the crunch toggle, the selects. */
export type ControlKey =
  | 'start'
  | 'resolve'
  | 'planNext'
  | 'seeEnding'
  | 'newRun'
  | 'crunch'
  | 'assign'
  | 'idle';

/** The right-hand side of a screen header: what the player is looking at. */
export type ScreenNoteKey = 'planning' | 'summary' | 'completed' | 'failed';

/**
 * The three attention actions by name. Spelled out here rather than imported, because
 * content never imports the engine. The renderer assigns this record to the engine's own
 * `AttentionActionKind` — that assignment is the compile-time check that the two spellings
 * still agree.
 */
export type AttentionActionName = 'oneOnOne' | 'unblock' | 'recognize';

/** A panel's label, and the one line of in-context explanation it needs — if it needs one. */
export interface PanelCopy {
  readonly title: string;
  /**
   * Present on the elements a first-time player meets cold. A label, not a walkthrough:
   * one line that says what this is and what it costs you, then silence.
   */
  readonly note?: string;
}

/** The opening screen: the game's name and the goal, in the game's voice. */
export interface FramingCopy {
  readonly title: string;
  readonly lines: readonly string[];
}

const FRAMING: FramingCopy = {
  title: 'Managed',
  lines: [
    'You run this team. There’s more work than people.',
    'Don’t lose anyone.',
  ],
};

/**
 * Panel labels. The notes exist on the planning surface and on the summary's read panel —
 * the two places the vocabulary is first met — and say the true thing rather than the
 * encouraging one. The roadmap's note travels with it onto every screen on purpose: a
 * player who ends a run behind schedule should not be able to mistake that for the reason
 * the run ended.
 */
const PANELS: Readonly<Record<PanelKey, PanelCopy>> = {
  roster: {
    title: 'The Roster',
    note: 'Your engineers. Give each one a ticket, or leave them idle.',
  },
  backlog: {
    title: 'The Backlog',
    note: 'More work than the team can finish. Deciding what slips is the job.',
  },
  roadmap: {
    title: 'The Roadmap',
    note: 'What you said you would ship. Falling behind hurts. It does not end the run.',
  },
  attention: {
    title: 'The Attention Tray',
    note: 'Spend these on an engineer’s card. They run out before the team does.',
  },
  crunch: {
    title: 'The Crunch Toggle',
    note: 'More gets done this sprint. The bill comes later, and not to you.',
  },
  shipped: { title: 'What Shipped' },
  reads: {
    title: 'How Everyone Seemed',
    note: 'Your read on each person after the sprint. Watch which way it moves.',
  },
  event: { title: 'What Else Happened' },
  'run-facts': { title: 'The Run' },
  completion: { title: 'The run is over' },
};

const CONTROLS: Readonly<Record<ControlKey, string>> = {
  start: 'Start the run',
  resolve: 'Resolve sprint',
  planNext: 'Plan the next sprint',
  seeEnding: 'See how it ended',
  newRun: 'Start a new run',
  crunch: 'Crunch this sprint',
  assign: 'Assign',
  idle: '— Idle —',
};

const SCREEN_NOTES: Readonly<Record<ScreenNoteKey, string>> = {
  planning: 'Planning',
  summary: 'Sprint summary',
  completed: 'Run complete',
  failed: 'Run over',
};

/** The player-facing names of the three managerial actions. */
const ATTENTION_ACTIONS: Readonly<Record<AttentionActionName, string>> = {
  oneOnOne: '1:1',
  unblock: 'Unblock',
  recognize: 'Recognize',
};

/** The opening framing: the goal, in a line or two. */
export function framingCopy(): FramingCopy {
  return FRAMING;
}

/** The label, and any in-context note, for one panel. */
export function panelCopy(key: PanelKey): PanelCopy {
  return PANELS[key];
}

/** The word on one control. */
export function controlLabel(key: ControlKey): string {
  return CONTROLS[key];
}

/** What the player is looking at, for a screen header. */
export function screenNote(key: ScreenNoteKey): string {
  return SCREEN_NOTES[key];
}

/** The three attention action names, as a record so a caller can check it covers the set. */
export function attentionActionLabels(): Readonly<Record<AttentionActionName, string>> {
  return ATTENTION_ACTIONS;
}

/**
 * Every string in this file, flattened. Only the copy tests use it, to hold the whole set
 * to the rules at once — nothing blank, nothing numbered like a tutorial step.
 */
export function listAllCopy(): readonly string[] {
  return [
    FRAMING.title,
    ...FRAMING.lines,
    ...Object.values(PANELS).flatMap((p) => (p.note === undefined ? [p.title] : [p.title, p.note])),
    ...Object.values(CONTROLS),
    ...Object.values(SCREEN_NOTES),
    ...Object.values(ATTENTION_ACTIONS),
  ];
}
