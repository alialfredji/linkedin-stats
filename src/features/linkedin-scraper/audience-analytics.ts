/**
 * Scraper for LinkedIn Creator Audience Analytics.
 * URL: https://www.linkedin.com/analytics/creator/audience/
 *
 * Strategy: DOM extraction via Highcharts SVG accessibility paths.
 * LinkedIn renders chart data as SVG <path role="img" aria-label="..."> elements.
 * Aria-label format:
 *   "N.  Weekday, Month Day, Year, New followers, Value[, change description]"
 *
 * Lifetime follower count is extracted from a visible paragraph element
 * that contains only a formatted number (e.g. "1,746").
 *
 * Both daily and cumulative pages are opened in parallel within the same context.
 */
import type { BrowserContext, Page } from 'playwright';

import { humanDelay, isBlocked } from './browser.js';
import type { AudienceAnalytics, DailyMetric } from './types.js';

const BASE_URL = 'https://www.linkedin.com/analytics/creator/audience/?timeRange=past_28_days';

const AUDIENCE_DAILY_URL = `${BASE_URL}&lineChartType=daily`;
const AUDIENCE_CUMULATIVE_URL = `${BASE_URL}&lineChartType=cumulative`;

/**
 * Scrape audience analytics (follower growth daily + cumulative + lifetime count).
 * Opens two pages in parallel within the provided browser context.
 */
export async function scrapeAudienceAnalytics(context: BrowserContext): Promise<AudienceAnalytics> {
  const [dailyResult, cumulativeResult] = await Promise.all([
    scrapeFollowersPage(context, AUDIENCE_DAILY_URL, true),
    scrapeFollowersPage(context, AUDIENCE_CUMULATIVE_URL, false),
  ]);

  return {
    followerGrowth: dailyResult.growth,
    followerGrowthCumulative: cumulativeResult.growth,
    lifetimeFollowerCount: dailyResult.lifetime,
    capturedAt: new Date().toISOString(),
  };
}

interface FollowersPageResult {
  growth: DailyMetric[];
  lifetime: number;
}

/**
 * Open a single audience page, extract follower growth data and optionally the lifetime count.
 */
async function scrapeFollowersPage(
  context: BrowserContext,
  url: string,
  extractLifetime: boolean
): Promise<FollowersPageResult> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (isBlocked(page)) {
      throw new Error('LinkedIn blocked the session. Please refresh your li_at cookie.');
    }

    await page
      .waitForFunction(() => document.querySelectorAll('[role="img"][aria-label]').length > 0, {
        timeout: 20_000,
      })
      .catch(() => {
        // May not appear if page structure differs — proceed anyway
      });

    await humanDelay(1500, 2500);

    const growth = await extractFollowerGrowth(page);
    const lifetime = extractLifetime ? await extractLifetimeFollowerCount(page) : 0;

    return { growth, lifetime };
  } finally {
    await page.close();
  }
}

/**
 * Extract DailyMetric[] for "New followers" from Highcharts SVG accessibility paths.
 *
 * Aria-label format:
 *   "N.  Weekday, Month Day, Year, New followers, Value[, change text]"
 * Example:
 *   "3.  Wednesday, Feb 18, 2026, New followers, 49, increased by 69%, previous day"
 */
function extractFollowerGrowth(page: Page): Promise<DailyMetric[]> {
  return page.evaluate(() => {
    const elems = Array.from(document.querySelectorAll('[role="img"][aria-label]'));
    const results: Array<{ date: string; value: number }> = [];

    for (const el of elems) {
      const label = el.getAttribute('aria-label') ?? '';
      if (!label.toLowerCase().includes('followers')) continue;

      // Pattern: "N.  Weekday, Month Day, Year, MetricName, Value[, ...]"
      const match = label.match(/^\d+\.\s+\w+,\s+([\w]+ \d+, \d{4}),\s+[^,]+,\s+([\d,]+)/);
      if (!match) continue;

      const rawDate = match[1];
      const rawValue = match[2];
      if (!rawDate || !rawValue) continue;

      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) continue;

      const date = dateObj.toISOString().slice(0, 10);
      const value = parseInt(rawValue.replace(/,/g, ''), 10);

      results.push({ date, value });
    }

    return results;
  });
}

/**
 * Extract the lifetime total follower count.
 *
 * LinkedIn shows the total follower count as a standalone number in a <p> element
 * on the audience analytics page (e.g. "1,746"). We search all paragraphs for
 * a node whose text content is purely a formatted number and return the largest
 * such value found (to avoid picking up smaller incidental numbers).
 */
function extractLifetimeFollowerCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const paragraphs = Array.from(document.querySelectorAll('p, [role="paragraph"]'));
    let largest = 0;

    for (const el of paragraphs) {
      const text = el.textContent?.trim() ?? '';
      // Match strings that are purely numeric (with optional thousands separators)
      if (!/^[\d,]+$/.test(text)) continue;

      const value = parseInt(text.replace(/,/g, ''), 10);
      if (!isNaN(value) && value > largest) {
        largest = value;
      }
    }

    return largest;
  });
}
