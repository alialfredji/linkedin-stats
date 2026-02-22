/**
 * Browser service — infrastructure layer.
 *
 * Launches a shared Chromium browser instance with LinkedIn-compatible
 * anti-detection headers and stores it in hook-app context so features
 * can consume it via getContext().
 *
 * Context keys:
 *   browser.instance  — playwright Browser
 *   browser.context   — playwright BrowserContext
 *   browser.headless  — boolean
 */
import type { RegisterContext } from 'hook-app';
import type { Browser } from 'playwright';
import { chromium } from 'playwright';

const SERVICE_NAME = 'browser';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$INIT_SERVICE',
    name: SERVICE_NAME,
    handler: () => {
      console.log('[Browser] Initializing service');
    },
  });

  registerAction({
    hook: '$START_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getConfig, setContext }: RegisterContext) => {
      const headless = getConfig<boolean>('linkedin.headless', true);

      console.log(`[Browser] Launching Chromium (headless: ${String(headless)})…`);

      const browser = await chromium.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--disable-dev-shm-usage',
        ],
      });

      const context = await browser.newContext({
        userAgent: CHROME_UA,
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
          'accept-language': 'en-US,en;q=0.9',
          'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
        },
      });

      // Mask automation indicators
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      setContext('browser.instance', browser);
      setContext('browser.context', context);
      setContext('browser.headless', headless);

      console.log('[Browser] Chromium ready');
    },
  });

  registerAction({
    hook: '$FINISH',
    name: SERVICE_NAME,
    handler: async ({ getContext }: RegisterContext) => {
      const browser = getContext<Browser | null>('browser.instance');
      if (browser) {
        await browser.close().catch(() => undefined);
        console.log('[Browser] Chromium closed');
      }
    },
  });
};
