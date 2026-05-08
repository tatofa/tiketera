import { createClient } from '@supabase/supabase-js';
import PublicEventTicketPicker from '@/components/PublicEventTicketPicker';
import { dateTime, money } from '@/lib/format';
import type { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ rrpp?: string; rpp?: string }>;
};

function ErrorBox({ message }: { message: string }) {
  return <section className="container-page py-12"><div className="rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100"><h1 className="text-2xl font-black text-white">No se pudo abrir el evento</h1><p className="mt-2 text-sm">{message}</p><a className="btn-primary mt-6 inline-flex" href="/eventos">Volver a eventos</a></div></section>;
}

function mapEvent(event: any, dates: any[] = [], sectors: any[] = [], tickets: any[] = []): Event {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    imageUrl: '',
    venue: '',
    status: event.status,
    capacity: event.capacity ?? 0,
    dates: dates.map((d) => ({ id: d.id, eventId: d.event_id, start: d.start_datetime, end: d.end_datetime ?? undefined, status: d.status })),
    sectors: sectors.map((s) => ({ id: s.id, eventId: s.event_id, name: s.name, capacity: s.capacity ?? 0 })),
    ticketTypes: tickets.map((t) => ({
      id: t.id,
      eventId: t.event_id,
      sectorId: t.sector_id,
      name: t.name,
      price: Number(t.price ?? 0),
      currency: t.currency ?? 'ARS',
      saleStart: t.sale_start ?? '',
      saleEnd: t.sale_end ?? '',
      maxPerOrder: t.max_per_order ?? 1,
      status: t.status === 'active' ? 'active' : 'paused'
    }))
  };
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const slugOrId = decodeURIComponent(String(resolvedParams.slug ?? '')).trim();
  const rrppCode = resolvedSearchParams.rrpp ?? resolvedSearchParams.rpp ?? '';

  if (!slugOrId) return <ErrorBox message="Link de evento inválido." />;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return <ErrorBox message="Faltan variables de Supabase." />;

  const supabase = createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id,name,slug,description,status,capacity')
    .eq('status', 'published')
    .eq('slug', slugOrId)
    .maybeSingle();

  if (eventError) return <ErrorBox message={eventError.message} />;
  if (!event) return <ErrorBox message="El evento no existe o todavía no está publicado." />;

  const [{ data: dates, error: datesError }, { data: sectors, error: sectorsError }, { data: tickets, error: ticketsError }] = await Promise.all([
    supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').eq('event_id', event.id).eq('status', 'active').order('start_datetime', { ascending: true }),
    supabase.from('sectors').select('id,event_id,name,capacity').eq('event_id', event.id),
    supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').eq('event_id', event.id).eq('status', 'active').order('price', { ascending: true })
  ]);

  const childError = datesError?.message || sectorsError?.message || ticketsError?.message;
  if (childError) return <ErrorBox message={childError} />;

  const publicEvent = mapEvent(event, dates ?? [], sectors ?? [], tickets ?? []);

  return <section className="container-page py-10"><div className="grid gap-8 lg:grid-cols-[1fr_420px]"><div className="card p-6"><p className="font-semibold text-red-300">Evento</p><h1 className="mt-2 text-4xl font-black text-white">{publicEvent.name}</h1>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<p className="mt-4 text-lg text-white/65">{publicEvent.description || 'Evento disponible próximamente.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Funciones</h3>{publicEvent.dates.length?publicEvent.dates.map((d) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Sectores</h3>{publicEvent.sectors.length?publicEvent.sectors.map((s) => <p key={s.id} className="mt-2 text-white/65">{s.name} · capacidad {s.capacity}</p>):<p className="mt-2 text-white/55">Sector general</p>}</div></div><div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Tipos de entrada</h3>{publicEvent.ticketTypes.length?publicEvent.ticketTypes.map((t) => <p key={t.id} className="mt-2 text-white/65">{t.name} · {money(t.price, t.currency)}</p>):<p className="mt-2 text-white/55">Sin entradas activas</p>}</div></div><PublicEventTicketPicker event={publicEvent} rrppCode={rrppCode} /></div></section>;
}
