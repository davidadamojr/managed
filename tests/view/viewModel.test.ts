import { describe, it, expect } from 'vitest';
import {
  buildRunView,
  buildSummaryView,
  buildOutcomeView,
  buildScreenView,
} from '../../src/view/viewModel';
import {
  newRun,
  tick,
  emptyActions,
  assign,
  setCrunch,
  spendAttention,
  roadmapProgress,
  type GameState,
  type SprintActions,
} from '../../src/engine';
import { listSkills } from '../../src/content';
import {
  completedRun,
  engineer,
  failedRun,
  read,
  runState,
  summary,
} from './fixtures';

const SEED = 20260728;

/** The id of the first ticket still in play — always present in a fresh over-capacity run. */
function firstOpenTicketId(state: GameState): string {
  const ticket = state.backlog.find((t) => t.status !== 'done');
  if (ticket === undefined) throw new Error('fixture: expected an open ticket');
  return ticket.id;
}

/** Spend the whole attention pool so the tray reads exhausted. */
function drainAttention(state: GameState): SprintActions {
  let draft = emptyActions();
  for (let i = 0; i < state.attention.capacity; i += 1) {
    const result = spendAttention(state, draft, { kind: 'oneOnOne', engineerId: 'eng-1' });
    if (result.ok) draft = result.actions;
  }
  return draft;
}

/** Every property name appearing anywhere in a value tree — the raw-interior leak check. */
function allKeys(value: unknown, keys: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, keys);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      allKeys(child, keys);
    }
  }
  return keys;
}

describe('roster projection', () => {
  it('projects one card per engineer with identity, skills, and no assignment yet', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });

    expect(view.roster).toHaveLength(state.roster.length);
    view.roster.forEach((card, i) => {
      const engineer = state.roster[i]!;
      expect(card.id).toBe(engineer.id);
      expect(card.name).toBe(engineer.name);
      expect(card.flavor).toBe(engineer.flavor);
      // Every skill is shown with its raw proficiency — a systems number, not an interior.
      expect(card.skills).toHaveLength(listSkills().length);
      for (const { skill, proficiency } of card.skills) {
        expect(proficiency).toBe(engineer.skills[skill]);
      }
      expect(card.assignedTicketId).toBeNull();
      expect(card.attention).toEqual([]);
    });
  });

  it('reflects a drafted assignment on both the card and the backlog ticket', () => {
    const state = newRun(SEED);
    const ticketId = firstOpenTicketId(state);
    const draft = assign(emptyActions(), 'eng-1', ticketId);
    const view = buildRunView({ state, draft });

    const card = view.roster.find((c) => c.id === 'eng-1')!;
    expect(card.assignedTicketId).toBe(ticketId);

    const ticket = view.backlog.tickets.find((t) => t.id === ticketId)!;
    expect(ticket.assignedTo).toContain(card.name);
  });

  it('shows no read before the first resolve, then the engine\'s fuzzy note after', () => {
    const state = newRun(SEED);
    const fresh = buildRunView({ state, draft: emptyActions() });
    for (const card of fresh.roster) expect(card.read).toBeNull();

    const resolved = tick(state, emptyActions()).state;
    const view = buildRunView({ state: resolved, draft: emptyActions() });
    const reads = new Map(resolved.history!.at(-1)!.reads.map((r) => [r.engineerId, r]));
    for (const card of view.roster) {
      const read = reads.get(card.id)!;
      expect(card.read).toBe(read.note);
      expect(card.atRisk).toBe(read.atRisk);
    }
  });
});

describe('the fuzzy-readability wall', () => {
  it('carries no raw morale or burnout anywhere in the view model', () => {
    // Resolve a sprint first so morale/burnout have actually moved off their uniform
    // starting values — the interiors are live, and still must not surface.
    const resolved = tick(newRun(SEED), setCrunch(emptyActions(), true)).state;
    const view = buildRunView({ state: resolved, draft: emptyActions() });

    const keys = allKeys(view);
    expect(keys.has('morale')).toBe(false);
    expect(keys.has('burnout')).toBe(false);
  });
});

