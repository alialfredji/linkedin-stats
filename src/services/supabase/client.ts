import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the provided URL and key.
 * Use the service role key for cron (bypasses RLS),
 * use the anon key for the web server.
 */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
