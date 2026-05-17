import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const userEmail = String(user.email ?? '').toLowerCase();
  const filters = [`user_id.eq.${user.id}`];
  if (userEmail) filters.push(`buyer_email.eq.${userEmail}`);

  const { data, error } = await adminClient
    .from('orders')
    .select('id,status,total_amount,currency,created_at,buyer_email, tickets(id,status,short_token,created_at, event:events(name,slug), event_date:event_dates(start_datetime), ticket_type:ticket_types(name))')
    .or(filters.join(','))
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orders: data ?? [] });
}
