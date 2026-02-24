/**
 * Web server entrypoint.
 *
 * Registers the Supabase service and the Analytics API feature.
 * Does NOT register the browser, LinkedIn auth, or scraper features —
 * those belong to the cron scraper entrypoint only.
 *
 * Required environment variables:
 *   PORT                  - HTTP port (default: 3000)
 *   JWT_SECRET            - HS256 signing secret
 *   DASHBOARD_PASSWORD    - Plain-text password for the login form
 *   SUPABASE_URL          - Supabase project URL
 *   SUPABASE_ANON_KEY     - Supabase anon / public key
 *
 * Optional environment variables:
 *   DASHBOARD_HTML_PATH   - Path to the dashboard HTML (default: ./output/dashboard.html)
 */
import 'dotenv/config';

import hookApp from 'hook-app';
import analyticsApi from './features/analytics-api/index.js';
import analyticsStorage from './features/analytics-storage/index.js';
import supabaseService from './services/supabase/index.js';

hookApp({
  settings: {
    app: {
      name: 'LinkedIn Stats — Web Server',
      version: '1.0.0',
    },
    supabase: {
      url: process.env['SUPABASE_URL'] ?? '',
      key: process.env['SUPABASE_ANON_KEY'] ?? '',
    },
    dashboard: {
      port: Number(process.env['PORT'] ?? 3000),
      jwtSecret: process.env['JWT_SECRET'] ?? '',
      password: process.env['DASHBOARD_PASSWORD'] ?? '',
      htmlPath: process.env['DASHBOARD_HTML_PATH'] ?? './output/dashboard.html',
    },
  },
  services: [supabaseService],
  features: [analyticsStorage, analyticsApi],
  trace: 'compact',
})
  .then(() => {
    // Server keeps running — do not exit.
    console.log('[Server] Web server started');
  })
  .catch((error) => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  });
