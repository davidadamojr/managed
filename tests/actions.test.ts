import { describe, it, expect } from 'vitest';
import {
  newRun,
  emptyActions,
  assign,
  clearAssignment,
  assignmentFor,
  setCrunch,
  toggleCrunch,
  idleEngineerIds,
  validateActions,
  type SprintActions,
  type Engineer,
  type Ticket,
  type GameState,
  type SkillProficiencies,
} from '../src/engine';
import { listSkills, type Skill } from '../src/content';

// ---- fixtures -------------------------------------------------------------
// `validateActions` and `idleEngineerIds` read only roster/backlog ids, so a real
// run is enough for most tests. Poor-fit is the exception: it asserts a genuinely
// weak engineer, so those tests build a controlled roster/backlog on top of a real
// run (keeping every other field valid and coherent).

/** All four skills at `base`, then apply overrides — a total map with controlled holes. */
function skillsWith(
  base: number,
  overrides: Partial<Record<Skill, number>>,
): SkillProficiencies {
  const map = {} as Record<Skill, number>;
  for (const s of listSkills()) map[s] = overrides[s] ?? base;
  return map;
}

function engineer(id: string, skills: SkillProficiencies): Engineer {
  return { id, name: id, flavor: 'vibe', skills, morale: 50, burnout: 10, assignment: null };
}

function ticket(id: string, requiredSkill: Skill): Ticket {
  return { id, size: 5, requiredSkill, progress: 0, status: 'open' };
}

/** A real, complete GameState with a controlled roster and backlog. */
function stateWith(roster: readonly Engineer[], backlog: readonly Ticket[]): GameState {
  return { ...newRun(1), roster, backlog, roadmap: { ticketIds: [] } };
}

describe('SprintActions — plan building is pure and immutable', () => {
  it('starts empty: nobody assigned, no crunch', () => {
    const a = emptyActions();
    expect(a.assignments).toEqual({});
    expect(a.crunch).toBe(false);
  });

  it('assigns an engineer to a ticket without mutating the prior plan', () => {
    const before = emptyActions();
    const after = assign(before, 'eng-1', 'tkt-1');

    expect(assignmentFor(after, 'eng-1')).toBe('tkt-1');
    // The original is untouched — no shared mutable reference.
    expect(assignmentFor(before, 'eng-1')).toBeNull();
    expect(before.assignments).toEqual({});
    expect(after).not.toBe(before);
    expect(after.assignments).not.toBe(before.assignments);
  });

  it('replaces a prior assignment — one ticket per engineer this increment', () => {
    const plan = assign(assign(emptyActions(), 'eng-1', 'tkt-1'), 'eng-1', 'tkt-2');
    expect(assignmentFor(plan, 'eng-1')).toBe('tkt-2');
    expect(Object.keys(plan.assignments)).toEqual(['eng-1']);
  });
});

describe('SprintActions — idle is legal and representable', () => {
  it('reports an unassigned engineer as idle', () => {
    expect(assignmentFor(emptyActions(), 'eng-9')).toBeNull();
  });

  it('clears an assignment back to idle, immutably', () => {
    const assigned = assign(emptyActions(), 'eng-1', 'tkt-1');
    const cleared = clearAssignment(assigned, 'eng-1');

    expect(assignmentFor(cleared, 'eng-1')).toBeNull();
    expect(assignmentFor(assigned, 'eng-1')).toBe('tkt-1'); // original untouched
    expect(cleared).not.toBe(assigned);
  });

  it('treats clearing an already-idle engineer as a harmless no-op returning a new plan', () => {
    const before = emptyActions();
    const after = clearAssignment(before, 'eng-1');
    expect(after.assignments).toEqual({});
    expect(after).not.toBe(before);
  });
});

