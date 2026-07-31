// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { newRun } from '../../src/engine';
import { saveRun } from '../../src/persistence';

const SEED = 20260728;

/** Run the composition root against the current document and storage, from scratch. */
async function boot(): Promise<HTMLElement> {
  document.body.innerHTML = '<main id="app"></main>';
  vi.resetModules(); // the root does its work on import, so a fresh boot needs a fresh module
  await import('../../src/view/main');
  return document.getElementById('app')!;
}

describe('composition-root smoke', () => {
  it('opens a brand-new browser on the framing, one action from a playable run', async () => {
    window.localStorage.clear();
    const app = await boot();

    expect(app.querySelector('.framing-screen')).not.toBeNull();
    app.querySelector<HTMLButtonElement>('.start-btn')!.click();

    expect(app.querySelector('.run-screen')).not.toBeNull();
    expect(app.querySelectorAll('.engineer-card').length).toBeGreaterThan(0);
    // A brand-new run was saved immediately, so it is resumable from sprint 0.
    expect(window.localStorage.getItem('managed:run')).not.toBeNull();
  });

  it('takes a player who has been here before straight back to the run', async () => {
    window.localStorage.clear();
    saveRun(window.localStorage, newRun(SEED));
    const app = await boot();

    expect(app.querySelector('.framing-screen')).toBeNull();
    expect(app.querySelector('.run-screen')).not.toBeNull();
  });
});
