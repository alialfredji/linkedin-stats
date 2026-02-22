/**
 * LinkedIn auth service.
 * Loads cookies from a JSON file and injects them into a Playwright browser context.
 * Supports both formats:
 *   1. Playwright Cookie[] array (saved by linkedin-auth after login)
 *   2. Simple object { li_at, JSESSIONID, ... } (manual setup)
 * Supports extracting the CSRF token from the JSESSIONID cookie value.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { BrowserContext } from 'playwright';
import { z } from 'zod/v4';

import type { LinkedInCookies } from './types.js';

// Schema for the simple object format: { li_at, JSESSIONID, ... }
const SimpleCookiesSchema = z.object({
  li_at: z.string().min(1),
  JSESSIONID: z.string().optional(),
  liap: z.string().optional(),
  li_rm: z.string().optional(),
});

// Schema for a single Playwright Cookie entry
const PlaywrightCookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.string().optional(),
});

const PlaywrightCookiesArraySchema = z.array(PlaywrightCookieSchema);

const LINKEDIN_DOMAIN = '.linkedin.com';

// Cookie expires value: -1 = session cookie (no expiry stored by Playwright)
const SESSION_EXPIRES = -1;

/**
 * Load LinkedIn session cookies from a JSON file.
 *
 * Supports two formats:
 *
 * Format 1 — Playwright Cookie[] array (saved automatically after login):
 * [ { "name": "li_at", "value": "AQE...", "domain": ".linkedin.com", ... }, ... ]
 *
 * Format 2 — Simple object (manual setup):
 * { "li_at": "AQE...", "JSESSIONID": "ajax:12345..." }
 */
export function loadCookies(cookiePath: string): LinkedInCookies {
  const resolved = path.resolve(cookiePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Cookie file not found: ${resolved}\n` +
        'Create it with: { "li_at": "YOUR_LI_AT_COOKIE_VALUE" }\n' +
        'Find li_at in Chrome DevTools → Application → Cookies → linkedin.com'
    );
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Cookie file is not valid JSON: ${resolved}`);
  }

  // Format 1: Playwright Cookie[] array (saved by linkedin-auth after login)
  if (Array.isArray(parsed)) {
    const arrayResult = PlaywrightCookiesArraySchema.safeParse(parsed);
    if (!arrayResult.success) {
      throw new Error(`Cookie file validation failed: ${z.prettifyError(arrayResult.error)}`);
    }

    const byName = new Map(arrayResult.data.map((c) => [c.name, c.value]));
    const li_at = byName.get('li_at');

    if (!li_at || li_at.length === 0) {
      throw new Error(
        `Cookie file is missing required 'li_at' cookie.\n` +
          `Found cookies: ${[...byName.keys()].join(', ')}\n` +
          'Try running the app again to re-authenticate.'
      );
    }

    const cookies: LinkedInCookies = { li_at };
    const JSESSIONID = byName.get('JSESSIONID');
    const liap = byName.get('liap');
    const li_rm = byName.get('li_rm');
    if (JSESSIONID !== undefined) cookies.JSESSIONID = JSESSIONID;
    if (liap !== undefined) cookies.liap = liap;
    if (li_rm !== undefined) cookies.li_rm = li_rm;
    return cookies;
  }

  // Format 2: simple object { li_at, JSESSIONID, ... }
  const result = SimpleCookiesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Cookie file validation failed: ${z.prettifyError(result.error)}`);
  }

  // exactOptionalPropertyTypes: only include keys that are present
  const { li_at, JSESSIONID, liap, li_rm } = result.data;
  const cookies: LinkedInCookies = { li_at };
  if (JSESSIONID !== undefined) cookies.JSESSIONID = JSESSIONID;
  if (liap !== undefined) cookies.liap = liap;
  if (li_rm !== undefined) cookies.li_rm = li_rm;
  return cookies;
}

/**
 * Extract CSRF token from JSESSIONID cookie value.
 * LinkedIn embeds the CSRF token as: "ajax:{csrf_token}"
 * The csrf-token header value must be the URL-decoded, quoted string.
 */
export function extractCsrfToken(jsessionid: string): string {
  // JSESSIONID looks like: "ajax:1234567890123456789" (with surrounding quotes sometimes)
  const cleaned = jsessionid.replace(/^"(.*)"$/, '$1');
  return cleaned;
}

/**
 * Inject LinkedIn cookies into a Playwright browser context.
 * Also sets the csrf-token header for all subsequent requests.
 */
export async function injectCookies(
  context: BrowserContext,
  cookies: LinkedInCookies
): Promise<void> {
  await context.addCookies([
    {
      name: 'li_at',
      value: cookies.li_at,
      domain: LINKEDIN_DOMAIN,
      path: '/',
      expires: SESSION_EXPIRES,
      secure: true,
      httpOnly: true,
      sameSite: 'None',
    },
    ...(cookies.JSESSIONID !== undefined
      ? [
          {
            name: 'JSESSIONID',
            value: cookies.JSESSIONID,
            domain: LINKEDIN_DOMAIN,
            path: '/',
            expires: SESSION_EXPIRES,
            secure: true,
            httpOnly: false,
            sameSite: 'None' as const,
          },
        ]
      : []),
    ...(cookies.liap !== undefined
      ? [
          {
            name: 'liap',
            value: cookies.liap,
            domain: LINKEDIN_DOMAIN,
            path: '/',
            expires: SESSION_EXPIRES,
            secure: true,
            httpOnly: true,
            sameSite: 'None' as const,
          },
        ]
      : []),
    ...(cookies.li_rm !== undefined
      ? [
          {
            name: 'li_rm',
            value: cookies.li_rm,
            domain: LINKEDIN_DOMAIN,
            path: '/',
            expires: SESSION_EXPIRES,
            secure: true,
            httpOnly: true,
            sameSite: 'None' as const,
          },
        ]
      : []),
  ]);

  // Set CSRF token as extra HTTP header for all requests in this context
  if (cookies.JSESSIONID !== undefined) {
    const csrfToken = extractCsrfToken(cookies.JSESSIONID);
    await context.setExtraHTTPHeaders({
      'csrf-token': csrfToken,
      'x-li-lang': 'en_US',
      'x-restli-protocol-version': '2.0.0',
    });
  }
}
