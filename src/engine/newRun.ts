/**
 * Seeded construction of a fresh run. Given only a seed, `newRun` deterministically
 * builds a complete, playable starting `GameState`: a small fixed team, a backlog
 * deliberately larger than the team can clear, and a soft roadmap to steer toward.
 *
 * It is pure — no globals, no I/O, no clock. Every random choice is drawn from the
 * seeded RNG that then travels inside the returned state, so the same seed always
 * yields identical state and the first tick continues the very same stream.
 *
 * Construction only sets the board. No rule fires here: nobody is assigned, no
 * attention is spent, no morale or burnout moves. Those are later systems.
 */

import { createRng, nextInt, type RngState } from './rng';
import {
  type Engineer,
  type SkillProficiencies,
  type Ticket,
  type Roadmap,
  type ManagerState,
} from './entities';
import { freshAttentionPool } from './attention';
import type { GameState } from './state';
import { getTuning, listNames, listSkills, type Skill } from '../content';

/**
 * A local, sequential reader over the seeded RNG. It threads `RngState` internally
 * so construction can read like a recipe instead of hand-passing state through every
 * loop. This is a cursor over local state — not a global and not nondeterminism: the
 * draw order is fixed, so the sequence is fully reproducible, and the final `state`
 * is handed back to be stored in `GameState`.
 */
function makeDrawer(seed: number) {
  let state = createRng(seed);
  return {
    /** An integer in [min, max], inclusive on both ends. */
    intInclusive(min: number, max: number): number {
      const draw = nextInt(state, min, max + 1);
      state = draw.next;
      return draw.value;
    },
    get state(): RngState {
      return state;
    },
  };
}

type Drawer = ReturnType<typeof makeDrawer>;

/**
 * A partial Fisher–Yates: draw `count` distinct indices from [0, poolSize) in
 * seeded order. Used to pick a roster from the name pool and a roadmap from the
 * backlog without ever selecting the same item twice. `count` is clamped to the
 * pool so an over-large request degrades to "take all" rather than reading past it.
 */
function sampleIndices(draw: Drawer, count: number, poolSize: number): number[] {
  const take = Math.min(count, poolSize);
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = 0; i < take; i += 1) {
    const j = draw.intInclusive(i, poolSize - 1);
    const swapped = pool[j]!;
    pool[j] = pool[i]!;
    pool[i] = swapped;
  }
  return pool.slice(0, take);
}

/**
 * One engineer's proficiency across all four skills: a single seeded primary strength
 * in the strong band, and the rest in a lower spread that may reach zero. Every skill
 * key is always present, so fit logic never has to handle a missing one.
 */
function drawSkills(draw: Drawer): SkillProficiencies {
  const { roster } = getTuning();
  const skills = listSkills();
  const primaryIndex = draw.intInclusive(0, skills.length - 1);
  const proficiencies = {} as Record<Skill, number>;
  skills.forEach((skill, index) => {
    proficiencies[skill] =
      index === primaryIndex
        ? draw.intInclusive(roster.primarySkillMin, roster.primarySkillMax)
        : draw.intInclusive(roster.secondarySkillMin, roster.secondarySkillMax);
  });
  return proficiencies;
}

/** Draw a fixed-size team of distinct names, each fresh and unassigned. */
function buildRoster(draw: Drawer): Engineer[] {
  const { run, roster } = getTuning();
  const names = listNames();
  const chosen = sampleIndices(draw, run.teamSize, names.length);
  return chosen.map((nameIndex, i) => {
    const picked = names[nameIndex]!;
    return {
      id: `eng-${i + 1}`,
      name: picked.name,
      flavor: picked.vibe,
      skills: drawSkills(draw),
      morale: roster.startingMorale,
      burnout: roster.startingBurnout,
      assignment: null,
    };
  });
}

/**
 * Build the over-capacity backlog. Its size is `overCapacityRatio` times the team's
 * rough whole-run throughput (a proxy of ~one ticket per engineer per sprint), so it
 * stays larger than the team can ever clear — the scarcity is deliberate and is never
 * balanced down to fit. Real throughput is a resolution concern, not construction's.
 */
function buildBacklog(draw: Drawer): Ticket[] {
  const { run, backlog } = getTuning();
  const skills = listSkills();
  const perRunCapacity = run.teamSize * run.sprints;
  const size = Math.ceil(backlog.overCapacityRatio * perRunCapacity);
  const tickets: Ticket[] = [];
  for (let i = 0; i < size; i += 1) {
    const skillIndex = draw.intInclusive(0, skills.length - 1);
    tickets.push({
      id: `tkt-${i + 1}`,
      size: draw.intInclusive(backlog.ticketSizeMin, backlog.ticketSizeMax),
      requiredSkill: skills[skillIndex]!,
      progress: 0,
      status: 'open',
    });
  }
  return tickets;
}

/** Designate a distinct subset of the backlog as the soft roadmap goal. */
function buildRoadmap(draw: Drawer, backlog: readonly Ticket[]): Roadmap {
  const { roadmap } = getTuning();
  const picks = sampleIndices(draw, roadmap.size, backlog.length);
  return { ticketIds: picks.map((i) => backlog[i]!.id) };
}

/**
 * Construct a fresh, active run from a seed. Draw order is fixed (roster, then
 * backlog, then roadmap) so the same seed reproduces the same board; the RNG is left
 * at a well-defined position for the first tick to continue from.
 */
export function newRun(seed: number): GameState {
  const { run } = getTuning();
  const draw = makeDrawer(seed);

  const roster = buildRoster(draw);
  const backlog = buildBacklog(draw);
  const roadmap = buildRoadmap(draw, backlog);

  const manager: ManagerState = { reputation: 0, burnout: 0 };

  return {
    // `createRng` normalizes the seed to uint32; read it back so the stored identity
    // and the live RNG seed are guaranteed to match.
    seed: draw.state.seed,
    rngState: draw.state,
    sprintIndex: 0,
    runLength: run.sprints,
    roster,
    backlog,
    roadmap,
    // The starting sprint's pool comes from the same refresh every later sprint uses,
    // so a run begins with a full pool and no code path invents a capacity literal.
    attention: freshAttentionPool(manager),
    manager,
    status: 'active',
  };
}
