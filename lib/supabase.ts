import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function isValidHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createBrowserSupabaseClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidHttpUrl(envUrl) || !envAnon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase browser client disabled: NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
    }
    return null;
  }

  const url: string = envUrl;
  const anon: string = envAnon;

  if (!browserClient) {
    browserClient = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ticketera-auth'
      }
    });
  }

  return browserClient;
}