describe('backlog projection', () => {
  it('lists every in-play ticket with size and skill, and shows it over capacity', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });

    const inPlay = state.backlog.filter((t) => t.status !== 'done');
    expect(view.backlog.tickets).toHaveLength(inPlay.length);
    for (const ticket of view.backlog.tickets) {
      const source = state.backlog.find((t) => t.id === ticket.id)!;
      expect(ticket.size).toBe(source.size);
      expect(ticket.requiredSkill).toBe(source.requiredSkill);
    }
    // The scarcity is the point: more open work than the team can staff.
    expect(view.backlog.teamSize).toBe(state.roster.length);
    expect(view.backlog.openCount).toBeGreaterThan(view.backlog.teamSize);
  });
});

describe('roadmap projection', () => {
  it('mirrors the engine\'s roadmap progress exactly', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });
    expect(view.roadmap).toEqual(roadmapProgress(state.roadmap, state.backlog));
  });
});

describe('attention tray projection', () => {
  it('starts full with all three actions affordable', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: emptyActions() });

    expect(view.attention.remaining).toBe(view.attention.capacity);
    expect(view.attention.actions).toHaveLength(3);
    for (const action of view.attention.actions) {
      expect(action.cost).toBeGreaterThan(0);
      expect(action.affordable).toBe(true);
    }
  });

  it('reads exhausted, with every action unaffordable, once the pool is drained', () => {
    const state = newRun(SEED);
    const view = buildRunView({ state, draft: drainAttention(state) });

    expect(view.attention.remaining).toBe(0);
    for (const action of view.attention.actions) {
      expect(action.affordable).toBe(false);
    }
  });
});

describe('crunch and resolvability projection', () => {
  it('mirrors the draft crunch flag', () => {
    const state = newRun(SEED);
    expect(buildRunView({ state, draft: emptyActions() }).crunch).toBe(false);
    expect(buildRunView({ state, draft: setCrunch(emptyActions(), true) }).crunch).toBe(true);
  });

  it('can resolve while active, but not at a terminal state', () => {
    const state = newRun(SEED);
    expect(buildRunView({ state, draft: emptyActions() }).canResolve).toBe(true);

    const completed: GameState = { ...state, status: 'completed' };
    expect(buildRunView({ state: completed, draft: emptyActions() }).canResolve).toBe(false);
  });
});

describe('sprint summary projection', () => {
  it('has nothing to show before the first sprint resolves', () => {
    expect(buildSummaryView(newRun(SEED))).toBeNull();
  });

  it('projects what shipped, roadmap progress, and a named read per engineer', () => {
    const resolved = tick(newRun(SEED), emptyActions()).state;
    const view = buildSummaryView(resolved)!;
    const latest = resolved.history!.at(-1)!;

    expect(view.label).toBe('Sprint 1 of 6');
    expect(view.roadmap).toEqual(latest.roadmap);
    expect(view.shipped.map((t) => t.id)).toEqual([...latest.shipped]);
    for (const shipped of view.shipped) {
      const source = resolved.backlog.find((t) => t.id === shipped.id)!;
      expect(shipped.requiredSkill).toBe(source.requiredSkill);
      expect(shipped.size).toBe(source.size);
    }

    expect(view.reads).toHaveLength(latest.reads.length);
    view.reads.forEach((read, i) => {
      const source = latest.reads[i]!;
      expect(read.name).toBe(resolved.roster.find((e) => e.id === source.engineerId)!.name);
      expect(read.note).toBe(source.note);
      expect(read.mood).toBe(source.mood);
      expect(read.trend).toBe(source.trend);
      expect(read.atRisk).toBe(source.atRisk);
    });
    expect(view.runEnded).toBe(false);
  });

  it('carries no raw morale or burnout anywhere in the summary', () => {
    const resolved = tick(newRun(SEED), setCrunch(emptyActions(), true)).state;
    const keys = allKeys(buildSummaryView(resolved)!);
    expect(keys.has('morale')).toBe(false);
    expect(keys.has('burnout')).toBe(false);
  });

  it('gives a first sprint one history point — state, with no direction', () => {
    const resolved = tick(newRun(SEED), emptyActions()).state;
    for (const read of buildSummaryView(resolved)!.reads) {
      expect(read.history).toHaveLength(1);
      expect(read.history[0]!.sprint).toBe(1);
      expect(read.trend).toBe('unknown'); // no prior sprint to have moved from
    }
  });

  it('gathers a band per sprint so a slide is legible across sprints', () => {
    const state = runState({
      sprintIndex: 3,
      roster: [engineer('eng-1', 'Priya')],
      history: [
        summary(0, [read('eng-1', 'steady')]),
        summary(1, [read('eng-1', 'dipping')]),
        summary(2, [read('eng-1', 'struggling', { atRisk: true })]),
      ],
    });

    const strip = buildSummaryView(state)!.reads[0]!.history;
    expect(strip.map((p) => p.mood)).toEqual(['steady', 'dipping', 'struggling']);
    expect(strip.map((p) => p.sprint)).toEqual([1, 2, 3]);
    expect(strip.at(-1)!.atRisk).toBe(true);
  });

  it('names the people a fired event landed on', () => {
    const state = runState({
      sprintIndex: 1,
      history: [
        summary(0, [read('eng-1', 'steady'), read('eng-2', 'steady')], {
          event: {
            id: 'prod-fire',
            description: 'Production fell over on a Friday afternoon.',
            affectedEngineerIds: ['eng-1'],
          },
        }),
      ],
    });

    expect(buildSummaryView(state)!.event).toEqual({
      description: 'Production fell over on a Friday afternoon.',
      affected: ['Priya'],
    });
  });

  it('marks the summary of a run that has ended, so the advance leads to the ending', () => {
    expect(buildSummaryView(completedRun())!.runEnded).toBe(true);
  });
});

