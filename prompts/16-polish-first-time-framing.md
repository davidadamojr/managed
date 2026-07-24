# 16 — [polish] First-Time Framing Screen & In-Context Labels

## Context
The game is fully playable and its guarantees are hardened (13–15). This polish prompt adds the **first-time experience** (PRD §7): a single framing line that sets the goal, and in-context labels — but **no tutorial**, because the audience is fluent (experienced engineers/EMs who've played Football Manager / Dwarf Fortress). The whole surface is legible text; the framing just points the player at the goal and lets the first sprint's summary teach the loop.

Read PRD §7 (first-time experience, repeat loop) and `CLAUDE.md` §8 (tone).

## User Story
As a brand-new player, I land directly in a run with a one-line framing of the goal and self-explanatory labels, so that I understand what I'm doing without a tutorial maze.

## Acceptance Criteria
- [ ] A **one-screen framing line** sets the goal in the game's voice — e.g. "You run this team. There's more work than people. Don't lose anyone." (wry, grounded, §8). Exact copy is tunable; keep it to a line or two.
- [ ] The player **lands directly in a run** — no account, no menu maze (PRD §7). New-run is one action away.
- [ ] **In-context labels** on the named UI vocabulary (Roster, Backlog, Roadmap Bar, Attention Tray, Crunch Toggle, Resolve, Sprint Summary) make the surface self-explanatory — labels, not a walkthrough.
- [ ] **No tutorial** beyond in-context labels and the framing line (PRD §7). The first sprint's summary is what teaches the feedback loop.
- [ ] The framing screen is skippable/dismissible and does not reappear intrusively; a returning player gets to a run fast (the retry motive is "I lost Priya last time; this time I'll read the warnings earlier," PRD §7).
- [ ] Empty/first states are self-explanatory because the surface is legible text (first-sprint summary shows state without trend — already handled in prompt 10/14).

## Technical Specs
- View-only, thin (§4) — the framing screen dispatches "start new run" and reads nothing it shouldn't.
- Framing/label copy lives with content where reasonable so tone can be tuned without code edits (§6, §8).
- Desktop evergreen, keyboard-operable, legible/contrasted (§8 minimum bar). No mobile.
- Do not add engagement/retention scaffolding (PRD §9 — no funnels, this is a passion project).

## Testing
Component tests:
- Framing line renders and start-new-run dispatches from it.
- Labels appear on each named UI element.
- No multi-step tutorial exists (assert the flow is framing → run, not framing → steps → run).
- Framing is dismissible and doesn't block returning to play.

Manual verification checklist:
- [ ] A first-time player reaches a playable run in one action after the framing line.
- [ ] The surface reads as self-explanatory to someone fluent in the genre, with no tutorial.
- [ ] Keyboard-only entry into a run works.
- [ ] `npm test` green.

## Out of Scope
- Any onboarding beyond one framing line + labels (explicitly no tutorial).
- Menus, settings, profiles — not in Increment 1.
- Art/theming — deferred.
