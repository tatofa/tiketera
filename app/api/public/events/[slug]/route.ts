import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };
const extendedColumns = 'event_type,category,organizer_name,artist_name,summary,purchase_message,age_restriction,province,locality,address,access_policy,terms_and_conditions';

function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 8000): Promise<T> {
  const promise = Promise.resolve(promiseLike);
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al consultar Supabase.')), ms))]);
}

function mapEvent(eventRow: any, dates: any[] = [], sectors: any[] = [], tickets: any[] = []) {
  return {
    id: eventRow.id,
    name: eventRow.name,
    slug: eventRow.slug,
    description: eventRow.description ?? '',
    imageUrl: '',
    venue: (eventRow.venues as any)?.name ?? eventRow.address ?? '',
    status: eventRow.status,
    capacity: eventRow.capacity ?? 0,
    eventType: eventRow.event_type ?? '',
    category: eventRow.category ?? '',
    organizerName: eventRow.organizer_name ?? '',
    artistName: eventRow.artist_name ?? '',
    summary: eventRow.summary ?? '',
    purchaseMessage: eventRow.purchase_message ?? '',
    ageRestriction: eventRow.age_restriction ?? '',
    province: eventRow.province ?? '',
    locality: eventRow.locality ?? '',
    address: eventRow.address ?? '',
    accessPolicy: eventRow.access_policy ?? '',
    termsAndConditions: eventRow.terms_and_conditions ?? '',
    dates: dates.map((date: any) => ({ id: date.id, eventId: date.event_id, start: date.start_datetime, end: date.end_datetime ?? undefined, status: date.status })),
    sectors: sectors.map((sector: any) => ({ id: sector.id, eventId: sector.event_id, name: sector.name, capacity: sector.capacity ?? 0 })),
    ticketTypes: tickets.map((ticket: any) => ({ id: ticket.id, eventId: ticket.event_id, sectorId: ticket.sector_id, name: ticket.name, price: Number(ticket.price ?? 0), currency: ticket.currency ?? 'ARS', saleStart: ticket.sale_start ?? '', saleEnd: ticket.sale_end ?? '', maxPerOrder: ticket.max_per_order ?? 1, status: ticket.status === 'active' ? 'active' : 'paused' }))
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const startedAt = Date.now();
  let slugOrId = '';
  try {
    const { slug } = await context.params;
    slugOrId = decodeURIComponent(String(slug ?? '')).trim();
    if (!slugOrId) return NextResponse.json({ error: 'Link de evento inválido.' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !key) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

    const supabase = createClient(supabaseUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });

    let eventQuery = await withTimeout(supabase
      .from('events')
      .select(`id,producer_id,name,slug,description,status,capacity,venue_id,venues(name),${extendedColumns}`)
      .eq('status', 'published')
      .eq('slug', slugOrId)
      .maybeSingle());

    if (!eventQuery.data && !eventQuery.error) {
      eventQuery = await withTimeout(supabase
        .from('events')
        .select(`id,producer_id,name,slug,description,status,capacity,venue_id,venues(name),${extendedColumns}`)
        .eq('status', 'published')
        .eq('id', slugOrId)
        .maybeSingle());
    }

    if (eventQuery.error) return NextResponse.json({ error: eventQuery.error.message }, { status: 400 });
    if (!eventQuery.data) return NextResponse.json({ error: 'El evento no existe o todavía no está publicado.' }, { status: 404 });

    const eventRow = eventQuery.data;
    const [datesRes, sectorsRes, ticketsRes] = await withTimeout(Promise.all([
      supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').eq('event_id', eventRow.id).eq('status', 'active').order('start_datetime', { ascending: true }),
      supabase.from('sectors').select('id,event_id,name,capacity').eq('event_id', eventRow.id),
      supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').eq('event_id', eventRow.id).order('price', { ascending: true })
    ]));

    const childError = datesRes.error?.message || sectorsRes.error?.message || ticketsRes.error?.message;
    if (childError) return NextResponse.json({ error: childError }, { status: 400 });

    console.log('[public-event-detail-v2]', JSON.stringify({ step: 'success', slugOrId, durationMs: Date.now() - startedAt }));
    return NextResponse.json({ event: mapEvent(eventRow, datesRes.data ?? [], sectorsRes.data ?? [], ticketsRes.data ?? []) });
  } catch (error: any) {
    console.error('[public-event-detail-v2]', JSON.stringify({ step: 'unhandled-error', slugOrId, message: error?.message, durationMs: Date.now() - startedAt }));
    return NextResponse.json({ error: error?.message ?? 'No se pudo cargar el evento.' }, { status: 500 });
  }
}
