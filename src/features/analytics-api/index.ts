/**
 * Analytics API feature.
 *
 * Starts an Express HTTP server on $START_FEATURE that:
 *   - Serves the dashboard HTML at GET /
 *   - Exposes authenticated analytics API routes
 *   - Provides a POST /api/auth/login endpoint for JWT issuance
 *
 * Requires supabase.client to be set in context (set by Supabase service).
 * Requires the following config:
 *   dashboard.port          - HTTP port (default: 3000)
 *   dashboard.jwtSecret     - HS256 signing secret
 *   dashboard.password      - Plain-text password for login
 *   dashboard.htmlPath      - Path to the dashboard HTML file
 */
import { readFileSync } from 'node:fs';

import type { SupabaseClient } from '@supabase/supabase-js';
import express from 'express';
import type { RegisterContext } from 'hook-app';

import { buildRouter } from './routes.js';

const FEATURE_NAME = 'analytics-api';
const DEFAULT_PORT = 3000;
const DEFAULT_HTML_PATH = './output/dashboard.html';

export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[Analytics API] Initializing feature');
    },
  });

  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: async ({ getConfig, getContext }: RegisterContext) => {
      const port = getConfig<number>('dashboard.port', DEFAULT_PORT);
      const jwtSecret = getConfig<string>('dashboard.jwtSecret', '');
      const dashboardPassword = getConfig<string>('dashboard.password', '');
      const htmlPath = getConfig<string>('dashboard.htmlPath', DEFAULT_HTML_PATH);

      if (!jwtSecret) {
        throw new Error('[Analytics API] dashboard.jwtSecret is required but not configured');
      }
      if (!dashboardPassword) {
        throw new Error('[Analytics API] dashboard.password is required but not configured');
      }

      const supabaseClient = getContext<SupabaseClient | null>('supabase.client');
      if (!supabaseClient) {
        throw new Error(
          '[Analytics API] supabase.client is not available — ensure Supabase service is running'
        );
      }

      const app = express();
      app.use(express.json());

      // Mount all API routes
      const router = buildRouter(supabaseClient, dashboardPassword, jwtSecret);
      app.use(router);

      // Serve dashboard HTML at root
      app.get('/', (_req, res) => {
        try {
          const html = readFileSync(htmlPath, 'utf-8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(html);
        } catch {
          res.status(503).send('<h1>Dashboard not yet generated</h1><p>Run the scraper first.</p>');
        }
      });

      await new Promise<void>((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`[Analytics API] Server listening on port ${port}`);
          resolve();
        });
        server.on('error', (err: Error) => {
          reject(err);
        });
      });
    },
  });
};
