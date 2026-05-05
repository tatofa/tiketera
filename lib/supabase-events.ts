import { v4 as uuid } from 'uuid';
import { createBrowserSupabaseClient } from './supabase';
import type { Event } from './types';

export type DbMutationResult = { ok: boolean; skipped: boolean; error: string | null };

function normalizeTicketTypeStatus(status: string) {
  return status === 'active' || status === 'sold_out' ? status : 'paused';
}

function toDbEvent(event: Event, userId?: string) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description,
    image_url: event.imageUrl,
    status: event.status,
    capacity: event.capacity,
    created_by: userId ?? null
  };
}

function toDbDate(date: Event['dates'][number]) {
  return {
    id: date.id,
    event_id: date.eventId,
    start_datetime: date.start,
    end_datetime: date.end ?? null,
    status: date.status
  };
}

function toDbSector(sector: Event['sectors'][number]) {
  return {
    id: sector.id,
    event_id: sector.eventId,
    name: sector.name,
    capacity: sector.capacity
  };
}

function toDbTicketType(ticket: Event['ticketTypes'][number]) {
  return {
    id: ticket.id,
    event_id: ticket.eventId,
    sector_id: ticket.sectorId,
    name: ticket.name,
    price: ticket.price,
    currency: ticket.currency,
    sale_start: ticket.saleStart,
    sale_end: ticket.saleEnd,
    max_per_order: ticket.maxPerOrder,
    status: normalizeTicketTypeStatus(ticket.status)
  };
}

export async function getSupabaseSession() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { supabase: null, userId: null, token: null };
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  return { supabase, userId: session?.user?.id ?? null, token: session?.access_token ?? null };
}

export async function saveEventToSupabase(event: Event): Promise<DbMutationResult> {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, skipped: true, error: 'Sin sesión Supabase' };

  const { error: eventError } = await supabase.from('events').upsert(toDbEvent(event, userId), { onConflict: 'id' });
  if (eventError) return { ok: false, skipped: false, error: eventError.message };

  if (event.dates.length) {
    const { error } = await supabase.from('event_dates').upsert(event.dates.map(toDbDate), { onConflict: 'id' });
    if (error) return { ok: false, skipped: false, error: error.message };
  }

  if (event.sectors.length) {
    const { error } = await supabase.from('sectors').upsert(event.sectors.map(toDbSector), { onConflict: 'id' });
    if (error) return { ok: false, skipped: false, error: error.message };
  }

  if (event.ticketTypes.length) {
    const { error } = await supabase.from('ticket_types').upsert(event.ticketTypes.map(toDbTicketType), { onConflict: 'id' });
    if (error) return { ok: false, skipped: false, error: error.message };
  }

  return { ok: true, skipped: false, error: null };
}

export async function loadEventsFromSupabase() {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, events: [] as Event[], error: 'Sin sesión Supabase' };

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id,name,slug,description,image_url,status,capacity,venue_id,venues(name)')
    .order('created_at', { ascending: false });

  if (eventsError) return { ok: false, events: [] as Event[], error: eventsError.message };
  const ids = (events ?? []).map((event: any) => event.id);
  if (!ids.length) return { ok: true, events: [], error: null };

  const [{ data: dates }, { data: sectors }, { data: ticketTypes }] = await Promise.all([
    supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').in('event_id', ids),
    supabase.from('sectors').select('id,event_id,name,capacity').in('event_id', ids),
    supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').in('event_id', ids)
  ]);

  const mapped: Event[] = (events ?? []).map((event: any) => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    imageUrl: event.image_url ?? '',
    venue: event.venues?.name ?? '',
    status: event.status,
    capacity: event.capacity ?? 0,
    dates: (dates ?? []).filter((date: any) => date.event_id === event.id).map((date: any) => ({
      id: date.id,
      eventId: date.event_id,
      start: date.start_datetime,
      end: date.end_datetime ?? undefined,
      status: date.status
    })),
    sectors: (sectors ?? []).filter((sector: any) => sector.event_id === event.id).map((sector: any) => ({
      id: sector.id,
      eventId: sector.event_id,
      name: sector.name,
      capacity: sector.capacity ?? 0
    })),
    ticketTypes: (ticketTypes ?? []).filter((ticket: any) => ticket.event_id === event.id).map((ticket: any) => ({
      id: ticket.id,
      eventId: ticket.event_id,
      sectorId: ticket.sector_id,
      name: ticket.name,
      price: Number(ticket.price ?? 0),
      currency: ticket.currency ?? 'ARS',
      saleStart: ticket.sale_start,
      saleEnd: ticket.sale_end,
      maxPerOrder: ticket.max_per_order ?? 1,
      status: ticket.status === 'paused' ? 'paused' : 'active'
    }))
  }));

  return { ok: true, events: mapped, error: null };
}

export type ManagedTicketForSupabase = {
  id: string;
  eventId: string;
  name: string;
  status: 'active' | 'paused' | 'sold_out' | 'hidden';
  price: number;
  maxPerOrder: number;
  saleStart: string;
  saleEnd: string;
};

export async function saveManagedTicketToSupabase(ticket: ManagedTicketForSupabase, sectorId: string): Promise<DbMutationResult> {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, skipped: true, error: 'Sin sesión Supabase' };

  const { error } = await supabase.from('ticket_types').upsert({
    id: ticket.id,
    event_id: ticket.eventId,
    sector_id: sectorId,
    name: ticket.name,
    price: ticket.price,
    currency: 'ARS',
    sale_start: ticket.saleStart,
    sale_end: ticket.saleEnd,
    max_per_order: ticket.maxPerOrder,
    status: normalizeTicketTypeStatus(ticket.status)
  }, { onConflict: 'id' });

  if (error) return { ok: false, skipped: false, error: error.message };
  return { ok: true, skipped: false, error: null };
}

export async function createCourtesyTicketsInSupabase(input: {
  eventId: string;
  eventDateId: string;
  ticketTypeId: string;
  sectorId: string;
  holderName: string;
  holderEmail: string;
  quantity: number;
}) {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, skipped: true, error: 'Sin sesión Supabase' };

  const { data: order, error: orderError } = await supabase.from('orders').insert({
    user_id: userId,
    buyer_name: input.holderName || input.holderEmail,
    buyer_email: input.holderEmail,
    status: 'paid',
    subtotal_amount: 0,
    service_fee_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    currency: 'ARS',
    channel: 'box_office'
  }).select('id').single();

  if (orderError) return { ok: false, skipped: false, error: orderError.message };

  const rows = Array.from({ length: Math.max(1, input.quantity) }).map(() => ({
    id: `tkt_${uuid()}`,
    order_id: order.id,
    event_id: input.eventId,
    event_date_id: input.eventDateId,
    ticket_type_id: input.ticketTypeId,
    sector_id: input.sectorId,
    qr_token: `TICKETERA:${uuid()}`,
    status: 'valid',
    holder_name: input.holderName || input.holderEmail,
    holder_email: input.holderEmail
  }));

  const { error } = await supabase.from('tickets').insert(rows);
  if (error) return { ok: false, skipped: false, error: error.message };
  return { ok: true, skipped: false, error: null };
}
