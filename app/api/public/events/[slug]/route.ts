import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al consultar Supabase.')), ms))
  ]);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const slugOrId = decodeURIComponent(String(slug ?? '')).trim();
    if (!slugOrId) return NextResponse.json({ error: 'Link de evento inválido.' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const key = serviceRoleKey || anonKey;
    if (!supabaseUrl || !key) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

    const supabase = createClient(supabaseUrl, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let eventQuery = await withTimeout(supabase
      .from('events')
      .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name)')
      .eq('status', 'published')
      .eq('slug', slugOrId)
      .maybeSingle());

    if (!eventQuery.data && !eventQuery.error) {
      eventQuery = await withTimeout(supabase
        .from('events')
        .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name)')
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

    const event = {
      id: eventRow.id,
      name: eventRow.name,
      slug: eventRow.slug,
      description: eventRow.description ?? '',
      imageUrl: eventRow.image_url ?? '',
      venue: (eventRow.venues as any)?.name ?? '',
      status: eventRow.status,
      capacity: eventRow.capacity ?? 0,
      dates: (datesRes.data ?? []).map((date: any) => ({
        id: date.id,
        eventId: date.event_id,
        start: date.start_datetime,
        end: date.end_datetime ?? undefined,
        status: date.status
      })),
      sectors: (sectorsRes.data ?? []).map((sector: any) => ({
        id: sector.id,
        eventId: sector.event_id,
        name: sector.name,
        capacity: sector.capacity ?? 0
      })),
      ticketTypes: (ticketsRes.data ?? []).map((ticket: any) => ({
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
    };

    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'No se pudo cargar el evento.' }, { status: 500 });
  }
}
