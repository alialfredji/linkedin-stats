/**
 * Analytics storage — read operations.
 *
 * All query functions accept a SupabaseClient and return typed results.
 * Date range defaults to the last 30 days when not specified.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { DemographicEntry } from '../linkedin-scraper/types.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

function defaultFrom(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().split('T')[0] as string;
}

function defaultTo(): string {
  return new Date().toISOString().split('T')[0] as string;
}

// ── Return types ──────────────────────────────────────────────────────────────

export interface ContentMetricPoint {
  date: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
}

export interface AudienceMetricPoint {
  date: string;
  lifetimeFollowers: number;
  newFollowers: number;
}

export interface DemographicsSnapshot {
  date: string;
  industries: DemographicEntry[];
  jobTitles: DemographicEntry[];
  seniorities: DemographicEntry[];
  functions: DemographicEntry[];
  locations: DemographicEntry[];
}

export interface AnalyticsSummary {
  latestDate: string | null;
  totalImpressions: number;
  totalEngagements: number;
  latestEngagementRate: number;
  lifetimeFollowers: number;
}

// ── Query functions ───────────────────────────────────────────────────────────

export async function getContentMetrics(
  client: SupabaseClient,
  from: string = defaultFrom(),
  to: string = defaultTo()
): Promise<ContentMetricPoint[]> {
  const { data, error } = await client
    .from('content_metrics')
    .select('date, impressions, engagements, engagement_rate')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) throw new Error(`getContentMetrics failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    date: row.date as string,
    impressions: row.impressions as number,
    engagements: row.engagements as number,
    engagementRate: row.engagement_rate as number,
  }));
}

export async function getAudienceMetrics(
  client: SupabaseClient,
  from: string = defaultFrom(),
  to: string = defaultTo()
): Promise<AudienceMetricPoint[]> {
  const { data, error } = await client
    .from('audience_metrics')
    .select('date, lifetime_followers, new_followers')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) throw new Error(`getAudienceMetrics failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    date: row.date as string,
    lifetimeFollowers: row.lifetime_followers as number,
    newFollowers: row.new_followers as number,
  }));
}

export async function getDemographicsSnapshot(
  client: SupabaseClient,
  date?: string
): Promise<DemographicsSnapshot | null> {
  const builder = client
    .from('demographics_snapshots')
    .select('date, industries, job_titles, seniorities, functions, locations')
    .order('date', { ascending: false })
    .limit(1);

  // If a specific date is requested, filter to that exact date.
  // Otherwise fall back to the most recent available snapshot.
  const { data, error } = await (date ? builder.eq('date', date) : builder).maybeSingle();

  if (error) throw new Error(`getDemographicsSnapshot failed: ${error.message}`);
  if (!data) return null;

  return {
    date: data.date as string,
    industries: (data.industries as DemographicEntry[]) ?? [],
    jobTitles: (data.job_titles as DemographicEntry[]) ?? [],
    seniorities: (data.seniorities as DemographicEntry[]) ?? [],
    functions: (data.functions as DemographicEntry[]) ?? [],
    locations: (data.locations as DemographicEntry[]) ?? [],
  };
}

export async function getLatestSummary(client: SupabaseClient): Promise<AnalyticsSummary> {
  const [contentRes, audienceRes] = await Promise.all([
    client
      .from('content_metrics')
      .select('date, impressions, engagements, engagement_rate')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('audience_metrics')
      .select('date, lifetime_followers')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (contentRes.error)
    throw new Error(`getLatestSummary content failed: ${contentRes.error.message}`);
  if (audienceRes.error)
    throw new Error(`getLatestSummary audience failed: ${audienceRes.error.message}`);

  const c = contentRes.data;
  const a = audienceRes.data;

  return {
    latestDate: (c?.date as string | undefined) ?? null,
    totalImpressions: (c?.impressions as number | undefined) ?? 0,
    totalEngagements: (c?.engagements as number | undefined) ?? 0,
    latestEngagementRate: (c?.engagement_rate as number | undefined) ?? 0,
    lifetimeFollowers: (a?.lifetime_followers as number | undefined) ?? 0,
  };
}

export async function getAvailableDateRange(
  client: SupabaseClient
): Promise<{ earliest: string | null; latest: string | null }> {
  const [earliestRes, latestRes] = await Promise.all([
    client
      .from('content_metrics')
      .select('date')
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    client
      .from('content_metrics')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    earliest: (earliestRes.data?.date as string | undefined) ?? null,
    latest: (latestRes.data?.date as string | undefined) ?? null,
  };
}
