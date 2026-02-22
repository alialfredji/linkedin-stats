/**
 * Dashboard Generator feature.
 *
 * Listens on the linkedin-analytics-complete hook.
 * When fired, it:
 *   1. Reads the HTML template (./src/features/dashboard-generator/template.html)
 *   2. Injects the analytics JSON into the __ANALYTICS_DATA__ placeholder
 *   3. Writes the final HTML to ./output/dashboard.html
 *   4. Auto-opens the dashboard in the default browser
 *
 * Also registers $INIT_FEATURE for logging.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RegisterContext } from 'hook-app';

import type { LinkedInAnalyticsResult } from '../linkedin-scraper/index.js';

const FEATURE_NAME = 'dashboard-generator';
const OUTPUT_PATH = './output/dashboard.html';

// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_PATH = resolve(__dirname, 'template.html');

export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[Dashboard Generator] Initializing feature');
    },
  });

  registerAction({
    hook: 'linkedin-analytics-complete',
    name: FEATURE_NAME,
    handler: async ({ result }: { result: LinkedInAnalyticsResult }) => {
      console.log('[Dashboard Generator] Building dashboard…');

      const template = readFileSync(TEMPLATE_PATH, 'utf-8');
      const json = JSON.stringify(result);
      const html = template.replace('__ANALYTICS_DATA__', json);

      mkdirSync(dirname(resolve(OUTPUT_PATH)), { recursive: true });
      writeFileSync(resolve(OUTPUT_PATH), html, 'utf-8');

      console.log(`[Dashboard Generator] Dashboard written to ${OUTPUT_PATH}`);

      // Auto-open in default browser
      try {
        const { default: open } = await import('open');
        await open(resolve(OUTPUT_PATH));
        console.log('[Dashboard Generator] Opened in browser');
      } catch (err) {
        console.warn('[Dashboard Generator] Could not auto-open browser:', String(err));
        console.log(`[Dashboard Generator] Open manually: ${resolve(OUTPUT_PATH)}`);
      }
    },
  });
};
