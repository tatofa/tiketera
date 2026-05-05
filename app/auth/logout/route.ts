import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Browser-side Supabase tokens are cleared by the client SDK in future auth UI.
  // This route gives the navigation a stable logout target for now.
  redirect('/auth/login');
}
