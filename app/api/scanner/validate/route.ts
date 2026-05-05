import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const authToken = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!authToken) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? '').trim();
  const eventId = String(body?.eventId ?? '').trim();
  const eventDateId = String(body?.eventDateId ?? '').trim();
  if (!token || !eventId || !eventDateId) return NextResponse.json({ error: 'Falta token, evento o fecha.' }, { status: 400 });

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${authToken}` } } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id,status,event_id,event_date_id,short_token,holder_name,holder_email,event:events(name),event_date:event_dates(start_datetime)')
    .or(`qr_token.eq.${token},short_token.eq.${token.toUpperCase()}`)
    .maybeSingle();

  if (!ticket) {
    await supabase.from('checkins').insert({ event_id: eventId, token_input: token, validator_id: userData.user.id, result: 'not_found', message: 'Entrada inexistente' });
    return NextResponse.json({ ok: false, result: 'not_found', message: 'Entrada inexistente' }, { status: 404 });
  }

  if (ticket.event_id !== eventId || ticket.event_date_id !== eventDateId) {
    await supabase.from('checkins').insert({ ticket_id: ticket.id, event_id: eventId, token_input: token, validator_id: userData.user.id, result: 'wrong_event', message: 'La entrada pertenece a otro evento o fecha' });
    return NextResponse.json({ ok: false, result: 'wrong_event', message: 'La entrada pertenece a otro evento o fecha', ticket }, { status: 409 });
  }

  const { data, error } = await supabase.rpc('validate_ticket', { token, validator: userData.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ...result, ticket });
}
