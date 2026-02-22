/**
 * Hook App feature: LinkedIn Analytics.
 *
 * On $START_FEATURE:
 *   1. Triggers $RUN_AUTH so linkedin-auth validates/restores the session
 *   2. Runs the parallel LinkedIn analytics scraper
 *   3. Persists results to ./data/analytics-data.json
 *   4. Emits linkedin-analytics-complete hook (consumed by dashboard-generator)
 *
 * Configuration (via getConfig):
 *   linkedin.cookiePath  - path to session_cookies.json (default: './data/session_cookies.json')
 *   linkedin.headless    - whether to run browsers headless (default: true)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { RegisterContext } from 'hook-app';

import type { LinkedInAnalyticsResult } from '../../features/linkedin-scraper/index.js';
import { scrapeLinkedInAnalytics } from '../../features/linkedin-scraper/index.js';

const FEATURE_NAME = 'linkedin-analytics';
const OUTPUT_PATH = './data/analytics-data.json';

const hooks = {
  ANALYTICS_COMPLETE: 'linkedin-analytics-complete',
  RUN_AUTH: 'linkedin-auth-run',
};

export default ({ registerAction, registerHook }: RegisterContext) => {
  registerHook(hooks);

  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[LinkedIn Analytics] Initializing feature');
    },
  });

  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: async ({ getConfig, createHook }: RegisterContext) => {
      const cookiePath = getConfig<string>('linkedin.cookiePath', './data/session_cookies.json');
      const headless = getConfig<boolean>('linkedin.headless', true);

      // Trigger auth first so cookies are valid before scraping
      await createHook.serie(hooks.RUN_AUTH);

      console.log('[LinkedIn Analytics] Starting parallel scrape…');

      let result: LinkedInAnalyticsResult;
      try {
        result = await scrapeLinkedInAnalytics(cookiePath, headless);
      } catch (err) {
        console.error('[LinkedIn Analytics] Fatal error during scrape:', err);
        return;
      }

      // Persist to disk
      mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
      writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`[LinkedIn Analytics] Data saved to ${OUTPUT_PATH}`);

      printSummary(result);

      // Emit hook so dashboard-generator can consume the data
      createHook.sync(hooks.ANALYTICS_COMPLETE, { result });
    },
  });
};

function printSummary(result: LinkedInAnalyticsResult): void {
  console.log(`\n╔════ LinkedIn Analytics — ${result.scrapedAt} ════`);

  if (result.content) {
    const c = result.content;
    console.log(
      `║  Content   │ Impressions: ${c.totalImpressions.toLocaleString()} │ Engagements: ${c.totalEngagements.toLocaleString()} │ Rate: ${c.engagementRate}%`
    );
    console.log(`║            │ Daily data points: ${c.impressions.length}`);
  } else {
    console.log('║  Content   │ No data captured');
  }

  if (result.audience) {
    const a = result.audience;
    console.log(
      `║  Audience  │ Lifetime followers: ${a.lifetimeFollowerCount.toLocaleString()} │ Growth data points: ${a.followerGrowth.length}`
    );
  } else {
    console.log('║  Audience  │ No data captured');
  }

  if (result.demographics) {
    const d = result.demographics;
    console.log(
      `║  Demographics│ Industries: ${d.industries.length} │ Job titles: ${d.jobTitles.length} │ Locations: ${d.locations.length}`
    );
    const top = d.industries[0];
    if (top) {
      console.log(`║            │ Top industry: ${top.label} (${top.percentage}%)`);
    }
  } else {
    console.log('║  Demographics│ No data captured');
  }

  if (result.errors.length > 0) {
    console.log('║  Errors:');
    for (const err of result.errors) {
      console.log(`║    ✗ ${err}`);
    }
  }

  console.log('╚══════════════════════════════════════════════\n');
}
