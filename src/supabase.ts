import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** True once both environment values are present. */
export const isConfigured = Boolean(url && anonKey);

/**
 * The browser talks to Supabase directly with the PUBLIC anon key.
 * Never place a service_role key in this app - it would be visible to anyone.
 */
export const supabase = isConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: false } })
  : null;

export function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  return supabase;
}
