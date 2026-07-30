/**
 * Narrowing helpers for the store's tagged `ScreenView`. A test asserts against one
 * screen at a time; these turn "the run was showing a different screen" into a named
 * failure rather than a property-access crash three lines later.
 */

import type {
  ScreenView,
  RunView,
  SummaryView,
  OutcomeView,
} from '../../src/view/viewModel';

function expectScreen<K extends ScreenView['screen']>(
  view: ScreenView,
  screen: K,
): Extract<ScreenView, { screen: K }> {
  if (view.screen !== screen) {
    throw new Error(`expected the ${screen} screen, saw ${view.screen}`);
  }
  return view as Extract<ScreenView, { screen: K }>;
}

export function planningScreen(view: ScreenView): RunView {
  return expectScreen(view, 'planning').run;
}

export function summaryScreen(view: ScreenView): SummaryView {
  return expectScreen(view, 'summary').summary;
}

export function endedScreen(view: ScreenView): OutcomeView {
  return expectScreen(view, 'ended').outcome;
}
