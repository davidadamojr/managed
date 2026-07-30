/**
 * The DOM renderer — the thinnest layer in the whole project. It does two things and
 * nothing else: turn a `ScreenView` into elements, and turn element events into store
 * dispatches. It reads no `GameState`, calls no engine function, and decides no game rule;
 * every value it shows already sits on the view model the store handed it. That is the
 * bottom of the engine/view wall — below the projection, there is only markup and event
 * wiring.
 *
 * Three screens render here. The planning screen is where a sprint is assembled; the
 * summary is the legibility surface where a sprint's consequences are read, and where a
 * decline has to become perceptible across sprints; the ending dresses a run that is over.
 * Nothing in the summary or the ending is worked out here — the notes, the bands, the
 * warnings echoed on a post-mortem all arrive already derived, verbatim, because a loss
 * only teaches if the words are the ones the player was actually shown.
 *
 * Rendering is a full rebuild on every change. With a four-person team and a small backlog
 * this is trivially fast and keeps the renderer free of diffing logic — the simplest thing
 * that shows panels, exactly what Increment 1 asks for. Interactivity is built on native
 * controls (`select`, `button`, checkbox, `progress`) so the core actions — assign, spend
 * attention, toggle crunch, resolve, advance, start a new run — are keyboard-operable
 * without any custom key handling. Focus is not preserved across the rebuild; that is
 * deferred polish, not part of the panels-and-numbers MVP.
 *
 * Nothing on any screen is presented as an error or an alarm: an exhausted pool, a run
 * behind on its roadmap, and a departure are all ordinary states of the game, and the
 * at-risk read in particular has to land as a human observation rather than a health-bar
 * warning. No styling decisions live here beyond class names for structure and tests to
 * hook. Art, theming, and animation are deferred until the raw loop is proven fun.
 */

import type { AttentionActionKind } from '../engine';
import type { RunStore } from './store';
import type {
  ScreenView,
  RunView,
  RosterCardView,
  BacklogView,
  RoadmapView,
  AttentionTrayView,
  SummaryView,
  EngineerReadView,
  OutcomeView,
  PostMortemView,
} from './viewModel';

/** Player-facing labels for the three managerial actions. */
const ATTENTION_LABELS: Readonly<Record<AttentionActionKind, string>> = {
  oneOnOne: '1:1',
  unblock: 'Unblock',
  recognize: 'Recognize',
};

