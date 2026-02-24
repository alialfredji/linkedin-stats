/**
 * Supabase service.
 *
 * On $INIT_SERVICE: validates config and creates the client.
 * On $START_SERVICE: verifies connectivity with a lightweight ping.
 *
 * Graceful degradation: if SUPABASE_URL or SUPABASE_KEY are not set,
 * supabase.client remains null and features skip DB operations silently.
 *
 * Context keys set:
 *   supabase.client  — SupabaseClient | null
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { RegisterContext } from 'hook-app';

import { createSupabaseClient } from './client.js';

const SERVICE_NAME = 'supabase';

export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$INIT_SERVICE',
    name: SERVICE_NAME,
    handler: () => {
      console.log('[Supabase] Initializing service');
    },
  });

  registerAction({
    hook: '$START_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getConfig, setContext }: RegisterContext) => {
      const url = getConfig<string>('supabase.url', '');
      const key = getConfig<string>('supabase.key', '');

      if (!url || !key) {
        console.log('[Supabase] No credentials configured — skipping DB connection');
        setContext('supabase.client', null);
        return;
      }

      const client = createSupabaseClient(url, key);

      // Lightweight connectivity check — just query one row from a known table
      const { error } = await client.from('content_metrics').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = table exists but no rows — that's fine
        // Any other error means we can't connect
        console.warn('[Supabase] Connection check failed:', error.message);
        console.warn('[Supabase] Continuing without DB — analytics will not be persisted');
        setContext('supabase.client', null);
        return;
      }

      setContext('supabase.client', client);
      console.log('[Supabase] Connected successfully');
    },
  });
};

export type { SupabaseClient };
