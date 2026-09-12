/**
 * OWNER: Dev A (data/auth) - SOLE OWNER
 *
 * Dev B: never import this file. Use the hooks in src/hooks/ instead.
 * If a component needs data that no hook provides, ask A to add a hook.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.local.example to .env.local and fill it in.',
  );
}

export const supabase = createClient(url, anonKey);
