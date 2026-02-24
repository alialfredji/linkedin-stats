/**
 * Scraper cron entrypoint.
 *
 * Registers the browser service, Supabase service, LinkedIn auth feature,
 * LinkedIn analytics feature (which triggers auth + scrape + DB persist),
 * and the analytics storage feature (for the store helpers).
 * Calls process.exit(0) on completion so Render's cron job finishes cleanly.
 *
 * Required environment variables:
 *   SUPABASE_URL                   - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      - Supabase service-role key (write access)
 *
 * Optional environment variables:
 *   LINKEDIN_COOKIE_PATH           - Path to on-disk cookie cache (default: ./data/session_cookies.json)
 *   LINKEDIN_HEADLESS              - Set to 'false' to watch the browser (default: true)
 *   LINKEDIN_USERNAME              - LinkedIn email for automated login
 *   LINKEDIN_PASSWORD              - LinkedIn password for automated login
 *   LINKEDIN_LOGIN_TIMEOUT_SECONDS - Seconds to wait for manual login (default: 120)
 */
import 'dotenv/config';

import hookApp from 'hook-app';
import analyticsStorage from './features/analytics-storage/index.js';
import linkedInAnalytics from './features/linkedin-analytics/index.js';
import linkedInAuth from './features/linkedin-auth/index.js';
import browserService from './services/browser/index.js';
import supabaseService from './services/supabase/index.js';

hookApp({
  settings: {
    app: {
      name: 'LinkedIn Stats — Scraper',
      version: '1.0.0',
    },
    supabase: {
      url: process.env['SUPABASE_URL'] ?? '',
      key: process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    },
    linkedin: {
      cookiePath: process.env['LINKEDIN_COOKIE_PATH'] ?? './data/session_cookies.json',
      headless: process.env['LINKEDIN_HEADLESS'] !== 'false',
      username: process.env['LINKEDIN_USERNAME'] ?? '',
      password: process.env['LINKEDIN_PASSWORD'] ?? '',
      loginTimeoutSeconds: Number(process.env['LINKEDIN_LOGIN_TIMEOUT_SECONDS'] ?? 120),
    },
  },
  services: [browserService, supabaseService],
  features: [linkedInAuth, linkedInAnalytics, analyticsStorage],
  trace: 'compact',
})
  .then(() => {
    console.log('[Scraper] Completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Scraper] Failed:', error);
    process.exit(1);
  });
