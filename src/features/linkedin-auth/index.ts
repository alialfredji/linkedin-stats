/**
 * LinkedIn Auth feature.
 *
 * Registers the $RUN_AUTH hook handler. Called by linkedin-analytics before
 * scraping. Implements a 3-path authentication strategy:
 *
 *   1. Load saved Cookie[] array from cookiePath → inject → validate session
 *   2. Automated credential login (headless) with security-challenge fallback
 *   3. Manual login in headed browser (fallback when no credentials)
 *
 * After successful auth:
 *   - Sets context: linkedin.page, linkedin.authenticated = true
 *   - Saves full Cookie[] to cookiePath for next run
 *
 * Configuration (via getConfig):
 *   linkedin.cookiePath             - path to saved cookies JSON
 *   linkedin.username               - LinkedIn username/email (optional)
 *   linkedin.password               - LinkedIn password (optional)
 *   linkedin.loginTimeoutSeconds    - seconds to wait for manual login (default 120)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { RegisterContext } from 'hook-app';
import type { BrowserContext, Cookie, Page } from 'playwright';
import { chromium } from 'playwright';

const FEATURE_NAME = 'linkedin-auth';
const LINKEDIN_LOGIN_URL = 'https://www.linkedin.com/login';
const LINKEDIN_FEED_URL = 'https://www.linkedin.com/feed/';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[LinkedIn Auth] Initializing feature');
    },
  });

  registerAction({
    hook: '$RUN_AUTH',
    name: FEATURE_NAME,
    handler: async (_props: unknown, { getConfig, getContext, setContext }: RegisterContext) => {
      const cookiePath = getConfig<string>('linkedin.cookiePath', './data/session_cookies.json');
      const loginTimeoutMs = getConfig<number>('linkedin.loginTimeoutSeconds', 120) * 1000;
      const username = getConfig<string>('linkedin.username', '');
      const password = getConfig<string>('linkedin.password', '');
      const hasCredentials = username.length > 0 && password.length > 0;

      const browserContext = getContext<BrowserContext>('browser.context');

      // ── Path 1: restore saved cookies ─────────────────────────────────────
      const savedCookies = loadCookies(cookiePath);

      if (savedCookies) {
        console.log('[LinkedIn Auth] Found saved cookies, attempting to restore session…');
        await browserContext.addCookies(savedCookies);

        const page = await browserContext.newPage();
        const isValid = await validateSession(page);

        if (isValid) {
          console.log('[LinkedIn Auth] Session restored successfully');
          setContext('linkedin.page', page);
          setContext('linkedin.authenticated', true);
          return;
        }

        console.log('[LinkedIn Auth] Saved cookies are expired or invalid');
        await page.close();
        await browserContext.clearCookies();
      }

      // ── Path 2: automated credential login ────────────────────────────────
      if (hasCredentials) {
        console.log('[LinkedIn Auth] Logging in with credentials…');
        const page = await loginWithCredentials(browserContext, username, password, loginTimeoutMs);

        await saveCookiesFromContext(browserContext, cookiePath);
        setContext('linkedin.page', page);
        setContext('linkedin.authenticated', true);
        console.log('[LinkedIn Auth] Automated login complete');
        return;
      }

      // ── Path 3: manual headed login ───────────────────────────────────────
      console.log('[LinkedIn Auth] No credentials provided. Opening browser for manual login…');
      console.log(
        `[LinkedIn Auth] You have ${loginTimeoutMs / 1000} seconds to complete the login.`
      );

      const page = await loginManually(getContext, setContext, loginTimeoutMs);

      await saveCookiesFromContext(getContext<BrowserContext>('browser.context'), cookiePath);
      setContext('linkedin.page', page);
      setContext('linkedin.authenticated', true);
      console.log('[LinkedIn Auth] Manual login complete');
    },
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginWithCredentials(
  browserContext: BrowserContext,
  username: string,
  password: string,
  timeout: number
): Promise<Page> {
  const page = await browserContext.newPage();

  await page.goto(LINKEDIN_LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('[data-litms-control-urn="login-submit"]');

  try {
    await page.waitForURL('**/feed/**', { timeout });
  } catch {
    const currentUrl = page.url();
    if (currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
      console.log(
        '[LinkedIn Auth] Security challenge detected — relaunching headed for challenge…'
      );
      await page.close();
      return handleSecurityChallenge(username, password, timeout);
    }
    throw new Error(
      '[LinkedIn Auth] Login failed. Check your credentials or increase LINKEDIN_LOGIN_TIMEOUT_SECONDS.'
    );
  }

  await page.waitForTimeout(2000);
  console.log(`[LinkedIn Auth] Successfully logged in as ${username}`);
  return page;
}

async function handleSecurityChallenge(
  username: string,
  password: string,
  timeout: number
): Promise<Page> {
  const headedBrowser = await chromium.launch({ headless: false });
  const headedContext = await headedBrowser.newContext({
    userAgent: CHROME_UA,
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });

  const page = await headedContext.newPage();
  await page.goto(LINKEDIN_LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('[data-litms-control-urn="login-submit"]');

  console.log('[LinkedIn Auth] Please complete the security challenge in the browser window.');

  try {
    await page.waitForURL('**/feed/**', { timeout });
  } catch {
    await headedBrowser.close();
    throw new Error(
      `[LinkedIn Auth] Security challenge timeout after ${timeout / 1000}s. Please try again.`
    );
  }

  await page.waitForTimeout(2000);
  return page;
}

async function loginManually(
  getContext: RegisterContext['getContext'],
  setContext: RegisterContext['setContext'],
  timeout: number
): Promise<Page> {
  // Close the existing headless browser; relaunch headed
  const existingBrowser = getContext<import('playwright').Browser>('browser.instance');
  await existingBrowser.close().catch(() => undefined);

  const headedBrowser = await chromium.launch({ headless: false });
  const headedContext = await headedBrowser.newContext({
    userAgent: CHROME_UA,
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });

  setContext('browser.instance', headedBrowser);
  setContext('browser.context', headedContext);
  setContext('browser.headless', false);

  const page = await headedContext.newPage();
  await page.goto(LINKEDIN_LOGIN_URL, { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForURL('**/feed/**', { timeout });
    console.log('[LinkedIn Auth] Login detected!');
  } catch {
    throw new Error(`[LinkedIn Auth] Login timeout after ${timeout / 1000}s. Please try again.`);
  }

  await page.waitForTimeout(2000);
  return page;
}

async function validateSession(page: Page): Promise<boolean> {
  try {
    const response = await page.goto(LINKEDIN_FEED_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    if (!response) return false;

    const finalUrl = page.url();
    if (finalUrl.includes('/feed')) {
      try {
        await page.waitForSelector('[role="main"]', { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function loadCookies(filePath: string): Cookie[] | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    const cookies = JSON.parse(raw) as unknown;
    if (!Array.isArray(cookies) || cookies.length === 0) return null;
    return cookies as Cookie[];
  } catch {
    return null;
  }
}

function saveCookies(filePath: string, cookies: Cookie[]): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
}

async function saveCookiesFromContext(
  browserContext: BrowserContext,
  cookiePath: string
): Promise<void> {
  const cookies = await browserContext.cookies();
  saveCookies(cookiePath, cookies);
  console.log(`[LinkedIn Auth] Cookies saved to ${cookiePath} (${cookies.length} cookies)`);
}
