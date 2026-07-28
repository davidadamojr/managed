import { describe, it, expect } from 'vitest';
import {
  createRng,
  deriveOutcome,
  type Engineer,
  type EngineerRead,
  type GameState,
  type SprintSummary,
  type Ticket,
} from '../src/engine';

// deriveOutcome is a pure derivation over an already-terminal state — these unit tests
// hand-build the terminal states directly, so they exercise the derivation without
// having to drive a whole run to its end (that is the lifecycle integration suite).

function engineer(id: string, name: string): Engineer {
  return {
    id,
    name,
    flavor: 'placeholder',
    skills: { frontend: 50, backend: 50, infra: 50, debugging: 50 },
    morale: 50,
    burnout: 30,
    assignment: null,
  };
}

function ticket(id: string, status: Ticket['status']): Ticket {
  return { id, size: 3, requiredSkill: 'frontend', progress: 0, status };
}

function read(engineerId: string, atRisk: boolean, note: string): EngineerRead {
  return {
    engineerId,
    note,
    atRisk,
    mood: atRisk ? 'struggling' : 'steady',
    trend: 'unknown',
    sharpened: false,
  };
}

function summary(sprintIndex: number, reads: EngineerRead[]): SprintSummary {
  return { sprintIndex, shipped: [], roadmap: { completed: 1, total: 1 }, reads };
}

function baseState(overrides: Partial<GameState>): GameState {
  return {
    seed: 1,
    rngState: createRng(1),
    sprintIndex: 0,
    runLength: 6,
    roster: [engineer('eng-1', 'Ada'), engineer('eng-2', 'Bo')],
    backlog: [ticket('t1', 'done'), ticket('t2', 'open')],
    roadmap: { ticketIds: ['t1'] },
    attention: { capacity: 3, remaining: 3 },
    manager: { reputation: 0, burnout: 0 },
    status: 'active',
    ...overrides,
  };
}

describe('deriveOutcome', () => {
  it('returns null while the run is still active', () => {
    expect(deriveOutcome(baseState({ status: 'active' }))).toBeNull();
  });

  describe('completion', () => {
    const completed = baseState({
      status: 'completed',
      sprintIndex: 6,
      history: [
        summary(0, [read('eng-1', false, 'Ada seems fine.')]),
        summary(1, [read('eng-1', false, 'Ada seems fine.')]),
      ],
    });

    it('reports a completed result with no post-mortem', () => {
      const outcome = deriveOutcome(completed)!;
      expect(outcome.result).toBe('completed');
      expect(outcome.postMortem).toBeUndefined();
    });

    it('counts the sprints actually resolved and the run length', () => {
      const outcome = deriveOutcome(completed)!;
      expect(outcome.sprintsPlayed).toBe(2); // history length
      expect(outcome.runLength).toBe(6);
    });

    it('reports final roadmap progress read from the backlog, not as a fail axis', () => {
      const outcome = deriveOutcome(completed)!;
      expect(outcome.roadmap).toEqual({ completed: 1, total: 1 }); // t1 is done
    });
  });

  describe('attrition post-mortem', () => {
    const failed = baseState({
      status: 'failed',
      sprintIndex: 4,
      history: [
        summary(2, [read('eng-1', false, 'Ada seems steady.'), read('eng-2', false, 'Bo seems steady.')]),
        summary(3, [read('eng-1', true, 'Ada looks fried in standup.'), read('eng-2', false, 'Bo seems steady.')]),
        summary(4, [read('eng-1', true, 'Ada is running on empty.'), read('eng-2', false, 'Bo seems steady.')]),
      ],
      departure: {
        engineerId: 'eng-1',
        engineerName: 'Ada',
        sprintIndex: 4,
        warningsShown: 1,
        crunchSprints: 3,
        fastBurnout: false,
      },
    });

    it('reports a failed result carrying a post-mortem', () => {
      const outcome = deriveOutcome(failed)!;
      expect(outcome.result).toBe('failed');
      expect(outcome.postMortem).toBeDefined();
    });

    it('surfaces who left and the why-trace off the departure', () => {
      const { postMortem } = deriveOutcome(failed)!;
      expect(postMortem).toMatchObject({
        engineerId: 'eng-1',
        engineerName: 'Ada',
        sprintIndex: 4,
        warningsShown: 1,
        crunchSprints: 3,
        fastBurnout: false,
      });
    });

    it('echoes only the departed engineer\'s at-risk reads from history, oldest first', () => {
      const { postMortem } = deriveOutcome(failed)!;
      expect(postMortem!.warnings).toEqual([
        { sprintIndex: 3, note: 'Ada looks fried in standup.' },
        { sprintIndex: 4, note: 'Ada is running on empty.' },
      ]);
    });

    it('includes the coincident quit-sprint warning beyond the ignored count', () => {
      const { postMortem } = deriveOutcome(failed)!;
      // warningsShown counts the ignored warnings before the quit; the echo also
      // carries the read from the quitting sprint itself — one more than warningsShown.
      expect(postMortem!.warnings).toHaveLength(postMortem!.warningsShown + 1);
    });

    it('never prints a raw burnout or morale number in the post-mortem', () => {
      const { postMortem } = deriveOutcome(failed)!;
      const text = postMortem!.warnings.map((w) => w.note).join(' ');
      expect(text).not.toMatch(/\d/); // the fuzzy rule holds even at the end
    });

    it('reports a failed run even with no departure trace, and no post-mortem', () => {
      // Defensive: the state contract guarantees a trace on a failed run, but the
      // derivation must stay total rather than throw if one is ever missing.
      const outcome = deriveOutcome(baseState({ status: 'failed' }))!;
      expect(outcome.result).toBe('failed');
      expect(outcome.postMortem).toBeUndefined();
    });
  });
});
