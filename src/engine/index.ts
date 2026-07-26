/**
 * Layer 1 — engine barrel. The single import surface for the pure simulation core:
 * the RNG spine, the serializable entities and their derivations, and the
 * `GameState` root. Downstream layers import from here so internal file layout can
 * change without churning call sites.
 */

export {
  createRng,
  nextUint32,
  nextFloat,
  nextInt,
  type RngState,
  type Draw,
} from './rng';

export {
  ATTRIBUTE_MIN,
  ATTRIBUTE_MAX,
  clampAttribute,
  roadmapProgress,
  attentionCapacityFor,
  type SkillProficiencies,
  type Assignment,
  type EngineerFlags,
  type Engineer,
  type TicketStatus,
  type Ticket,
  type Roadmap,
  type RoadmapProgress,
  type ManagerState,
  type AttentionPool,
} from './entities';

export {
  type EngineerRead,
  type SprintEventReport,
  type SprintSummary,
} from './summary';

export { type RunStatus, type GameState } from './state';

export {
  emptyActions,
  assign,
  clearAssignment,
  assignmentFor,
  setCrunch,
  toggleCrunch,
  idleEngineerIds,
  validateActions,
  type SprintActions,
  type AttentionActionKind,
  type AttentionAction,
  type AssignmentProblem,
  type ActionValidation,
} from './actions';

export {
  attentionActionCost,
  attentionSpent,
  freshAttentionPool,
  attentionRemaining,
  currentAttentionPool,
  canAffordAttention,
  spendAttention,
  type AttentionSpend,
} from './attention';

export {
  moraleDelta,
  burnoutDelta,
  applyPeopleResponse,
  moraleThroughputMultiplier,
  type Workload,
  type SprintExperience,
  type PeopleState,
} from './people';

export { newRun } from './newRun';
