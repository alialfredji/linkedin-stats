/**
 * Supabase database row types.
 * These mirror the table schemas defined in src/features/analytics-storage/schema.sql.
 */

export interface ContentMetricRow {
  id: string;
  date: string; // DATE as ISO string YYYY-MM-DD
  impressions: number;
  engagements: number;
  engagement_rate: number;
  captured_at: string;
}

export interface AudienceMetricRow {
  id: string;
  date: string;
  lifetime_followers: number;
  new_followers: number;
  captured_at: string;
}

export interface DemographicsSnapshotRow {
  id: string;
  date: string;
  industries: unknown;
  job_titles: unknown;
  seniorities: unknown;
  functions: unknown;
  locations: unknown;
  captured_at: string;
}

export interface SessionCookieRow {
  id: string;
  key: string;
  cookies: unknown; // Playwright Cookie[] stored as JSONB
  saved_at: string;
  expires_at: string;
}
