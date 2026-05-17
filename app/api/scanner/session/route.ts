import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const eventCode = String(body?.eventCode ?? '').trim().toUpperCase();
  const eventKey = String(body?.eventKey ?? '').trim().toUpperCase();
  if (!eventCode || !eventKey) return NextResponse.json({ error: 'Ingresá código y llave del evento.' }, { status: 400 });

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const byCode = await supabase
    .from('events')
    .select('id,name,slug,status,producer_id,event_code,event_key,event_dates(id,start_datetime,end_datetime,status)')
    .eq('event_code', eventCode)
    .eq('event_key', eventKey)
    .eq('event_dates.status', 'active')
    .maybeSingle();

  if (byCode.error || !byCode.data) return NextResponse.json({ error: 'Código o llave de evento incorrectos.' }, { status: 404 });
  const event = byCode.data;
  if (event.status !== 'published') return NextResponse.json({ error: 'El evento no está publicado.' }, { status: 400 });

  const eventDates = Array.isArray((event as any).event_dates) ? (event as any).event_dates : [];
  const eventDate = eventDates[0];
  if (!eventDate) return NextResponse.json({ error: 'El evento no tiene una función activa.' }, { status: 400 });

  const { data: roleRows } = await supabase
    .from('user_role_assignments')
    .select('role,producer_id,event_id,active')
    .eq('profile_id', userData.user.id)
    .eq('active', true);

  const allowed = (roleRows ?? []).some((row: any) =>
    ['super_admin', 'admin'].includes(row.role) ||
    (row.role === 'accreditor' && (!row.producer_id || row.producer_id === event.producer_id) && (!row.event_id || row.event_id === event.id))
  );
  if (!allowed) return NextResponse.json({ error: 'No tenés permiso para acreditar este evento.' }, { status: 403 });

  return NextResponse.json({
    event: { id: event.id, name: event.name, slug: event.slug, eventCode: event.event_code },
    eventDate: { id: eventDate.id, startDatetime: eventDate.start_datetime, endDatetime: eventDate.end_datetime }
  });
}
