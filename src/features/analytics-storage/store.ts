/**
 * Analytics storage — write operations.
 *
 * storeAnalyticsResult() persists today's scrape snapshot to Supabase.
 * All upserts are idempotent (ON CONFLICT DO UPDATE) so re-running the
 * cron on the same day is safe.
 *
 * Design decisions:
 * - Content: stores today's totals only (no daily backfill of DailyMetric[])
 * - Audience: derives new_followers = today's lifetime - yesterday's lifetime
 * - Demographics: full JSONB arrays per day (display-only, no per-field queries)
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { LinkedInAnalyticsResult } from '../linkedin-scraper/types.js';

/**
 * Persists a full scrape result as today's snapshot.
 * Errors are collected and returned rather than thrown so the caller
 * (linkedin-analytics feature) can decide whether to abort.
 */
export async function storeAnalyticsResult(
  client: SupabaseClient,
  result: LinkedInAnalyticsResult
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  const today = new Date(result.scrapedAt).toISOString().split('T')[0];

  if (!today) {
    return { errors: ['Could not derive date from scrapedAt: ' + result.scrapedAt] };
  }

  // ── Content metrics ────────────────────────────────────────────────────────
  if (result.content) {
    const { error } = await client.from('content_metrics').upsert(
      {
        date: today,
        impressions: result.content.totalImpressions,
        engagements: result.content.totalEngagements,
        engagement_rate: result.content.engagementRate,
        captured_at: result.content.capturedAt,
      },
      { onConflict: 'date' }
    );

    if (error) {
      errors.push(`content_metrics upsert failed: ${error.message}`);
    }
  }

  // ── Audience metrics ───────────────────────────────────────────────────────
  if (result.audience) {
    const lifetimeFollowers = result.audience.lifetimeFollowerCount;

    // Derive new_followers: today's lifetime - yesterday's lifetime
    const yesterday = new Date(result.scrapedAt);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newFollowers = 0;

    if (yesterdayStr) {
      const { data: prevRow } = await client
        .from('audience_metrics')
        .select('lifetime_followers')
        .eq('date', yesterdayStr)
        .maybeSingle();

      if (prevRow) {
        newFollowers = Math.max(0, lifetimeFollowers - (prevRow.lifetime_followers as number));
      }
    }

    const { error } = await client.from('audience_metrics').upsert(
      {
        date: today,
        lifetime_followers: lifetimeFollowers,
        new_followers: newFollowers,
        captured_at: result.audience.capturedAt,
      },
      { onConflict: 'date' }
    );

    if (error) {
      errors.push(`audience_metrics upsert failed: ${error.message}`);
    }
  }

  // ── Demographics snapshot ──────────────────────────────────────────────────
  if (result.demographics) {
    const { error } = await client.from('demographics_snapshots').upsert(
      {
        date: today,
        industries: result.demographics.industries,
        job_titles: result.demographics.jobTitles,
        seniorities: result.demographics.seniorities,
        functions: result.demographics.functions,
        locations: result.demographics.locations,
        captured_at: result.demographics.capturedAt,
      },
      { onConflict: 'date' }
    );

    if (error) {
      errors.push(`demographics_snapshots upsert failed: ${error.message}`);
    }
  }

  return { errors };
}
