/**
 * LinkedIn Analytics Scraper — parallel orchestrator.
 *
 * Spins up three independent Playwright browser sessions simultaneously,
 * one per analytics page, then combines results into a single object.
 *
 * A failure in any one scraper does NOT abort the others — errors are
 * collected in result.errors.
 */

import { scrapeAudienceAnalytics } from './audience-analytics.js';
import { injectCookies, loadCookies } from './auth.js';
import { createBrowserSession } from './browser.js';
import { scrapeContentAnalytics } from './content-analytics.js';
import { scrapeDemographicAnalytics } from './demographic-analytics.js';
import type { LinkedInAnalyticsResult } from './types.js';

export type { LinkedInAnalyticsResult } from './types.js';

/**
 * Scrape all LinkedIn analytics pages in parallel and return a combined result.
 *
 * Each scraper gets its own independent Playwright browser session so they
 * can navigate to different URLs simultaneously.
 *
 * @param cookiePath - Path to the session_cookies.json file
 * @param headless   - Set to false to watch the browsers (for debugging)
 */
export async function scrapeLinkedInAnalytics(
  cookiePath = './data/session_cookies.json',
  headless = true
): Promise<LinkedInAnalyticsResult> {
  // Load and validate cookies once — fail fast if missing
  const cookies = loadCookies(cookiePath);

  console.log('[Scraper] Launching 3 parallel Playwright sessions…');

  const [contentResult, audienceResult, demographicsResult] = await Promise.allSettled([
    // Session 1: content analytics
    (async () => {
      const session = await createBrowserSession(headless);
      try {
        await injectCookies(session.context, cookies);
        return await scrapeContentAnalytics(session.page);
      } finally {
        await session.close();
      }
    })(),

    // Session 2: audience analytics
    (async () => {
      const session = await createBrowserSession(headless);
      try {
        await injectCookies(session.context, cookies);
        return await scrapeAudienceAnalytics(session.page);
      } finally {
        await session.close();
      }
    })(),

    // Session 3: demographic analytics
    (async () => {
      const session = await createBrowserSession(headless);
      try {
        await injectCookies(session.context, cookies);
        return await scrapeDemographicAnalytics(session.page);
      } finally {
        await session.close();
      }
    })(),
  ]);

  const errors: string[] = [];

  if (contentResult.status === 'rejected') {
    errors.push(`content: ${String(contentResult.reason)}`);
  }
  if (audienceResult.status === 'rejected') {
    errors.push(`audience: ${String(audienceResult.reason)}`);
  }
  if (demographicsResult.status === 'rejected') {
    errors.push(`demographics: ${String(demographicsResult.reason)}`);
  }

  return {
    content: contentResult.status === 'fulfilled' ? contentResult.value : null,
    audience: audienceResult.status === 'fulfilled' ? audienceResult.value : null,
    demographics: demographicsResult.status === 'fulfilled' ? demographicsResult.value : null,
    scrapedAt: new Date().toISOString(),
    errors,
  };
}
