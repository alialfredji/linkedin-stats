/**
 * Browser factory for LinkedIn scraping.
 * Creates a Playwright browser context with anti-detection headers
 * that mimic a real Chrome 131 session.
 */
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

const CHROME_131_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

/**
 * Launch a Playwright browser session with LinkedIn-compatible headers.
 *
 * @param headless - Set to false to watch the browser (useful for debugging)
 */
export async function createBrowserSession(headless = true): Promise<BrowserSession> {
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
    userAgent: CHROME_131_USER_AGENT,
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
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = await context.newPage();

  const close = async (): Promise<void> => {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  };

  return { browser, context, page, close };
}

/**
 * Wait for a random human-like delay (300ms–1500ms).
 */
export async function humanDelay(minMs = 300, maxMs = 1500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the current page is a LinkedIn security challenge / login page.
 */
export function isBlocked(page: Page): boolean {
  const url = page.url();
  return (
    url.includes('/checkpoint/') ||
    url.includes('/login') ||
    url.includes('/authwall') ||
    url.includes('/uas/login')
  );
}
