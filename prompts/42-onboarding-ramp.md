# 42 — [Inc 5 · MVP] Onboarding Drag & Ramp State

> ⚠ **VALIDATE-FIRST.** Ramp curve and onboarding-drag magnitude are **decisions-to-validate**: a new hire being net-negative-before-net-positive is *non-negotiable to the thesis* (PRD §I5.5), but the exact curve tunes against the run economy. Over-hiring into simultaneous onboarding must be a real failure mode the player can create (PRD §I5.2).

## Context
Hires land after a lag (41). But a new hire must not be instantly productive — that would erase the pain that makes prevention valuable. This prompt adds **onboarding drag + a ramp state**: a new hire initially *reduces* net team capacity and only crosses into net-positive after several sprints.

Read PRD §I5.2 (onboarding drag), §I5.3 (Engineer changed — ramp state), §I5.5 (ramp non-negotiable), and `CLAUDE.md` §12 (I-8).

## User Story
As a manager, I want new hires to add onboarding load before they add capacity, so that backfilling in a crisis makes the near-term worse before it makes it better — the true texture of the job. `[MVP-of-increment]`

## Acceptance Criteria
- [ ] `Engineer` gains a **ramp state** (onboarding → ramping → full) modulating early throughput; new hires enter at **onboarding** (PRD §I5.3).
- [ ] **A new hire initially reduces net team capacity** (they need ramp support and produce little), crossing into net-positive only after several sprints (PRD §I5.2).
- [ ] **Onboarding load can be assigned to a mentor** (PRD §I5.2) — couples to Increment 4 growth/relationships (a mentor pairing speeds ramp, at the mentor's throughput cost).
- [ ] **Over-hiring is a real failure mode:** a team drowning in simultaneous onboarding is a state the player can create and suffer for (PRD §I5.2).
- [ ] Ramp curve + onboarding-drag magnitude read from tuning constants (I-6); deterministic (I-4).

## Technical Specs
- Ramp modulates the engineer's effective throughput in the tick (reuse the throughput composition), transitioning stages over sprints.
- Mentor assignment reuses the Inc-4 mentorship/relationship mechanic — onboarding is a coupling, not a new subsystem (I-8).
- The net-negative-first property is a hard invariant with a test.

## Testing
Unit:
- A new hire is net-negative in early sprints, crossing to net-positive only after the ramp period.
- Assigning a mentor speeds ramp at the mentor's throughput cost (couples to Inc 4).
- Over-hiring (multiple simultaneous onboardings) measurably drags the whole team — a creatable failure mode.
- Ramp curve reads from constants; determinism holds.

Manual verification checklist:
- [ ] Backfill in a crisis: the near-term gets worse before better; the new person is a drag before a gain.
- [ ] `npm test` green; prior harness bars green.

## Out of Scope
- Hiring/ramp UI — prompt 43.
- Prevention-vs-recovery tuning + integration — prompt 44.
