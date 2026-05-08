import { createClient } from '@supabase/supabase-js';
import EventCard from '@/components/EventCard';
import { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isFutureOrLiveDate(date: { start?: string; end?: string; status?: string }) {
  if (date.status !== 'active') return false;
  const now = Date.now();
  const endTime = date.end ? new Date(date.end).getTime() : NaN;
  const startTime = date.start ? new Date(date.start).getTime() : NaN;
  if (Number.isFinite(endTime)) return endTime >= now;
  if (Number.isFinite(startTime)) return startTime >= now;
  return false;
}

function mapEvents(events: any[] = [], dates: any[] = [], sectors: any[] = [], ticketTypes: any[] = []): Event[] {
  return events.map((event: any) => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    imageUrl: event.image_url ?? '',
    venue: event.venues?.name ?? '',
    status: event.status,
    capacity: event.capacity ?? 0,
    dates: dates.filter((date: any) => date.event_id === event.id).map((date: any) => ({
      id: date.id,
      eventId: date.event_id,
      start: date.start_datetime,
      end: date.end_datetime ?? undefined,
      status: date.status
    })),
    sectors: sectors.filter((sector: any) => sector.event_id === event.id).map((sector: any) => ({
      id: sector.id,
      eventId: sector.event_id,
      name: sector.name,
      capacity: sector.capacity ?? 0
    })),
    ticketTypes: ticketTypes.filter((ticket: any) => ticket.event_id === event.id).map((ticket: any) => ({
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
}

async function loadPublicEvents() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey || anonKey;

  if (!supabaseUrl || !key) {
    return { events: [] as Event[], error: 'Faltan variables de Supabase.' };
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name),created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (eventsError) return { events: [] as Event[], error: eventsError.message };

  const ids = (events ?? []).map((event: any) => event.id);
  if (!ids.length) return { events: [] as Event[], error: '' };

  const [datesRes, sectorsRes, ticketsRes] = await Promise.all([
    supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').in('event_id', ids),
    supabase.from('sectors').select('id,event_id,name,capacity').in('event_id', ids),
    supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').in('event_id', ids)
  ]);

  const childError = datesRes.error?.message || sectorsRes.error?.message || ticketsRes.error?.message;
  if (childError) return { events: [] as Event[], error: childError };

  const mapped = mapEvents(events ?? [], datesRes.data ?? [], sectorsRes.data ?? [], ticketsRes.data ?? []);
  const visible = mapped.filter((event) => event.dates.some((date) => isFutureOrLiveDate(date)));

  return { events: visible, error: '' };
}

export default async function EventosPage() {
  const { events, error } = await loadPublicEvents();

  return <section className="container-page py-10"><h1 className="text-4xl font-black text-white">Eventos</h1><p className="mt-2 text-white/65">Buscá y comprá entradas disponibles.</p>{error&&<div className="mt-8 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100"><strong>No se pudieron cargar los eventos.</strong><br />{error}</div>}<div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>{!events.length&&!error&&<div className="mt-8 card p-6 text-white/70">Todavía no hay eventos publicados o vigentes.</div>}</section>;
}
