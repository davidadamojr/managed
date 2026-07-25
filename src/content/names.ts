/**
 * The engineer name pool. New-run construction draws a small roster from this
 * list; the pool is deliberately larger than any roster so the seeded draw has
 * real variety across runs.
 *
 * The `vibe` is the only prose the MVP carries. It is flavor, not mechanics —
 * nothing in the engine keys off it — but it is where the game first sounds
 * like it was written by someone who has done the job: wry, grounded, the humor
 * of recognition.
 */

export interface EngineerName {
  readonly name: string;
  readonly vibe: string;
}

const NAMES: readonly EngineerName[] = [
  { name: 'Priya Nair', vibe: 'Ships quietly, reviews everything, never takes credit in standup.' },
  { name: 'Marcus Bell', vibe: 'Has opinions about tabs versus spaces and will share them unprompted.' },
  { name: 'Dani Okonkwo', vibe: 'Fastest hands on the team; leaves TODOs like breadcrumbs.' },
  { name: 'Sam Whitfield', vibe: 'Reads the docs. Actually reads the docs. It is unsettling.' },
  { name: 'Yuki Tanaka', vibe: 'Calm in an incident, quietly furious about the flaky test suite.' },
  { name: 'Rosa Álvarez', vibe: 'Turns vague tickets into shipped features and asks for nothing.' },
  { name: 'Theo Brandt', vibe: 'Loves a refactor. Sometimes the refactor loves him back.' },
  { name: 'Nadia Hassan', vibe: 'Mentors without being asked; the glue no burndown chart can see.' },
  { name: 'Kelvin Osei', vibe: 'Great in a crunch, which is exactly the problem.' },
  { name: 'Iris Lindqvist', vibe: 'Estimates in ranges, hits them, and finds this unremarkable.' },
];

/** The engineer name pool. Read-only by contract. */
export function listNames(): readonly EngineerName[] {
  return NAMES;
}
