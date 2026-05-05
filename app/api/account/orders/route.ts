import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const { data, error } = await supabase
    .from('orders')
    .select('id,status,total_amount,currency,created_at,buyer_email, tickets(id,status,short_token,created_at, event:events(name,slug), event_date:event_dates(start_datetime), ticket_type:ticket_types(name))')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orders: data ?? [] });
}
