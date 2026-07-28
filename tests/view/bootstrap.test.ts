// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

describe('composition-root smoke', () => {
  it('bootstraps the run screen into #app and persists a resumable run', async () => {
    document.body.innerHTML = '<main id="app"></main>';
    window.localStorage.clear();

    await import('../../src/view/main');

    const app = document.getElementById('app')!;
    expect(app.querySelector('.run-screen')).not.toBeNull();
    expect(app.querySelectorAll('.engineer-card').length).toBeGreaterThan(0);
    // A brand-new run was saved immediately, so it is resumable from sprint 0.
    expect(window.localStorage.getItem('managed:run')).not.toBeNull();
  });
});
