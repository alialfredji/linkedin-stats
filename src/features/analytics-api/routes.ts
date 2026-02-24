/**
 * Analytics API route handlers.
 *
 * All /api/analytics/* routes are protected by requireAuth middleware.
 * Date params default to last 30 days when not provided.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';

import {
  getAudienceMetrics,
  getAvailableDateRange,
  getContentMetrics,
  getDemographicsSnapshot,
  getLatestSummary,
} from '../analytics-storage/queries.js';
import { createLoginHandler, requireAuth } from './auth.js';

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
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Analytics — audience ──────────────────────────────────────────────────
  router.get('/api/analytics/audience', auth, async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await getAudienceMetrics(supabaseClient, from, to);
      res.json(data);
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