/** Append a mix of nodes and text to a parent, in order. */
function setChildren(parent: Node, children: readonly (Node | string)[]): void {
  for (const child of children) {
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** A classed element with optional text and children — the one construction helper. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  content: string | readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (typeof content === 'string') node.textContent = content;
  else setChildren(node, content);
  return node;
}

/** A titled panel wrapper — the shared shell every section renders into. */
function panel(className: string, title: string, body: readonly Node[]): HTMLElement {
  return el('section', `panel ${className}`, [el('h2', 'panel-title', title), ...body]);
}

/** The assignment control: a native select of the workable tickets plus an idle option. */
function assignSelect(card: RosterCardView, view: RunView, store: RunStore): HTMLSelectElement {
  const select = el('select', 'assign-select');
  select.dataset.engineerId = card.id;
  select.setAttribute('aria-label', `Assign ${card.name}`);

  const idle = document.createElement('option');
  idle.value = '';
  idle.textContent = '— Idle —';
  select.appendChild(idle);

  for (const ticket of view.backlog.tickets) {
    const option = document.createElement('option');
    option.value = ticket.id;
    option.textContent = `${ticket.id} · ${ticket.requiredSkill} · ${ticket.size}pt`;
    select.appendChild(option);
  }
  select.value = card.assignedTicketId ?? '';

  select.addEventListener('change', () => {
    if (select.value === '') store.clearTicket(card.id);
    else store.assignTicket(card.id, select.value);
  });
  return select;
}

/** The three per-engineer attention buttons, disabled when the budget can't afford them. */
function attentionButtons(
  card: RosterCardView,
  tray: AttentionTrayView,
  store: RunStore,
): HTMLElement {
  const affordable = new Map(tray.actions.map((a) => [a.kind, a.affordable] as const));
  const buttons = tray.actions.map((action) => {
    const button = el('button', 'attn-btn', `${ATTENTION_LABELS[action.kind]} (${action.cost})`);
    button.type = 'button';
    button.dataset.kind = action.kind;
    button.dataset.engineerId = card.id;
    button.disabled = !(affordable.get(action.kind) ?? false);
    button.addEventListener('click', () => store.spend(action.kind, card.id));
    return button;
  });
  return el('div', 'attn-buttons', buttons);
}

/** One engineer card: identity, skills, the fuzzy read, assignment, and attention controls. */
function engineerCard(card: RosterCardView, view: RunView, store: RunStore): HTMLElement {
  const skills = el(
    'ul',
    'engineer-skills',
    card.skills.map((s) => el('li', 'skill', `${s.skill} ${s.proficiency}`)),
  );

  const read = el('p', `engineer-read${card.atRisk ? ' at-risk' : ''}`, card.read ?? 'No read yet.');
  if (card.atRisk) read.setAttribute('role', 'note');

  const attending =
    card.attention.length > 0
      ? [el('p', 'engineer-attention', `Attending: ${card.attention.map((k) => ATTENTION_LABELS[k]).join(', ')}`)]
      : [];

  const article = el('article', 'engineer-card', [
    el('h3', 'engineer-name', card.name),
    el('p', 'engineer-flavor', card.flavor),
    skills,
    read,
    assignSelect(card, view, store),
    attentionButtons(card, view.attention, store),
    ...attending,
  ]);
  article.dataset.engineerId = card.id;
  return article;
}

/** The roster panel: one card per engineer. */
function rosterPanel(view: RunView, store: RunStore): HTMLElement {
  return panel('roster', 'The Team', [
    el('div', 'roster-cards', view.roster.map((card) => engineerCard(card, view, store))),
  ]);
}

/** The backlog panel: the over-capacity work list, shown as-is with a plain capacity note. */
function backlogPanel(backlog: BacklogView): HTMLElement {
  const caption = el(
    'p',
    'backlog-capacity',
    `${backlog.openCount} tickets in play · team of ${backlog.teamSize}`,
  );
  const items = backlog.tickets.map((ticket) => {
    const assigned =
      ticket.assignedTo.length > 0 ? ` — ${ticket.assignedTo.join(', ')}` : '';
    const li = el('li', 'ticket', `${ticket.id} · ${ticket.requiredSkill} · ${ticket.size}pt${assigned}`);
    li.dataset.ticketId = ticket.id;
    return li;
  });
  return panel('backlog', 'The Backlog', [caption, el('ul', 'ticket-list', items)]);
}

/** The roadmap bar: engine-computed progress toward the soft goal — pressure, not a fail line. */
function roadmapPanel(roadmap: RoadmapView): HTMLElement {
  const meter = document.createElement('progress');
  meter.className = 'roadmap-meter';
  meter.max = roadmap.total;
  meter.value = roadmap.completed;
  const label = el('p', 'roadmap-progress', `Roadmap — ${roadmap.completed} / ${roadmap.total} shipped`);
  return panel('roadmap', 'The Roadmap', [label, meter]);
}

/** The attention tray: the pool as remaining/capacity, plus the legend of what it buys. */
function attentionPanel(tray: AttentionTrayView): HTMLElement {
  const pool = el('p', 'attention-pool', `Attention — ${tray.remaining} / ${tray.capacity}`);
  const legend = el(
    'ul',
    'attention-legend',
    tray.actions.map((action) => {
      const li = el('li', `attention-action${action.affordable ? '' : ' spent'}`,
        `${ATTENTION_LABELS[action.kind]} (${action.cost})`);
      li.dataset.kind = action.kind;
      return li;
    }),
  );
  const hint = el('p', 'attention-hint', 'Spend attention on an engineer’s card.');
  return panel('attention', 'Attention', [pool, legend, hint]);
}

/** The crunch toggle: the tempting per-sprint lever, as a keyboard-operable checkbox. */
function crunchPanel(view: RunView, store: RunStore): HTMLElement {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'crunch-toggle';
  checkbox.checked = view.crunch;
  checkbox.addEventListener('change', () => store.setCrunch(checkbox.checked));
  const label = el('label', 'crunch-label', [checkbox, document.createTextNode(' Crunch this sprint')]);
  return panel('crunch', 'Crunch', [label]);
}

/** The commit control. Disabled rather than hidden if a run somehow cannot tick. */
function resolvePanel(view: RunView, store: RunStore): HTMLElement {
  const button = el('button', 'resolve-btn', 'Resolve sprint');
  button.type = 'button';
  button.disabled = !view.canResolve;
  button.addEventListener('click', () => store.resolve());
  return el('section', 'panel resolve', [button]);
}

/** The shared screen header: which sprint, and what the player is looking at. */
function header(label: string, note: string): HTMLElement {
  return el('header', 'run-header', [
    el('span', 'sprint-label', label),
    el('span', 'header-note', note),
  ]);
}

/** A primary action button — the one control that carries a screen forward. */
function actionButton(className: string, label: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

/** Assemble the whole main run screen for one view. Pure structure; all logic is upstream. */
function renderRun(view: RunView, store: RunStore): HTMLElement {
  return el('div', 'run-screen', [
    header(view.label, 'Planning'),
    rosterPanel(view, store),
    backlogPanel(view.backlog),
    roadmapPanel(view.roadmap),
    attentionPanel(view.attention),
    crunchPanel(view, store),
    resolvePanel(view, store),
  ]);
}

/** What reached done this sprint, or a plain line when nothing did. */
function shippedPanel(summary: SummaryView): HTMLElement {
  if (summary.shipped.length === 0) {
    return panel('shipped', 'What Shipped', [
      el('p', 'shipped-empty', 'Nothing reached done this sprint.'),
    ]);
  }
  const items = summary.shipped.map((ticket) => {
    const li = el('li', 'shipped-ticket', `${ticket.id} · ${ticket.requiredSkill} · ${ticket.size}pt`);
    li.dataset.ticketId = ticket.id;
    return li;
  });
  return panel('shipped', 'What Shipped', [el('ul', 'shipped-list', items)]);
}

/**
 * One engineer's read: the note as the engine wrote it, plus the strip of bands they have
 * read as over the run. The strip is what makes a slide perceptible — one sprint's note
 * alone cannot show a direction, and the coupling this game is about only exists across
 * sprints.
 */
function readCard(read: EngineerReadView): HTMLElement {
  const note = el('p', `read-note${read.atRisk ? ' at-risk' : ''}`, read.note);
  // A note, not an alert: an at-risk read is an observation about a person, and marking
  // it as an alarm would turn the one piece of human writing in the MVP into a health bar.
  if (read.atRisk) note.setAttribute('role', 'note');

  const points = read.history.map((point) => {
    const li = el('li', `read-point${point.atRisk ? ' at-risk' : ''}`, `S${point.sprint} ${point.mood}`);
    li.dataset.sprint = String(point.sprint);
    li.dataset.mood = point.mood;
    return li;
  });

  const article = el('article', `read-card${read.atRisk ? ' at-risk' : ''}`, [
    el('h3', 'read-name', read.name),
    note,
    el('ol', 'read-history', points),
  ]);
  article.dataset.engineerId = read.engineerId;
  article.dataset.trend = read.trend;
  return article;
}

/** The event that surfaced this sprint, named with the people it landed on. */
function eventPanel(summary: SummaryView): HTMLElement[] {
  if (summary.event === null) return [];
  const lines = [el('p', 'event-description', summary.event.description)];
  if (summary.event.affected.length > 0) {
    lines.push(el('p', 'event-affected', `Landed on: ${summary.event.affected.join(', ')}`));
  }
  return [panel('event', 'What Else Happened', lines)];
}

/** The sprint summary screen — the run's legibility surface, read between sprints. */
function renderSummary(summary: SummaryView, store: RunStore): HTMLElement {
  const advance = actionButton(
    'advance-btn',
    summary.runEnded ? 'See how it ended' : 'Plan the next sprint',
    () => store.advance(),
  );

  return el('div', 'summary-screen', [
    header(summary.label, 'Sprint summary'),
    shippedPanel(summary),
    roadmapPanel(summary.roadmap),
    panel('reads', 'The Team', [
      el('div', 'read-cards', summary.reads.map(readCard)),
    ]),
    ...eventPanel(summary),
    el('section', 'panel advance', [advance]),
  ]);
}

/**
 * The post-mortem: who left, the trace behind it, and every warning the player was shown,
 * replayed word for word. The trace counts crunch sprints and ignored warnings — things
 * the player did and saw — and never a burnout number, so the lesson lands in the
 * manager's own observations rather than in a metric they were never given.
 */
function postMortemPanel(postMortem: PostMortemView): HTMLElement {
  const trace = el('ul', 'why-trace', [
    el('li', 'trace-crunch', `Sprints spent crunching: ${postMortem.crunchSprints}`),
    el(
      'li',
      'trace-warnings',
      `Warnings you saw with a sprint left to act on them: ${postMortem.warningsShown}`,
    ),
  ]);
  if (postMortem.fastBurnout) {
    trace.appendChild(
      el(
        'li',
        'trace-fast',
        'The slide was steep — the warning and the exit landed in the same sprint.',
      ),
    );
  }

  const echoes = el(
    'ol',
    'warning-echoes',
    postMortem.warnings.map((warning) => {
      const li = el('li', 'warning-echo', `Sprint ${warning.sprint} — ${warning.note}`);
      li.dataset.sprint = String(warning.sprint);
      return li;
    }),
  );

  return panel('post-mortem', `${postMortem.engineerName} left the team`, [
    el('p', 'departure-line', `Handed in notice at the end of Sprint ${postMortem.sprint}.`),
    trace,
    el('h3', 'echoes-title', 'What you were told'),
    echoes,
  ]);
}

/** The completion panel — plainly stated. A prototype has not earned a victory screen. */
function completionPanel(outcome: OutcomeView): HTMLElement {
  return panel('completion', 'The run is over', [
    el('p', 'completion-line', 'Everyone who started is still on the team.'),
    el('p', 'survivors', `Still here: ${outcome.survivors.join(', ')}`),
  ]);
}

/** The ending screen: the post-mortem or the plain completion, then the way to start over. */
function renderOutcome(outcome: OutcomeView, store: RunStore): HTMLElement {
  const ending =
    outcome.postMortem !== null
      ? postMortemPanel(outcome.postMortem)
      : completionPanel(outcome);

  const facts = panel('run-facts', 'The Run', [
    el('p', 'sprints-played', `Sprints played — ${outcome.sprintsPlayed} of ${outcome.runLength}`),
  ]);

  const newRun = actionButton('new-run-btn', 'Start a new run', () => store.startNewRun());

  const screen = el('div', 'outcome-screen', [
    header(outcome.label, outcome.result === 'completed' ? 'Run complete' : 'Run over'),
    ending,
    facts,
    roadmapPanel(outcome.roadmap),
    el('section', 'panel new-run', [newRun]),
  ]);
  screen.dataset.result = outcome.result;
  return screen;
}

/** Render whichever screen the store is showing. */
function renderScreen(view: ScreenView, store: RunStore): HTMLElement {
  switch (view.screen) {
    case 'planning':
      return renderRun(view.run, store);
    case 'summary':
      return renderSummary(view.summary, store);
    case 'ended':
      return renderOutcome(view.outcome, store);
  }
}

/**
 * Mount the run into a container and keep it in sync with the store. Renders once
 * immediately, then re-renders on every store notification. Returns a teardown that
 * unsubscribes — the caller owns the container's lifetime.
 */
export function mount(container: HTMLElement, store: RunStore): () => void {
  const render = (view: ScreenView): void => {
    container.replaceChildren(renderScreen(view, store));
  };
  render(store.view());
  return store.subscribe(render);
}
