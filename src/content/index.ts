/**
 * Layer 2 — content/data barrel.
 *
 * The engine imports game content and tuning from here. This is the single seam
 * between logic and data: if content ever moves to JSON files or varies by
 * scenario, only these accessors change, not their call sites.
 */

export { listSkills, isSkill, type Skill } from './skills';
export { listNames, type EngineerName } from './names';
export {
  listEvents,
  type GameEvent,
  type EventTrigger,
  type EventEffect,
  type EventEffectTarget,
  type EventEffectAttribute,
} from './events';
export { listAtRiskWarnings } from './reads';
export { getTuning, type TuningConstants } from './tuning';
