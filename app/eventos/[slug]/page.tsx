import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import TicketSelector from '@/components/TicketSelector';
import { Event } from '@/lib/types';
import { dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ rrpp?: string; rpp?: string }>;
};

function isFutureOrLiveDate(date: { start?: string; end?: string; status?: string }) {
  if (date.status !== 'active') return false;
  const now = Date.now();
  const endTime = date.end ? new Date(date.end).getTime() : NaN;
  const startTime = date.start ? new Date(date.start).getTime() : NaN;
  if (Number.isFinite(endTime)) return endTime >= now;
  if (Number.isFinite(startTime)) return startTime >= now;
  return false;
}

function mapEvent(event: any, dates: any[] = [], sectors: any[] = [], ticketTypes: any[] = []): Event {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    imageUrl: event.image_url ?? '',
    venue: event.venues?.name ?? '',
    status: event.status,
    capacity: event.capacity ?? 0,
    dates: dates.map((date: any) => ({
      id: date.id,
      eventId: date.event_id,
      start: date.start_datetime,
      end: date.end_datetime ?? undefined,
      status: date.status
    })),
    sectors: sectors.map((sector: any) => ({
      id: sector.id,
      eventId: sector.event_id,
      name: sector.name,
      capacity: sector.capacity ?? 0
    })),
    ticketTypes: ticketTypes.map((ticket: any) => ({
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
}

function ErrorBox({ message }: { message: string }) {
  return <section className="container-page py-12"><div className="rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100"><h1 className="text-2xl font-black text-white">No se pudo abrir el evento</h1><p className="mt-2 text-sm">{message}</p><a className="btn-primary mt-6 inline-flex" href="/eventos">Volver a eventos</a></div></section>;
}

async function loadPublicEvent(slugOrId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey || anonKey;

  if (!supabaseUrl || !key) return { event: null as Event | null, error: 'Faltan variables de Supabase.' };

  const supabase = createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let eventQuery = await supabase
    .from('events')
    .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name)')
    .eq('status', 'published')
    .eq('slug', slugOrId)
    .maybeSingle();

  if (!eventQuery.data && !eventQuery.error) {
    eventQuery = await supabase
      .from('events')
      .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name)')
      .eq('status', 'published')
      .eq('id', slugOrId)
      .maybeSingle();
  }

  if (eventQuery.error) return { event: null as Event | null, error: eventQuery.error.message };
  if (!eventQuery.data) return { event: null as Event | null, error: 'El evento no existe o todavía no está publicado.' };

  const eventRow = eventQuery.data;
  const [datesRes, sectorsRes, ticketsRes] = await Promise.all([
    supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').eq('event_id', eventRow.id).eq('status', 'active').order('start_datetime', { ascending: true }),
    supabase.from('sectors').select('id,event_id,name,capacity').eq('event_id', eventRow.id),
    supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').eq('event_id', eventRow.id).order('price', { ascending: true })
  ]);

  const childError = datesRes.error?.message || sectorsRes.error?.message || ticketsRes.error?.message;
  if (childError) return { event: null as Event | null, error: childError };

  const event = mapEvent(eventRow, datesRes.data ?? [], sectorsRes.data ?? [], ticketsRes.data ?? []);
  if (!event.dates.some((date) => isFutureOrLiveDate(date))) {
    return { event: null as Event | null, error: 'Este evento ya finalizó.' };
  }

  return { event, error: '' };
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const slugOrId = decodeURIComponent(String(resolvedParams.slug ?? '')).trim();
  const rrppCode = resolvedSearchParams.rrpp ?? resolvedSearchParams.rpp ?? '';

  if (!slugOrId) return <ErrorBox message="Link de evento inválido." />;

  const { event, error } = await loadPublicEvent(slugOrId);
  if (error || !event) return <ErrorBox message={error || 'Evento no encontrado.'} />;

  return <section className="container-page py-10"><div className="relative h-[360px] overflow-hidden rounded-3xl"><Image src={event.imageUrl || fallbackImage} alt={event.name} fill className="object-cover" /></div><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><div><span className="badge">{event.venue || 'Lugar a confirmar'}</span>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<h1 className="mt-4 text-4xl font-black text-white">{event.name}</h1><p className="mt-4 text-lg text-white/65">{event.description || 'Evento disponible próximamente.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="card p-5"><h3 className="font-bold text-white">Funciones</h3>{event.dates.length?event.dates.map((d) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="card p-5"><h3 className="font-bold text-white">Sectores</h3>{event.sectors.length?event.sectors.map((s) => <p key={s.id} className="mt-2 text-white/65">{s.name} · capacidad {s.capacity}</p>):<p className="mt-2 text-white/55">Sector a confirmar</p>}</div></div></div><TicketSelector event={event} rrppCode={rrppCode} /></div></section>;
}
