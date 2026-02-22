/**
 * Scraper for LinkedIn Creator Content Analytics.
 *
 * Strategy: Navigate to each metric URL directly, then extract data
 * from Highcharts SVG accessibility img alt text.
 * LinkedIn renders each data point as an <img role="img" aria-label="...">.
 */
import type { Page } from 'playwright';

import { humanDelay, isBlocked } from './browser.js';
import type { ContentAnalytics, DailyMetric } from './types.js';

const CONTENT_ANALYTICS_URL =
  'https://www.linkedin.com/analytics/creator/content/?lineChartType=daily&timeRange=past_28_days';

/**
 * Scrape content analytics (impressions + engagements, past 28 days, daily).
 */
export async function scrapeContentAnalytics(page: Page): Promise<ContentAnalytics> {
  // Load impressions view
  await page.goto(`${CONTENT_ANALYTICS_URL}&metricType=IMPRESSIONS`, {
    waitUntil: 'domcontentloaded',
  });

  if (isBlocked(page)) {
    throw new Error('LinkedIn blocked the session. Please refresh your li_at cookie.');
  }

  await page
    .waitForFunction(() => document.querySelectorAll('[role="img"][aria-label]').length > 0, {
      timeout: 20_000,
    })
    .catch(() => {
      /* waitForFunction may time out if chart isn't rendered — proceed anyway */
    });

  await humanDelay(1500, 2500);
  const impressions = await extractChartData(page, 'Impressions');

  // Load engagements view via dedicated URL (DOM toggle doesn't re-render in headless)
  await page.goto(`${CONTENT_ANALYTICS_URL}&metricType=ENGAGEMENTS`, {
    waitUntil: 'domcontentloaded',
  });

  await page
    .waitForFunction(() => document.querySelectorAll('[role="img"][aria-label]').length > 0, {
      timeout: 20_000,
    })
    .catch(() => {
      /* waitForFunction may time out if chart isn't rendered — proceed anyway */
    });

  await humanDelay(1500, 2500);
  const engagements = await extractChartData(page, 'Engagements');

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
    capturedAt: new Date().toISOString(),
  };
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
