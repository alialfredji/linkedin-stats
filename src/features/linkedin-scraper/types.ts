// LinkedIn analytics types

export interface LinkedInCookies {
  li_at: string;
  JSESSIONID?: string;
  liap?: string;
  li_rm?: string;
}

export interface DailyMetric {
  date: string; // ISO date: YYYY-MM-DD
  value: number;
}

export interface ContentAnalytics {
  impressions: DailyMetric[];
  engagements: DailyMetric[];
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  capturedAt: string;
}

export interface AudienceAnalytics {
  followerGrowth: DailyMetric[];
  lifetimeFollowerCount: number;
  capturedAt: string;
}

export interface DemographicEntry {
  label: string;
  count: number;
  percentage: number;
}

export interface DemographicAnalytics {
  industries: DemographicEntry[];
  jobTitles: DemographicEntry[];
  locations: DemographicEntry[];
  functions: DemographicEntry[];
  seniorities: DemographicEntry[];
  capturedAt: string;
}

export interface LinkedInAnalyticsResult {
  content: ContentAnalytics | null;
  audience: AudienceAnalytics | null;
  demographics: DemographicAnalytics | null;
  scrapedAt: string;
  errors: string[];
}

export interface NetworkInterceptEntry {
  url: string;
  data: unknown;
}
