import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LinkedInAnalyticsResult } from '../linkedin-scraper/types.js';
import { storeAnalyticsResult } from './store.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<LinkedInAnalyticsResult> = {}): LinkedInAnalyticsResult {
  return {
    scrapedAt: '2025-01-15T09:00:00.000Z',
    errors: [],
    content: {
      impressions: [],
      engagements: [],
      impressionsCumulative: [],
      engagementsCumulative: [],
      totalImpressions: 1500,
      totalEngagements: 75,
      engagementRate: 5.0,
      capturedAt: '2025-01-15T09:00:00.000Z',
    },
    audience: {
      followerGrowth: [],
      followerGrowthCumulative: [],
      lifetimeFollowerCount: 3000,
      capturedAt: '2025-01-15T09:00:00.000Z',
    },
    demographics: {
      industries: [{ label: 'Technology', count: 50, percentage: 50.0 }],
      jobTitles: [{ label: 'Engineer', count: 30, percentage: 30.0 }],
      seniorities: [{ label: 'Senior', count: 20, percentage: 20.0 }],
      functions: [{ label: 'Engineering', count: 40, percentage: 40.0 }],
      locations: [{ label: 'USA', count: 60, percentage: 60.0 }],
      capturedAt: '2025-01-15T09:00:00.000Z',
    },
    ...overrides,
  };
}

// ── Mock Supabase client factory ──────────────────────────────────────────────

interface MockChain {
  from: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

function makeMockClient(maybeSingleResult: unknown = null): {
  client: SupabaseClient;
  chain: MockChain;
} {
  const chain: MockChain = {
    from: vi.fn(),
    upsert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  chain.maybeSingle.mockResolvedValue({ data: maybeSingleResult, error: null });
  chain.upsert.mockResolvedValue({ data: null, error: null });
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);

  return { client: chain as unknown as SupabaseClient, chain };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('storeAnalyticsResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return no errors on successful upserts', async () => {
    const { client } = makeMockClient();
    const result = await storeAnalyticsResult(client, makeResult());
    expect(result.errors).toHaveLength(0);
  });

  it('should upsert content_metrics with correct values', async () => {
    const { client, chain } = makeMockClient();
    const result = makeResult();
    await storeAnalyticsResult(client, result);

    expect(chain.from).toHaveBeenCalledWith('content_metrics');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2025-01-15',
        impressions: 1500,
        engagements: 75,
        engagement_rate: 5.0,
      }),
      { onConflict: 'date' }
    );
  });

  it('should upsert audience_metrics with correct values', async () => {
    const { client, chain } = makeMockClient();
    await storeAnalyticsResult(client, makeResult());

    expect(chain.from).toHaveBeenCalledWith('audience_metrics');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2025-01-15',
        lifetime_followers: 3000,
      }),
      { onConflict: 'date' }
    );
  });

  it('should derive new_followers from yesterday row when available', async () => {
    const { client, chain } = makeMockClient({ lifetime_followers: 2900 });
    await storeAnalyticsResult(client, makeResult());

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        new_followers: 100, // 3000 - 2900
      }),
      { onConflict: 'date' }
    );
  });

  it('should set new_followers to 0 when no yesterday row', async () => {
    const { client, chain } = makeMockClient(null);
    await storeAnalyticsResult(client, makeResult());

    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ new_followers: 0 }), {
      onConflict: 'date',
    });
  });

  it('should upsert demographics_snapshots', async () => {
    const { client, chain } = makeMockClient();
    await storeAnalyticsResult(client, makeResult());

    expect(chain.from).toHaveBeenCalledWith('demographics_snapshots');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2025-01-15',
        industries: expect.arrayContaining([expect.objectContaining({ label: 'Technology' })]),
      }),
      { onConflict: 'date' }
    );
  });

  it('should collect errors without throwing when upsert fails', async () => {
    const { client, chain } = makeMockClient();
    chain.upsert.mockResolvedValue({ data: null, error: { message: 'DB down' } });

    const result = await storeAnalyticsResult(client, makeResult());
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('DB down');
  });

  it('should skip content upsert when content is null', async () => {
    const { client, chain } = makeMockClient();
    await storeAnalyticsResult(client, makeResult({ content: null }));

    const fromCalls: string[] = chain.from.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(fromCalls).not.toContain('content_metrics');
  });

  it('should skip audience upsert when audience is null', async () => {
    const { client, chain } = makeMockClient();
    await storeAnalyticsResult(client, makeResult({ audience: null }));

    const fromCalls: string[] = chain.from.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(fromCalls).not.toContain('audience_metrics');
  });
});