describe('SprintActions — crunch is one team-wide toggle that serializes', () => {
  it('defaults off, and sets and toggles immutably', () => {
    const off = emptyActions();
    const on = setCrunch(off, true);

    expect(off.crunch).toBe(false);
    expect(on.crunch).toBe(true);
    expect(off.crunch).toBe(false); // set did not mutate the input
    expect(toggleCrunch(on).crunch).toBe(false);
    expect(toggleCrunch(off).crunch).toBe(true);
  });

  it('round-trips through JSON with the assignments — part of deterministic replay', () => {
    const plan = setCrunch(assign(emptyActions(), 'eng-1', 'tkt-1'), true);
    const round = JSON.parse(JSON.stringify(plan)) as SprintActions;

    expect(round).toEqual(plan);
    expect(round.crunch).toBe(true);
    expect(round.assignments).toEqual({ 'eng-1': 'tkt-1' });
  });
});

describe('validateActions — permissive; rejects only impossible references', () => {
  it('accepts a poor-fit assignment (zero proficiency in the required skill)', () => {
    const weak = engineer('eng-1', skillsWith(70, { backend: 0 }));
    const state = stateWith([weak], [ticket('tkt-1', 'backend')]);
    const plan = assign(emptyActions(), 'eng-1', 'tkt-1');

    // The engineer is genuinely weak at the ticket's skill...
    expect(weak.skills.backend).toBe(0);
    // ...and the plan is still legal. Fit is a resolution cost, not a legality gate.
    expect(validateActions(state, plan)).toEqual({ ok: true, problems: [] });
  });

  it('rejects an assignment to a non-existent ticket, cleanly', () => {
    const state = stateWith(
      [engineer('eng-1', skillsWith(50, {}))],
      [ticket('tkt-1', 'backend')],
    );
    const result = validateActions(state, assign(emptyActions(), 'eng-1', 'ghost'));

    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      { kind: 'unknown-ticket', engineerId: 'eng-1', ticketId: 'ghost' },
    ]);
  });

  it('rejects an assignment naming a non-existent engineer', () => {
    const state = stateWith(
      [engineer('eng-1', skillsWith(50, {}))],
      [ticket('tkt-1', 'backend')],
    );
    const result = validateActions(state, assign(emptyActions(), 'ghost', 'tkt-1'));

    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      { kind: 'unknown-engineer', engineerId: 'ghost', ticketId: 'tkt-1' },
    ]);
  });

  it('accepts an empty plan, with or without crunch', () => {
    const state = stateWith(
      [engineer('eng-1', skillsWith(50, {}))],
      [ticket('tkt-1', 'backend')],
    );
    expect(validateActions(state, emptyActions()).ok).toBe(true);
    expect(validateActions(state, setCrunch(emptyActions(), true)).ok).toBe(true);
  });
});

describe('over-capacity juggle — never balanced, never blocked, always surfaced', () => {
  const state = newRun(42);
  const firstTicket = state.backlog[0]!.id;

  it('assigns every engineer without auto-balancing or blocking', () => {
    let plan = emptyActions();
    for (const e of state.roster) plan = assign(plan, e.id, firstTicket);

    // Whole team piled onto one ticket (co-assignment) — kept as written, not rebalanced.
    expect(Object.keys(plan.assignments)).toHaveLength(state.roster.length);
    expect(validateActions(state, plan).ok).toBe(true);
    expect(idleEngineerIds(state, plan)).toEqual([]);
  });

  it('leaves an under-served backlog and idle engineers representable, not corrected', () => {
    const plan = assign(emptyActions(), state.roster[0]!.id, firstTicket);

    // One engineer works; the rest sit idle; the backlog dwarfs capacity — all legal.
    expect(idleEngineerIds(state, plan)).toEqual(state.roster.slice(1).map((e) => e.id));
    expect(validateActions(state, plan).ok).toBe(true);
    expect(state.backlog.length).toBeGreaterThan(state.roster.length); // the shortfall is real
  });

  it('allows two engineers to share one ticket (allow-but-punish, resolved later)', () => {
    const a = state.roster[0]!;
    const b = state.roster[1]!;
    const plan = assign(assign(emptyActions(), a.id, firstTicket), b.id, firstTicket);

    expect(assignmentFor(plan, a.id)).toBe(firstTicket);
    expect(assignmentFor(plan, b.id)).toBe(firstTicket);
    expect(validateActions(state, plan).ok).toBe(true);
  });
});
