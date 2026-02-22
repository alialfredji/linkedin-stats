import { describe, expect, it } from 'vitest';

// humanDelay and isBlocked can be tested without a real browser.
// createBrowserSession launches Chromium, so we test it in isolation
// (a full e2e test would require a running browser; skip here).

import { humanDelay } from './browser.js';

describe('humanDelay', () => {
  it('resolves within the expected range (+50ms tolerance)', async () => {
    const TOLERANCE_MS = 50;
    const MIN = 100;
    const MAX = 300;

    const start = Date.now();
    await humanDelay(MIN, MAX);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(MIN - TOLERANCE_MS);
    expect(elapsed).toBeLessThanOrEqual(MAX + TOLERANCE_MS);
  });

  it('uses sensible defaults (300ms – 1500ms)', async () => {
    const TOLERANCE_MS = 50;
    const start = Date.now();
    await humanDelay();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(300 - TOLERANCE_MS);
    expect(elapsed).toBeLessThanOrEqual(1500 + TOLERANCE_MS);
  });
});
