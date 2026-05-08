import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: ticket, error } = await adminClient
    .from('tickets')
    .select('id,order_id,event_id,event_date_id,ticket_type_id,sector_id,qr_token,short_token,status,holder_name,holder_email,created_at,event:events(name,slug),event_date:event_dates(start_datetime,end_datetime),ticket_type:ticket_types(name,price,currency),sector:sectors(name),order:orders(id,user_id,buyer_email,buyer_name,status,total_amount,currency,created_at)')
    .eq('id', id)
    .single();

  if (error || !ticket) return NextResponse.json({ error: error?.message ?? 'Entrada no encontrada.' }, { status: 404 });
  const order = Array.isArray((ticket as any).order) ? (ticket as any).order[0] : (ticket as any).order;
  const holderEmail = String((ticket as any).holder_email ?? '').toLowerCase();
  const buyerEmail = String(order?.buyer_email ?? '').toLowerCase();
  const userEmail = String(user.email ?? '').toLowerCase();
  const ownsTicket = order?.user_id === user.id || buyerEmail === userEmail || holderEmail === userEmail;
  if (!ownsTicket) return NextResponse.json({ error: 'No tenés permiso para ver esta entrada.' }, { status: 403 });

  return NextResponse.json({ ticket });
}
