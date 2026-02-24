/**
 * Analytics API route handlers.
 *
 * All /api/analytics/* routes are protected by requireAuth middleware.
 * Date params default to last 30 days when not provided.
 *
 * Content and audience responses are transformed from raw DB rows into the
 * shape expected by renderCharts() in the dashboard template.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';

import type { AudienceMetricPoint, ContentMetricPoint } from '../analytics-storage/queries.js';
import {
  getAudienceMetrics,
  getAvailableDateRange,
  getContentMetrics,
  getDemographicsSnapshot,
  getLatestSummary,
} from '../analytics-storage/queries.js';
import { createLoginHandler, requireAuth } from './auth.js';

// ── Response transformers ─────────────────────────────────────────────────

interface DailyMetric {
  date: string;
  value: number;
}

interface ContentResponse {
  impressions: DailyMetric[];
  engagements: DailyMetric[];
  impressionsCumulative: DailyMetric[];
  engagementsCumulative: DailyMetric[];
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
}

interface AudienceResponse {
  followerGrowth: DailyMetric[];
  followerGrowthCumulative: DailyMetric[];
  lifetimeFollowerCount: number;
}

function buildCumulative(points: DailyMetric[]): DailyMetric[] {
  let running = 0;
  return points.map((p) => {
    running += p.value;
    return { date: p.date, value: running };
  });
}

function transformContent(rows: ContentMetricPoint[]): ContentResponse {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const impressions = sorted.map((r) => ({ date: r.date, value: r.impressions }));
  const engagements = sorted.map((r) => ({ date: r.date, value: r.engagements }));
  const totalImpressions = sorted.reduce((s, r) => s + r.impressions, 0);
  const totalEngagements = sorted.reduce((s, r) => s + r.engagements, 0);
  const engagementRate =
    totalImpressions > 0 ? Math.round((totalEngagements / totalImpressions) * 10000) / 100 : 0;
  return {
    impressions,
    engagements,
    impressionsCumulative: buildCumulative(impressions),
    engagementsCumulative: buildCumulative(engagements),
    totalImpressions,
    totalEngagements,
    engagementRate,
  };
}

function transformAudience(rows: AudienceMetricPoint[]): AudienceResponse {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const followerGrowth = sorted.map((r) => ({ date: r.date, value: r.newFollowers }));
  const lifetimeFollowerCount =
    sorted.length > 0 ? (sorted[sorted.length - 1]?.lifetimeFollowers ?? 0) : 0;
  return {
    followerGrowth,
    followerGrowthCumulative: buildCumulative(followerGrowth),
    lifetimeFollowerCount,
  };
}

export function buildRouter(
  supabaseClient: SupabaseClient,
  dashboardPassword: string,
  jwtSecret: string
): Router {
  const router = createRouter();
  const auth = requireAuth(jwtSecret);

  // ── Health ────────────────────────────────────────────────────────────────
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  router.post('/api/auth/login', createLoginHandler(dashboardPassword, jwtSecret));

  // ── Analytics — content ───────────────────────────────────────────────────
  router.get('/api/analytics/content', auth, async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await getContentMetrics(supabaseClient, from, to);
      res.json(transformContent(data));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Analytics — audience ──────────────────────────────────────────────────
  router.get('/api/analytics/audience', auth, async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await getAudienceMetrics(supabaseClient, from, to);
      res.json(transformAudience(data));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Analytics — demographics ──────────────────────────────────────────────
  router.get('/api/analytics/demographics', auth, async (req, res) => {
    try {
      const { date } = req.query as { date?: string };
      const data = await getDemographicsSnapshot(supabaseClient, date);
      if (!data) {
        res.status(404).json({ error: 'No demographics snapshot found for the requested date' });
        return;
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Analytics — summary ───────────────────────────────────────────────────
  router.get('/api/analytics/summary', auth, async (_req, res) => {
    try {
      const data = await getLatestSummary(supabaseClient);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Analytics — date range ────────────────────────────────────────────────
  router.get('/api/analytics/date-range', auth, async (_req, res) => {
    try {
      const data = await getAvailableDateRange(supabaseClient);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
