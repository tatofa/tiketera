import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function logEvent(step: string, details: Record<string, unknown>) {
  console.log('[public-events-list]', JSON.stringify({ step, ...details }));
}

function logError(step: string, details: Record<string, unknown>) {
  console.error('[public-events-list]', JSON.stringify({ step, ...details }));
}

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

export async function GET() {
  const startedAt = Date.now();

  try {
    logEvent('start', {});

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const key = serviceRoleKey || anonKey;
    if (!supabaseUrl || !key) {
      logError('missing-env', { hasUrl: Boolean(supabaseUrl), hasKey: Boolean(key) });
      return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: events, error: eventsError } = await withTimeout(supabase
      .from('events')
      .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name),created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false }));

    if (eventsError) {
      logError('events-query-error', { message: eventsError.message });
      return NextResponse.json({ error: eventsError.message }, { status: 400 });
    }

    const ids = (events ?? []).map((event: any) => event.id);
    logEvent('events-loaded', { count: ids.length });

    if (!ids.length) {
      logEvent('success', { count: 0, durationMs: Date.now() - startedAt });
      return NextResponse.json({ events: [] });
    }

    const [datesRes, sectorsRes, ticketsRes] = await withTimeout(Promise.all([
      supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').in('event_id', ids),
      supabase.from('sectors').select('id,event_id,name,capacity').in('event_id', ids),
      supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').in('event_id', ids)
    ]));

    const childError = datesRes.error?.message || sectorsRes.error?.message || ticketsRes.error?.message;
    if (childError) {
      logError('children-query-error', { message: childError });
      return NextResponse.json({ error: childError }, { status: 400 });
    }

    const mapped = (events ?? []).map((event: any) => ({
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description ?? '',
      imageUrl: event.image_url ?? '',
      venue: (event.venues as any)?.name ?? '',
      status: event.status,
      capacity: event.capacity ?? 0,
      dates: (datesRes.data ?? []).filter((date: any) => date.event_id === event.id).map((date: any) => ({
        id: date.id,
        eventId: date.event_id,
        start: date.start_datetime,
        end: date.end_datetime ?? undefined,
        status: date.status
      })),
      sectors: (sectorsRes.data ?? []).filter((sector: any) => sector.event_id === event.id).map((sector: any) => ({
        id: sector.id,
        eventId: sector.event_id,
        name: sector.name,
        capacity: sector.capacity ?? 0
      })),
      ticketTypes: (ticketsRes.data ?? []).filter((ticket: any) => ticket.event_id === event.id).map((ticket: any) => ({
        id: ticket.id,
        eventId: ticket.event_id,
        sectorId: ticket.sector_id,
        name: ticket.name,
        price: Number(ticket.price ?? 0),
        currency: ticket.currency ?? 'ARS',
        saleStart: ticket.sale_start,
        saleEnd: ticket.sale_end,
        maxPerOrder: ticket.max_per_order ?? 1,
        status: ticket.status === 'active' ? 'active' : 'paused'
      }))
    }));

    const visibleEvents = mapped.filter((event: any) => event.dates.some((date: any) => isFutureOrLiveDate(date)));

    logEvent('success', {
      loaded: mapped.length,
      visible: visibleEvents.length,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({ events: visibleEvents });
  } catch (error: any) {
    logError('unhandled-error', {
      message: error?.message ?? 'No se pudieron cargar los eventos.',
      stack: error?.stack,
      durationMs: Date.now() - startedAt
    });
    return NextResponse.json({ error: error?.message ?? 'No se pudieron cargar los eventos.' }, { status: 500 });
  }
}