describe('run outcome projection', () => {
  it('has nothing to show while the run is active', () => {
    expect(buildOutcomeView(newRun(SEED))).toBeNull();
  });

  it('projects a completed run plainly, naming who is still on the team', () => {
    const view = buildOutcomeView(completedRun())!;
    expect(view.result).toBe('completed');
    expect(view.postMortem).toBeNull();
    expect(view.survivors).toEqual(['Priya', 'Sam']);
    expect(view.sprintsPlayed).toBe(2);
    expect(view.runLength).toBe(6);
  });

  it('projects a loss with the why-trace and the warnings as they were shown', () => {
    const view = buildOutcomeView(failedRun())!;
    const postMortem = view.postMortem!;

    expect(view.result).toBe('failed');
    expect(view.label).toBe('Sprint 4 of 6');
    expect(postMortem.engineerName).toBe('Priya');
    expect(postMortem.sprint).toBe(4); // 1-based, as the player counts sprints
    expect(postMortem.crunchSprints).toBe(3);
    expect(postMortem.warningsShown).toBe(2);
    expect(postMortem.fastBurnout).toBe(false);
    expect(postMortem.warnings.map((w) => w.sprint)).toEqual([2, 3]);
    expect(postMortem.warnings[0]!.note).toBe('Priya seems checked out lately.');
  });

  it('leaves the departed engineer out of who is still here', () => {
    const state = failedRun();
    expect(state.roster.map((e) => e.name)).toContain('Priya'); // the roster keeps her
    expect(buildOutcomeView(state)!.survivors).toEqual(['Sam']);
  });

  it('carries no raw morale or burnout into the ending either', () => {
    const keys = allKeys(buildOutcomeView(failedRun())!);
    expect(keys.has('morale')).toBe(false);
    expect(keys.has('burnout')).toBe(false);
  });
});

describe('screen selection', () => {
  const draft = emptyActions();

  it('builds the planning screen for a run being assembled', () => {
    const view = buildScreenView({ state: newRun(SEED), draft }, 'planning');
    expect(view.screen).toBe('planning');
  });

  it('builds the summary screen for the sprint just resolved', () => {
    const resolved = tick(newRun(SEED), emptyActions()).state;
    const view = buildScreenView({ state: resolved, draft }, 'summary');
    expect(view.screen).toBe('summary');
  });

  it('builds the ending screen for a finished run', () => {
    const view = buildScreenView({ state: failedRun(), draft }, 'ended');
    expect(view.screen).toBe('ended');
  });

  it('falls back to planning when a phase has nothing to show', () => {
    // Guards, not paths: the store never asks for a summary before one exists, nor for
    // an ending while the run is live.
    expect(buildScreenView({ state: newRun(SEED), draft }, 'summary').screen).toBe('planning');
    expect(buildScreenView({ state: newRun(SEED), draft }, 'ended').screen).toBe('planning');
  });
});
