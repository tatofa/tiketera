import { v4 as uuid } from 'uuid';
import { createBrowserSupabaseClient } from './supabase';
import type { Event } from './types';

export type DbMutationResult = { ok: boolean; skipped: boolean; error: string | null };
export type LoadEventsOptions = { publicOnly?: boolean };

const extendedEventColumns = 'event_type,category,organizer_name,artist_name,summary,purchase_message,age_restriction,province,locality,address,access_policy,terms_and_conditions';

function normalizeTicketTypeStatus(status: string) {
  return status === 'active' || status === 'sold_out' ? status : 'paused';
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

function toDbEvent(event: Event, userId: string, producerId: string) {
  return {
    id: event.id,
    producer_id: producerId,
    name: event.name,
    slug: event.slug,
    description: event.description,
    image_url: event.imageUrl,
    status: event.status,
    capacity: event.capacity,
    created_by: userId,
    event_type: event.eventType ?? null,
    category: event.category ?? null,
    organizer_name: event.organizerName ?? null,
    artist_name: event.artistName ?? null,
    summary: event.summary ?? null,
    purchase_message: event.purchaseMessage ?? null,
    age_restriction: event.ageRestriction ?? null,
    province: event.province ?? null,
    locality: event.locality ?? null,
    address: event.address ?? null,
    access_policy: event.accessPolicy ?? null,
    terms_and_conditions: event.termsAndConditions ?? null
  };
}

function toDbDate(date: Event['dates'][number]) {
  return { id: date.id, event_id: date.eventId, start_datetime: date.start, end_datetime: date.end ?? null, status: date.status };
}
function toDbSector(sector: Event['sectors'][number]) {
  return { id: sector.id, event_id: sector.eventId, name: sector.name, capacity: sector.capacity };
}
function toDbTicketType(ticket: Event['ticketTypes'][number]) {
  return { id: ticket.id, event_id: ticket.eventId, sector_id: ticket.sectorId, name: ticket.name, price: ticket.price, currency: ticket.currency, sale_start: ticket.saleStart, sale_end: ticket.saleEnd, max_per_order: ticket.maxPerOrder, status: normalizeTicketTypeStatus(ticket.status) };
}
function mapEvent(event: any, dates: any[] = [], sectors: any[] = [], ticketTypes: any[] = [], publicOnly = false): Event {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    imageUrl: publicOnly ? '' : event.image_url ?? '',
    venue: event.venues?.name ?? event.address ?? '',
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
    dates: dates.filter((date: any) => date.event_id === event.id).map((date: any) => ({ id: date.id, eventId: date.event_id, start: date.start_datetime, end: date.end_datetime ?? undefined, status: date.status })),
    sectors: sectors.filter((sector: any) => sector.event_id === event.id).map((sector: any) => ({ id: sector.id, eventId: sector.event_id, name: sector.name, capacity: sector.capacity ?? 0 })),
    ticketTypes: ticketTypes.filter((ticket: any) => ticket.event_id === event.id).map((ticket: any) => ({ id: ticket.id, eventId: ticket.event_id, sectorId: ticket.sector_id, name: ticket.name, price: Number(ticket.price ?? 0), currency: ticket.currency ?? 'ARS', saleStart: ticket.sale_start, saleEnd: ticket.sale_end, maxPerOrder: ticket.max_per_order ?? 1, status: ticket.status === 'paused' ? 'paused' : 'active' }))
  };
}

export async function getSupabaseSession() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { supabase: null, userId: null, token: null };
  const { data } = await supabase.auth.getSession();
  return { supabase, userId: data.session?.user?.id ?? null, token: data.session?.access_token ?? null };
}

async function resolveProducerId(supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>, userId: string) {
  const { data: member } = await (supabase as any).from('producer_members').select('producer_id').eq('profile_id', userId).limit(1).maybeSingle();
  if (member?.producer_id) return member.producer_id as string;
  const { data: owned } = await (supabase as any).from('producers').select('id').eq('owner_profile_id', userId).limit(1).maybeSingle();
  return owned?.id ? owned.id as string : null;
}

export async function saveEventToSupabase(event: Event): Promise<DbMutationResult> {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, skipped: true, error: 'Sin sesión Supabase' };
  const producerId = await resolveProducerId(supabase, userId);
  if (!producerId) return { ok: false, skipped: false, error: 'El usuario no tiene productor asociado. Creá un producer y un producer_member para este perfil.' };
  const db = supabase as any;
  const { error: eventError } = await db.from('events').upsert(toDbEvent(event, userId, producerId), { onConflict: 'id' });
  if (eventError) return { ok: false, skipped: false, error: eventError.message };
  if (event.dates.length) { const { error } = await db.from('event_dates').upsert(event.dates.map(toDbDate), { onConflict: 'id' }); if (error) return { ok: false, skipped: false, error: error.message }; }
  if (event.sectors.length) { const { error } = await db.from('sectors').upsert(event.sectors.map(toDbSector), { onConflict: 'id' }); if (error) return { ok: false, skipped: false, error: error.message }; }
  if (event.ticketTypes.length) { const { error } = await db.from('ticket_types').upsert(event.ticketTypes.map(toDbTicketType), { onConflict: 'id' }); if (error) return { ok: false, skipped: false, error: error.message }; }
  return { ok: true, skipped: false, error: null };
}

