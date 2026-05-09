import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const extendedColumns = 'event_type,category,organizer_name,artist_name,summary,purchase_message,age_restriction,province,locality,address,access_policy,terms_and_conditions';

function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 8000): Promise<T> {
  const promise = Promise.resolve(promiseLike);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al consultar Supabase.')), ms))
  ]);
}

function isFutureOrLiveDate(date: { start?: string; end?: string; status?: string }) {
  if (date.status !== 'active') return false;
  const now = Date.now();
  const endTime = date.end ? new Date(date.end).getTime() : NaN;
  const startTime = date.start ? new Date(date.start).getTime() : NaN;
  if (Number.isFinite(endTime)) return endTime >= now;
  if (Number.isFinite(startTime)) return startTime >= now;
  return false;
}

function mapEvent(event: any, datesData: any[] = [], sectorsData: any[] = [], ticketsData: any[] = []) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    imageUrl: '',
    venue: (event.venues as any)?.name ?? event.address ?? '',
    status: event.status,
    capacity: event.capacity ?? 0,
    eventType: event.event_type ?? '',
    category: event.category ?? '',
    organizerName: event.organizer_name ?? '',
    artistName: event.artist_name ?? '',
    summary: event.summary ?? '',
    purchaseMessage: event.purchase_message ?? '',
    ageRestriction: event.age_restriction ?? '',
    province: event.province ?? '',
    locality: event.locality ?? '',
    address: event.address ?? '',
    accessPolicy: event.access_policy ?? '',
    termsAndConditions: event.terms_and_conditions ?? '',
    dates: datesData.filter((date: any) => date.event_id === event.id).map((date: any) => ({
      id: date.id,
      eventId: date.event_id,
      start: date.start_datetime,
      end: date.end_datetime ?? undefined,
      status: date.status
    })),
    sectors: sectorsData.filter((sector: any) => sector.event_id === event.id).map((sector: any) => ({
      id: sector.id,
      eventId: sector.event_id,
      name: sector.name,
      capacity: sector.capacity ?? 0
    })),
    ticketTypes: ticketsData.filter((ticket: any) => ticket.event_id === event.id).map((ticket: any) => ({
      id: ticket.id,
      eventId: ticket.event_id,
      sectorId: ticket.sector_id,
      name: ticket.name,
      price: Number(ticket.price ?? 0),
      currency: ticket.currency ?? 'ARS',
      saleStart: ticket.sale_start ?? '',
      saleEnd: ticket.sale_end ?? '',
      maxPerOrder: ticket.max_per_order ?? 1,
      status: ticket.status === 'active' ? 'active' : 'paused'
    }))
  };
}

export async function GET() {
  const startedAt = Date.now();
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const key = serviceRoleKey || anonKey;
    if (!supabaseUrl || !key) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

    const supabase = createClient(supabaseUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: events, error: eventsError } = await withTimeout(supabase
      .from('events')
      .select(`id,producer_id,name,slug,description,status,capacity,venue_id,venues(name),created_at,${extendedColumns}`)
      .eq('status', 'published')
      .order('created_at', { ascending: false }));

    if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 400 });
    const ids = (events ?? []).map((event: any) => event.id);
    if (!ids.length) return NextResponse.json({ events: [] });

    const [datesRes, sectorsRes, ticketsRes] = await withTimeout(Promise.all([
      supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').in('event_id', ids),
      supabase.from('sectors').select('id,event_id,name,capacity').in('event_id', ids),
      supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').in('event_id', ids)
    ]));

    const childError = datesRes.error?.message || sectorsRes.error?.message || ticketsRes.error?.message;
    if (childError) return NextResponse.json({ error: childError }, { status: 400 });

    const mapped = (events ?? []).map((event: any) => mapEvent(event, datesRes.data ?? [], sectorsRes.data ?? [], ticketsRes.data ?? []));
    const visibleEvents = mapped.filter((event: any) => event.dates.some((date: any) => isFutureOrLiveDate(date)));

    console.log('[public-events-v3]', JSON.stringify({ step: 'success', loaded: mapped.length, visible: visibleEvents.length, durationMs: Date.now() - startedAt }));
    return NextResponse.json({ events: visibleEvents });
  } catch (error: any) {
    console.error('[public-events-v3]', JSON.stringify({ step: 'unhandled-error', message: error?.message, durationMs: Date.now() - startedAt }));
    return NextResponse.json({ error: error?.message ?? 'No se pudieron cargar los eventos.' }, { status: 500 });
  }
}
