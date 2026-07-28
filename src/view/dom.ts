/**
 * The DOM renderer — the thinnest layer in the whole project. It does two things and
 * nothing else: turn a `RunView` into elements, and turn element events into store
 * dispatches. It reads no `GameState`, calls no engine function, and decides no game rule;
 * every value it shows already sits on the `RunView` the store handed it. That is the
 * bottom of the engine/view wall — below the projection, there is only markup and event
 * wiring.
 *
 * Rendering is a full rebuild on every change. With a four-person team and a small backlog
 * this is trivially fast and keeps the renderer free of diffing logic — the simplest thing
 * that shows panels, exactly what Increment 1 asks for. Interactivity is built on native
 * controls (`select`, `button`, checkbox, `progress`) so the core actions — assign, spend
 * attention, toggle crunch, resolve — are keyboard-operable without any custom key
 * handling. Focus is not preserved across the rebuild; that is deferred polish, not part of
 * the panels-and-numbers MVP.
 *
 * No styling decisions live here beyond class names for structure and tests to hook. Art,
 * theming, and animation are deferred until the raw loop is proven fun.
 */

import type { AttentionActionKind } from '../engine';
import type { RunStore } from './store';
import type {
  RunView,
  RosterCardView,
  BacklogView,
  RoadmapView,
  AttentionTrayView,
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

/** The commit control, or a plain terminal notice once the run has ended. */
function resolvePanel(view: RunView, store: RunStore): HTMLElement {
  if (!view.canResolve) {
    const message =
      view.status === 'completed'
        ? 'The run is complete — the team made it through.'
        : 'The run ended — someone left the team.';
    return el('section', 'panel resolve', [el('p', 'run-ended', message)]);
  }
  const button = el('button', 'resolve-btn', 'Resolve sprint');
  button.type = 'button';
  button.addEventListener('click', () => store.resolve());
  return el('section', 'panel resolve', [button]);
}

/** The run header: which sprint, and the run's status. */
function header(view: RunView): HTMLElement {
  return el('header', 'run-header', [
    el('span', 'sprint-label', view.label),
    el('span', 'run-status', view.status),
  ]);
}

/** Assemble the whole main run screen for one view. Pure structure; all logic is upstream. */
function renderRun(view: RunView, store: RunStore): HTMLElement {
  return el('div', 'run-screen', [
    header(view),
    rosterPanel(view, store),
    backlogPanel(view.backlog),
    roadmapPanel(view.roadmap),
    attentionPanel(view.attention),
    crunchPanel(view, store),
    resolvePanel(view, store),
  ]);
}

/**
 * Mount the run screen into a container and keep it in sync with the store. Renders once
 * immediately, then re-renders on every store notification. Returns a teardown that
 * unsubscribes — the caller owns the container's lifetime.
 */
export function mount(container: HTMLElement, store: RunStore): () => void {
  const render = (view: RunView): void => {
    container.replaceChildren(renderRun(view, store));
  };
  render(store.view());
  return store.subscribe(render);
}
