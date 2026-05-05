import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { eventCode } = await request.json().catch(() => ({ eventCode: '' }));
  const code = String(eventCode ?? '').trim().toLowerCase();
  if (!code) return NextResponse.json({ error: 'Ingresá el código del evento.' }, { status: 400 });

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const { data: eventDate, error } = await supabase
    .from('event_dates')
    .select('id,start_datetime,end_datetime,status,event:events(id,name,slug,status,producer_id)')
    .eq('id', code)
    .maybeSingle();

  let sessionEventDate = eventDate;
  if (!sessionEventDate) {
    const bySlug = await supabase
      .from('events')
      .select('id,name,slug,status,producer_id,event_dates(id,start_datetime,end_datetime,status)')
      .eq('slug', code)
      .eq('event_dates.status', 'active')
      .maybeSingle();
    if (bySlug.data?.event_dates?.length) {
      sessionEventDate = {
        id: bySlug.data.event_dates[0].id,
        start_datetime: bySlug.data.event_dates[0].start_datetime,
        end_datetime: bySlug.data.event_dates[0].end_datetime,
        status: bySlug.data.event_dates[0].status,
        event: { id: bySlug.data.id, name: bySlug.data.name, slug: bySlug.data.slug, status: bySlug.data.status, producer_id: bySlug.data.producer_id }
      } as any;
    }
  }

  if (error || !sessionEventDate) return NextResponse.json({ error: 'Código de evento o función no encontrado.' }, { status: 404 });
  const event = Array.isArray((sessionEventDate as any).event) ? (sessionEventDate as any).event[0] : (sessionEventDate as any).event;
  if (!event || event.status !== 'published') return NextResponse.json({ error: 'El evento no está publicado.' }, { status: 400 });

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
    event: { id: event.id, name: event.name, slug: event.slug },
    eventDate: { id: sessionEventDate.id, startDatetime: sessionEventDate.start_datetime, endDatetime: sessionEventDate.end_datetime }
  });
}
