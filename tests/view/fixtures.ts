/**
 * Hand-built run states for the screens that only appear at the edges of a run, or after
 * a specific history. Building the state directly keeps each screen test about what the
 * screen shows — the engine's own suites already prove that play reaches these states,
 * and driving a whole run per test would only make the assertions harder to read.
 */

import {
  createRng,
  type Engineer,
  type EngineerRead,
  type GameState,
  type MoodBand,
  type ReadTrend,
  type SprintSummary,
  type Ticket,
} from '../../src/engine';

export function engineer(
  id: string,
  name: string,
  overrides: Partial<Engineer> = {},
): Engineer {
  return {
    id,
    name,
    flavor: 'keeps a very tidy backlog',
    skills: { frontend: 50, backend: 50, infra: 50, debugging: 50 },
    morale: 50,
    burnout: 30,
    assignment: null,
    ...overrides,
  };
}

export function ticket(id: string, status: Ticket['status'] = 'open'): Ticket {
  return { id, size: 3, requiredSkill: 'backend', progress: 0, status };
}

export function read(
  engineerId: string,
  mood: MoodBand,
  options: { atRisk?: boolean; note?: string; trend?: ReadTrend } = {},
): EngineerRead {
  return {
    engineerId,
    note: options.note ?? `${engineerId} reads ${mood}.`,
    atRisk: options.atRisk ?? false,
    mood,
    trend: options.trend ?? 'unknown',
    sharpened: options.trend !== undefined,
  };
}

export function summary(
  sprintIndex: number,
  reads: EngineerRead[],
  overrides: Partial<SprintSummary> = {},
): SprintSummary {
  return {
    sprintIndex,
    shipped: [],
    roadmap: { completed: 0, total: 3 },
    reads,
    ...overrides,
  };
}

/** A two-person run with a small backlog — enough board for any screen to render. */
export function runState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 1,
    rngState: createRng(1),
    sprintIndex: 0,
    runLength: 6,
    roster: [engineer('eng-1', 'Priya'), engineer('eng-2', 'Sam')],
    backlog: [ticket('tkt-1', 'done'), ticket('tkt-2'), ticket('tkt-3')],
    roadmap: { ticketIds: ['tkt-1', 'tkt-2', 'tkt-3'] },
    attention: { capacity: 3, remaining: 3 },
    manager: { reputation: 0, burnout: 0 },
    status: 'active',
    ...overrides,
  };
}

/**
 * A run lost in sprint 4 after two sprints of warnings the player was shown and did not
 * act on — the shape the post-mortem exists to explain. Priya's reads slide from steady
 * to at-risk and stay there; the leaving sprint carries a final coincident warning.
 */
export function failedRun(): GameState {
  return runState({
    status: 'failed',
    sprintIndex: 3,
    // Priya stays on the roster she quit: the run is over, and the post-mortem still
    // needs to be able to speak about her.
    history: [
      summary(0, [read('eng-1', 'steady'), read('eng-2', 'steady')]),
      summary(1, [
        read('eng-1', 'dipping', { atRisk: true, note: 'Priya seems checked out lately.' }),
        read('eng-2', 'steady'),
      ]),
      summary(2, [
        read('eng-1', 'struggling', {
          atRisk: true,
          note: 'Priya has gone quiet in standup — not the good kind of quiet. Still no better.',
        }),
        read('eng-2', 'steady'),
      ]),
      summary(3, [read('eng-2', 'steady')]),
    ],
    departure: {
      engineerId: 'eng-1',
      engineerName: 'Priya',
      sprintIndex: 3,
      warningsShown: 2,
      crunchSprints: 3,
      fastBurnout: false,
    },
  });
}

/** A run that reached its scheduled end with everyone still on the team. */
export function completedRun(): GameState {
  return runState({
    status: 'completed',
    sprintIndex: 6,
    history: [
      summary(0, [read('eng-1', 'steady'), read('eng-2', 'steady')]),
      summary(1, [read('eng-1', 'thriving'), read('eng-2', 'steady')]),
    ],
  });
}
