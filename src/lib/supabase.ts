import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return String((import.meta as any).env[key]).trim();
    }
  } catch {
    // import.meta.env not present
  }
  try {
    const globalProc = (globalThis as any).process;
    if (globalProc && globalProc.env && globalProc.env[key]) {
      return String(globalProc.env[key]).trim();
    }
  } catch {
    // process.env not present
  }
  return '';
};

const supabaseUrl: string = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey: string = getEnvVar('VITE_SUPABASE_ANON_KEY');

/**
 * Checks whether Supabase environment variables are properly configured.
 * Returns false if missing or left as default placeholders.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }
  if (
    supabaseUrl === 'https://your-project.supabase.co' ||
    supabaseAnonKey === 'your-anon-key' ||
    supabaseUrl.includes('placeholder') ||
    supabaseAnonKey.includes('placeholder')
  ) {
    return false;
  }
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    clientInstance = null;
  }
}

/**
 * Returns the active Supabase client instance, or null if unconfigured.
 */
export const getSupabase = (): SupabaseClient | null => clientInstance;

/**
 * Direct reference to the Supabase client (null if unconfigured).
 */
export const supabase = clientInstance;
