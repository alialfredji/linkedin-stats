/**
 * LinkedIn Auth feature.
 *
 * Registers the $RUN_AUTH hook handler. Called by linkedin-analytics before
 * scraping. Implements a 4-path authentication strategy:
 *
 *   0. Load Cookie[] from Supabase session_cookies table (if configured + not expired)
 *   1. Load saved Cookie[] array from cookiePath → inject → validate session
 *   2. Automated credential login (headless) with security-challenge fallback
 *   3. Manual login in headed browser (fallback when no credentials)
 *
 * After successful auth:
 *   - Sets context: linkedin.page, linkedin.authenticated = true
 *   - Saves full Cookie[] to cookiePath for next run
 *   - Upserts Cookie[] to Supabase session_cookies (if configured)
 *
 * Configuration (via getConfig):
 *   linkedin.cookiePath             - path to saved cookies JSON
 *   linkedin.username               - LinkedIn username/email (optional)
 *   linkedin.password               - LinkedIn password (optional)
 *   linkedin.loginTimeoutSeconds    - seconds to wait for manual login (default 120)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RegisterContext } from 'hook-app';
import type { BrowserContext, Cookie, Page } from 'playwright';
import { chromium } from 'playwright';

const FEATURE_NAME = 'linkedin-auth';
const LINKEDIN_LOGIN_URL = 'https://www.linkedin.com/login';
const LINKEDIN_FEED_URL = 'https://www.linkedin.com/feed/';
const SUPABASE_COOKIE_KEY = 'linkedin';
const COOKIE_TTL_DAYS = 7;

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
      const supabaseClient = getContext<SupabaseClient | null>('supabase.client');

      // ── Path 0: restore cookies from Supabase ─────────────────────────────
      if (supabaseClient) {
        const dbCookies = await loadCookiesFromSupabase(supabaseClient);
        if (dbCookies) {
          console.log('[LinkedIn Auth] Found Supabase cookies, attempting to restore session…');
          await browserContext.addCookies(dbCookies);
          const page = await browserContext.newPage();
          const isValid = await validateSession(page);
          if (isValid) {
            console.log('[LinkedIn Auth] Session restored from Supabase successfully');
            setContext('linkedin.page', page);
            setContext('linkedin.authenticated', true);
            return;
          }
          console.log('[LinkedIn Auth] Supabase cookies are expired or invalid');
          await page.close();
          await browserContext.clearCookies();
        }
      }

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
          if (supabaseClient) await saveCookiesToSupabase(supabaseClient, savedCookies);
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
        if (supabaseClient) {
          const cookies = await browserContext.cookies();
          await saveCookiesToSupabase(supabaseClient, cookies);
        }
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
      const finalContext = getContext<BrowserContext>('browser.context');

      await saveCookiesFromContext(finalContext, cookiePath);
      if (supabaseClient) {
        const cookies = await finalContext.cookies();
        await saveCookiesToSupabase(supabaseClient, cookies);
      }
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

// ── Supabase cookie persistence ───────────────────────────────────────────────

async function loadCookiesFromSupabase(client: SupabaseClient): Promise<Cookie[] | null> {
  try {
    const { data, error } = await client
      .from('session_cookies')
      .select('cookies, expires_at')
      .eq('key', SUPABASE_COOKIE_KEY)
      .maybeSingle();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at as string);
    if (expiresAt <= new Date()) {
      console.log('[LinkedIn Auth] Supabase cookie record has expired');
      return null;
    }

    const cookies = data.cookies as unknown;
    if (!Array.isArray(cookies) || cookies.length === 0) return null;
    return cookies as Cookie[];
  } catch {
    return null;
  }
}

async function saveCookiesToSupabase(client: SupabaseClient, cookies: Cookie[]): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + COOKIE_TTL_DAYS);

    const { error } = await client.from('session_cookies').upsert(
      {
        key: SUPABASE_COOKIE_KEY,
        cookies,
        saved_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) {
      console.warn('[LinkedIn Auth] Failed to save cookies to Supabase:', error.message);
    } else {
      console.log('[LinkedIn Auth] Cookies saved to Supabase (expires in 7 days)');
    }
  } catch (err) {
    console.warn('[LinkedIn Auth] Unexpected error saving cookies to Supabase:', err);
  }
}
