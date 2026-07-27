/**
 * Event firing — the one place a sprint tick reaches for randomness. At most one
 * event surfaces per sprint: a chance gate keeps some sprints quiet, and when an event
 * does fire it is chosen by a seeded weighted draw over the content set and its
 * declarative effects are applied to the roster.
 *
 * The engine reads events as pure data (content/events) and never lets content carry
 * behavior. All the rules — the fire chance, the weighted pick, which engineer a
 * one-engineer effect lands on, the clamp — live here, so the library can grow to
 * hundreds of events without any of them touching engine internals.
 *
 * Determinism rests on a fixed draw order: fire-chance first, then the weighted pick,
 * then (only if an effect needs a person) the target engineer. The RNG state is
 * threaded in and the advanced state handed back, so a resumed save replays the exact
 * same sprint. Effects apply after attrition in the tick's locked order, so an
 * event-driven burnout spike can never cause an unforeseeable same-sprint quit.
 */

import { getTuning, listEvents } from '../content';
import type { GameEvent } from '../content';
import { clampAttribute, type Engineer } from './entities';
import { nextFloat, nextInt, type RngState } from './rng';
import type { SprintEventReport } from './summary';

/**
 * The result of the event step: the (possibly-updated) roster, the report to fold into
 * the summary (`null` when the sprint stayed quiet), and the advanced RNG state.
 */
export interface EventFiring {
  readonly roster: readonly Engineer[];
  readonly report: SprintEventReport | null;
  readonly rng: RngState;
}

/** Whether an event fires this sprint for a draw `p ∈ [0, 1)`. Pure — no RNG. */
export function shouldFireEvent(p: number): boolean {
  return p < getTuning().events.perSprintChance;
}

/**
 * The weighted pick over the eligible events for a draw `p ∈ [0, 1)`. Walks the set in
 * declaration order accumulating weight, so the mapping from `p` to event is fixed and
 * reproducible. The final event is the float-edge fallback (p just under 1).
 */
export function pickWeightedEvent(
  events: readonly GameEvent[],
  p: number,
): GameEvent {
  const total = events.reduce((sum, event) => sum + event.trigger.weight, 0);
  let target = p * total;
  for (const event of events) {
    target -= event.trigger.weight;
    if (target < 0) return event;
  }
  return events[events.length - 1]!;
}

/**
 * Apply one event's effects to the roster, choosing a single target engineer for all
 * of its one-engineer effects. Returns the new roster and the ids actually moved, in
 * roster order. Whole-team effects touch everyone; a clamp keeps every attribute in
 * range. Engineers no effect reached are returned by identity, unchanged.
 */
function applyEvent(
  roster: readonly Engineer[],
  event: GameEvent,
  targetIndex: number,
): { roster: readonly Engineer[]; affectedIds: readonly string[] } {
  const affected = new Set<string>();
  const nextRoster = roster.map((engineer, index) => {
    let morale = engineer.morale;
    let burnout = engineer.burnout;
    for (const effect of event.effects) {
      const hit = effect.target === 'whole-team' || index === targetIndex;
      if (!hit) continue;
      affected.add(engineer.id);
      if (effect.attribute === 'morale') {
        morale = clampAttribute(morale + effect.delta);
      } else {
        burnout = clampAttribute(burnout + effect.delta);
      }
    }
    return morale === engineer.morale && burnout === engineer.burnout
      ? engineer
      : { ...engineer, morale, burnout };
  });
  const affectedIds = nextRoster
    .filter((engineer) => affected.has(engineer.id))
    .map((engineer) => engineer.id);
  return { roster: nextRoster, affectedIds };
}

/**
 * Resolve the sprint's single event step. Draws the fire gate; if it stays quiet, the
 * roster is untouched and only that one draw is consumed. Otherwise it draws the
 * weighted pick and, when an effect needs a person, the target engineer, then applies
 * the effects and reports what fired and whom it touched.
 */
export function fireEvent(roster: readonly Engineer[], rng: RngState): EventFiring {
  const events = listEvents();
  const fire = nextFloat(rng);
  if (events.length === 0 || !shouldFireEvent(fire.value)) {
    return { roster, report: null, rng: fire.next };
  }

  const pick = nextFloat(fire.next);
  const event = pickWeightedEvent(events, pick.value);
  let cursor = pick.next;

  const needsTarget = event.effects.some((e) => e.target === 'one-engineer');
  let targetIndex = -1;
  if (needsTarget && roster.length > 0) {
    const draw = nextInt(cursor, 0, roster.length);
    targetIndex = draw.value;
    cursor = draw.next;
  }

  const applied = applyEvent(roster, event, targetIndex);
  const report: SprintEventReport = {
    id: event.id,
    description: event.description,
    affectedEngineerIds: applied.affectedIds,
  };
  return { roster: applied.roster, report, rng: cursor };
}
