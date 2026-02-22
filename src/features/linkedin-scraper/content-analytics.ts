/**
 * Scraper for LinkedIn Creator Content Analytics.
 *
 * Strategy: Navigate to each metric URL directly, then extract data
 * from Highcharts SVG accessibility img alt text.
 * LinkedIn renders each data point as an <img role="img" aria-label="...">.
 *
 * All four pages (impressions daily, impressions cumulative,
 * engagements daily, engagements cumulative) are opened in parallel
 * within the same browser context for maximum speed.
 */
import type { BrowserContext, Page } from 'playwright';

import { humanDelay, isBlocked } from './browser.js';
import type { ContentAnalytics, DailyMetric } from './types.js';

const BASE_URL = 'https://www.linkedin.com/analytics/creator/content/?timeRange=past_28_days';

const IMPRESSIONS_DAILY_URL = `${BASE_URL}&lineChartType=daily&metricType=IMPRESSIONS`;
const IMPRESSIONS_CUMULATIVE_URL = `${BASE_URL}&lineChartType=cumulative&metricType=IMPRESSIONS`;
const ENGAGEMENTS_DAILY_URL = `${BASE_URL}&lineChartType=daily&metricType=ENGAGEMENTS`;
const ENGAGEMENTS_CUMULATIVE_URL = `${BASE_URL}&lineChartType=cumulative&metricType=ENGAGEMENTS`;

/**
 * Scrape content analytics (impressions + engagements, daily + cumulative, past 28 days).
 * Opens four pages in parallel within the provided browser context.
 */
export async function scrapeContentAnalytics(context: BrowserContext): Promise<ContentAnalytics> {
  const [impressions, impressionsCumulative, engagements, engagementsCumulative] =
    await Promise.all([
      scrapeOnePage(context, IMPRESSIONS_DAILY_URL, 'Impressions'),
      scrapeOnePage(context, IMPRESSIONS_CUMULATIVE_URL, 'Impressions'),
      scrapeOnePage(context, ENGAGEMENTS_DAILY_URL, 'Engagements'),
      scrapeOnePage(context, ENGAGEMENTS_CUMULATIVE_URL, 'Engagements'),
    ]);

  const totalImpressions = impressions.reduce((sum, m) => sum + m.value, 0);
  const totalEngagements = engagements.reduce((sum, m) => sum + m.value, 0);
  const engagementRate =
    totalImpressions > 0 ? Math.round((totalEngagements / totalImpressions) * 10000) / 100 : 0;

  return {
    impressions,
    engagements,
    totalImpressions,
    totalEngagements,
    engagementRate,
    impressionsCumulative,
    engagementsCumulative,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Open a single page in the given context, navigate to the URL, extract chart data, then close.
 */
async function scrapeOnePage(
  context: BrowserContext,
  url: string,
  metricName: string
): Promise<DailyMetric[]> {
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
        /* chart may not render in time — proceed with whatever is on the page */
      });

    await humanDelay(1500, 2500);
    return await extractChartData(page, metricName);
  } finally {
    await page.close();
  }
}

/**
 * Extract DailyMetric[] for a given metric from Highcharts SVG accessibility paths.
 *
 * Highcharts renders each data point as an SVG <path role="img" aria-label="...">.
 * Aria-label format:
 *   "N.  Weekday, Month Day, Year, MetricName, Value[, change text]"
 * Example:
 *   "3.  Wednesday, Feb 18, 2026, Impressions, 9228, increased by 659%, previous day"
 */
function extractChartData(page: Page, metricName: string): Promise<DailyMetric[]> {
  return page.evaluate(
    ({ metric }: { metric: string }) => {
      const elems = Array.from(document.querySelectorAll('[role="img"][aria-label]'));
      const results: Array<{ date: string; value: number }> = [];

      for (const el of elems) {
        const label = el.getAttribute('aria-label') ?? '';
        if (!label.includes(metric)) continue;

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
    },
    { metric: metricName }
  );
}

/**
 * Parse a date string like "Feb 18, 2026" into "2026-02-18".
 * Kept for potential future use outside page.evaluate contexts.
 */
export function parseChartDate(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}
