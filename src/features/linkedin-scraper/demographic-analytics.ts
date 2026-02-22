/**
 * Scraper for LinkedIn Follower Demographic Analytics.
 * URL: https://www.linkedin.com/analytics/demographic-detail/urn:li:fsd_profile:profile?metricType=MEMBER_FOLLOWERS
 *
 * Strategy: Plain-text extraction from document.body.innerText.
 * LinkedIn renders all demographic data as readable text in a predictable structure:
 *
 *   Demographics of followers
 *   Job title
 *   Software Engineer
 *   19.2%
 *   Full Stack Engineer
 *   3.2%
 *   ...
 *   Location
 *   Greater Malmö Metropolitan Area
 *   29.1%
 *   ...
 *   Industry
 *   IT Services and IT Consulting
 *   27.1%
 *   ...
 *   Seniority
 *   Entry
 *   36.9%
 *   ...
 *   Company size   <-- stop here (not a needed category)
 *
 * We scan by line: detect a section header, then read alternating name/percentage pairs
 * until the next section header or a known stop keyword.
 *
 * IMPORTANT: page.evaluate() callbacks are serialized to a string and executed in the
 * browser context. tsx/esbuild injects __name() helper calls for named arrow functions
 * (const x = () => ...) to preserve the .name property. Those helpers don't exist in
 * the browser and cause ReferenceError. To avoid this we pass the script as a plain JS
 * string constant (BROWSER_SCRIPT) and call page.evaluate with a trivial wrapper arrow
 * that calls JSON.parse/stringify — no named functions in that wrapper.
 */
import type { Page } from 'playwright';

import { humanDelay, isBlocked } from './browser.js';
import type { DemographicAnalytics, DemographicEntry } from './types.js';

const DEMOGRAPHIC_ANALYTICS_URL =
  'https://www.linkedin.com/analytics/demographic-detail/urn:li:fsd_profile:profile?metricType=MEMBER_FOLLOWERS';

/**
 * Section headers: keys map to result fields, values are substring keywords (lowercase).
 */
const SECTION_HEADERS: Record<string, string> = {
  jobTitles: 'job title',
  locations: 'location',
  industries: 'industr',
  seniorities: 'seniorit',
};

/** Stop collecting once we hit any line that starts with one of these (case-insensitive). */
const STOP_KEYWORDS: string[] = ['company size', 'function', 'demographics of'];

/**
 * Browser-side evaluation logic as a plain JS string.
 *
 * Why a string? tsx/esbuild transforms TypeScript/ES2022 code in page.evaluate callbacks
 * and injects __name() helpers for named arrow functions. Those helpers don't exist in
 * the browser context, causing ReferenceError. A string literal is never transformed.
 *
 * The function receives a single serializable argument object { sectionHeaders, stopKeywords }.
 */
const BROWSER_SCRIPT = String.raw`(function(arg) {
  var sectionHeaders = arg.sectionHeaders;
  var stopKeywords = arg.stopKeywords;
  var text = document.body.innerText;
  var lines = text.split('\n');
  var trimmed = [];
  for (var ti = 0; ti < lines.length; ti++) {
    var t = lines[ti].trim();
    if (t.length > 0) trimmed.push(t);
  }

  var sections = {};
  var keys = Object.keys(sectionHeaders);
  for (var ki = 0; ki < keys.length; ki++) {
    sections[keys[ki]] = [];
  }

  function matchSection(line) {
    var lower = line.toLowerCase();
    var entries = Object.entries(sectionHeaders);
    for (var ei = 0; ei < entries.length; ei++) {
      if (lower.indexOf(entries[ei][1]) !== -1) return entries[ei][0];
    }
    return null;
  }

  function isStopLine(line) {
    var lower = line.toLowerCase();
    for (var si = 0; si < stopKeywords.length; si++) {
      if (lower.indexOf(stopKeywords[si]) === 0) return true;
    }
    return false;
  }

  var currentSection = null;
  var i = 0;
  while (i < trimmed.length) {
    var line = trimmed[i] || '';
    var sectionKey = matchSection(line);
    if (sectionKey !== null) {
      currentSection = sectionKey;
      i++;
      continue;
    }
    if (currentSection !== null && isStopLine(line)) {
      currentSection = null;
      i++;
      continue;
    }
    if (currentSection !== null) {
      var nextLine = trimmed[i + 1] || '';
      var pctMatch = nextLine.match(/^([\d.]+)%$/);
      if (pctMatch) {
        var percentage = parseFloat(pctMatch[1] || '0');
        if (sections[currentSection]) {
          sections[currentSection].push({ label: line, count: 0, percentage: percentage });
        }
        i += 2;
        continue;
      }
    }
    i++;
  }
  return sections;
})`;

export async function scrapeDemographicAnalytics(page: Page): Promise<DemographicAnalytics> {
  await page.goto(DEMOGRAPHIC_ANALYTICS_URL, { waitUntil: 'domcontentloaded' });

  if (isBlocked(page)) {
    throw new Error('LinkedIn blocked the session. Please refresh your li_at cookie.');
  }

  await page.waitForSelector('main', { timeout: 20_000 }).catch(() => undefined);
  await humanDelay(1500, 2500);

  // Pass script as a string to page.evaluate via a trivial wrapper that eval's it.
  // The wrapper arrow itself has no named inner functions so esbuild won't inject __name.
  const arg = { sectionHeaders: SECTION_HEADERS, stopKeywords: STOP_KEYWORDS };
  const result = (await page.evaluate(
    (evalArg) => {
      // evalArg.script is the self-invoking function string; call it with evalArg.data
      // eslint-disable-next-line no-new-func
      return new Function('arg', `return (${evalArg.script})(arg);`)(evalArg.data);
    },
    { script: BROWSER_SCRIPT, data: arg }
  )) as Record<string, Array<{ label: string; count: number; percentage: number }>>;

  const toEntries = (key: string): DemographicEntry[] => (result[key] ?? []) as DemographicEntry[];

  return {
    industries: toEntries('industries'),
    jobTitles: toEntries('jobTitles'),
    locations: toEntries('locations'),
    functions: [],
    seniorities: toEntries('seniorities'),
    capturedAt: new Date().toISOString(),
  };
}
