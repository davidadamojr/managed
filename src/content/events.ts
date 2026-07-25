/**
 * The event set — declarative data, never behavior.
 *
 * An event is an id, a description, a selection rule, and a list of effect
 * descriptors. The engine reads these and applies them during resolution; the
 * content layer never contains a function that mutates state. Keeping effects as
 * data (target + attribute + signed delta) rather than callbacks is what lets the
 * library grow into hundreds of events later without any of them being able to
 * reach into engine internals.
 *
 * This is a tiny seed set: at most one event surfaces per sprint, and these are
 * ambient team-mood beats — not incidents, tech debt, or org drama, which are
 * their own systems.
 */

/** Who an effect lands on. The engine picks the specific engineer (seeded). */
export type EventEffectTarget = 'one-engineer' | 'whole-team';

/** The two people attributes an event can nudge. The engine clamps to 0–100. */
export type EventEffectAttribute = 'morale' | 'burnout';

export interface EventEffect {
  readonly target: EventEffectTarget;
  readonly attribute: EventEffectAttribute;
  /** Signed points applied to the attribute; the engine clamps the result. */
  readonly delta: number;
}

export interface EventTrigger {
  /** Relative likelihood in the seeded weighted draw. Higher = more frequent. */
  readonly weight: number;
}

export interface GameEvent {
  readonly id: string;
  readonly description: string;
  readonly trigger: EventTrigger;
  readonly effects: readonly EventEffect[];
}

const EVENTS: readonly GameEvent[] = [
  {
    id: 'green-ci',
    description:
      'The flaky integration suite goes green and stays green for a whole week. Nobody quite trusts it, but the standups get shorter.',
    trigger: { weight: 3 },
    effects: [{ target: 'whole-team', attribute: 'morale', delta: 4 }],
  },
  {
    id: 'demo-scramble',
    description:
      'A last-minute demo request lands at 4pm. It goes fine. Everyone stays late anyway, just in case.',
    trigger: { weight: 2 },
    effects: [{ target: 'whole-team', attribute: 'burnout', delta: 6 }],
  },
  {
    id: 'all-hands-shoutout',
    description:
      "Someone's fix gets a shout-out in the company all-hands. They pretend it is no big deal.",
    trigger: { weight: 2 },
    effects: [{ target: 'one-engineer', attribute: 'morale', delta: 6 }],
  },
];

/** The event set. Read-only by contract. */
export function listEvents(): readonly GameEvent[] {
  return EVENTS;
}