export async function loadEventsFromSupabase(options: LoadEventsOptions = {}) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { ok: false, events: [] as Event[], error: 'Falta configurar Supabase' };
  const db = supabase as any;
  if (!options.publicOnly) { const { data } = await supabase.auth.getSession(); if (!data.session?.user?.id) return { ok: false, events: [] as Event[], error: 'Sin sesión Supabase' }; }
  const eventSelect = options.publicOnly ? `id,producer_id,name,slug,description,status,capacity,venue_id,venues(name),${extendedEventColumns}` : `id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name),${extendedEventColumns}`;
  let query: any = db.from('events').select(eventSelect).order('created_at', { ascending: false });
  if (options.publicOnly) query = query.eq('status', 'published');
  const { data: events, error: eventsError } = await query;
  if (eventsError) return { ok: false, events: [] as Event[], error: eventsError.message };
  const ids = (events ?? []).map((event: any) => event.id);
  if (!ids.length) return { ok: true, events: [], error: null };
  const [{ data: dates }, { data: sectors }, { data: ticketTypes }] = await Promise.all([
    db.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').in('event_id', ids),
    db.from('sectors').select('id,event_id,name,capacity').in('event_id', ids),
    db.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').in('event_id', ids)
  ]);
  const mapped = (events ?? []).map((event: any) => mapEvent(event, dates ?? [], sectors ?? [], ticketTypes ?? [], Boolean(options.publicOnly)));
  const visibleEvents = options.publicOnly ? mapped.filter((event) => event.dates.some((date) => isFutureOrLiveDate(date))) : mapped;
  return { ok: true, events: visibleEvents, error: null };
}

export type ManagedTicketForSupabase = { id: string; eventId: string; name: string; status: 'active' | 'paused' | 'sold_out' | 'hidden'; price: number; maxPerOrder: number; saleStart: string; saleEnd: string; };
export async function saveManagedTicketToSupabase(ticket: ManagedTicketForSupabase, sectorId: string): Promise<DbMutationResult> {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, skipped: true, error: 'Sin sesión Supabase' };
  const { error } = await (supabase as any).from('ticket_types').upsert({ id: ticket.id, event_id: ticket.eventId, sector_id: sectorId, name: ticket.name, price: ticket.price, currency: 'ARS', sale_start: ticket.saleStart, sale_end: ticket.saleEnd, max_per_order: ticket.maxPerOrder, status: normalizeTicketTypeStatus(ticket.status) }, { onConflict: 'id' });
  if (error) return { ok: false, skipped: false, error: error.message };
  return { ok: true, skipped: false, error: null };
}

export async function createCourtesyTicketsInSupabase(input: { eventId: string; eventDateId: string; ticketTypeId: string; sectorId: string; holderName: string; holderEmail: string; quantity: number; }) {
  const { supabase, userId } = await getSupabaseSession();
  if (!supabase || !userId) return { ok: false, skipped: true, error: 'Sin sesión Supabase' };
  const db = supabase as any;
  const { data: eventRow, error: eventError } = await db.from('events').select('producer_id').eq('id', input.eventId).single();
  if (eventError) return { ok: false, skipped: false, error: eventError.message };
  const { data: order, error: orderError } = await db.from('orders').insert({ user_id: userId, producer_id: eventRow.producer_id, buyer_name: input.holderName || input.holderEmail, buyer_email: input.holderEmail, status: 'paid', subtotal_amount: 0, service_fee_amount: 0, discount_amount: 0, total_amount: 0, currency: 'ARS', channel: 'box_office' }).select('id').single();
  if (orderError) return { ok: false, skipped: false, error: orderError.message };
  const rows = Array.from({ length: Math.max(1, input.quantity) }).map(() => ({ id: uuid(), order_id: order.id, event_id: input.eventId, event_date_id: input.eventDateId, ticket_type_id: input.ticketTypeId, sector_id: input.sectorId, qr_token: `TICKETERA:${uuid()}`, status: 'valid', holder_name: input.holderName || input.holderEmail, holder_email: input.holderEmail }));
  const { error } = await db.from('tickets').insert(rows);
  if (error) return { ok: false, skipped: false, error: error.message };
  return { ok: true, skipped: false, error: null };
}
