import { createClient } from '@supabase/supabase-js';
import { dateTime, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ rrpp?: string; rpp?: string }>;
};

function ErrorBox({ message }: { message: string }) {
  return <section className="container-page py-12"><div className="rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100"><h1 className="text-2xl font-black text-white">No se pudo abrir el evento</h1><p className="mt-2 text-sm">{message}</p><a className="btn-primary mt-6 inline-flex" href="/eventos">Volver a eventos</a></div></section>;
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
    .select('id,name,slug,description,image_url,status,capacity')
    .eq('status', 'published')
    .eq('slug', slugOrId)
    .maybeSingle();

  if (eventError) return <ErrorBox message={eventError.message} />;
  if (!event) return <ErrorBox message="El evento no existe o todavía no está publicado." />;

  const [{ data: dates, error: datesError }, { data: tickets, error: ticketsError }] = await Promise.all([
    supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').eq('event_id', event.id).eq('status', 'active').order('start_datetime', { ascending: true }),
    supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,max_per_order,status').eq('event_id', event.id).eq('status', 'active').order('price', { ascending: true })
  ]);

  if (datesError) return <ErrorBox message={datesError.message} />;
  if (ticketsError) return <ErrorBox message={ticketsError.message} />;

  const firstDate = dates?.[0];
  const firstTicket = tickets?.[0];
  const checkoutHref = firstDate && firstTicket
    ? `/checkout?eventId=${event.id}&eventDateId=${firstDate.id}&ticketTypeId=${firstTicket.id}&qty=1${rrppCode ? `&rrpp=${encodeURIComponent(rrppCode)}` : ''}`
    : '';

  return <section className="container-page py-10"><div className="grid gap-8 lg:grid-cols-[1fr_380px]"><div className="card p-6"><p className="font-semibold text-red-300">Evento</p><h1 className="mt-2 text-4xl font-black text-white">{event.name}</h1>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<p className="mt-4 text-lg text-white/65">{event.description || 'Evento disponible próximamente.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Funciones</h3>{dates?.length?dates.map((d: any) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start_datetime)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Entradas</h3>{tickets?.length?tickets.map((t: any) => <p key={t.id} className="mt-2 text-white/65">{t.name} · {money(Number(t.price ?? 0), t.currency ?? 'ARS')}</p>):<p className="mt-2 text-white/55">Sin entradas activas</p>}</div></div></div><div className="card p-6"><h2 className="text-xl font-black text-white">Comprar entradas</h2>{firstTicket?<div className="mt-5 rounded-2xl bg-white/5 p-4"><p className="text-sm text-white/60">Entrada seleccionada</p><p className="mt-1 text-2xl font-black text-white">{firstTicket.name}</p><p className="mt-2 text-lg font-black text-red-300">{money(Number(firstTicket.price ?? 0), firstTicket.currency ?? 'ARS')}</p><p className="mt-2 text-xs text-white/45">Cantidad inicial: 1. Podés ajustar la compra en checkout.</p></div>:<p className="mt-4 text-white/60">No hay tickets activos para este evento.</p>}{checkoutHref?<a className="btn-primary mt-6 w-full" href={checkoutHref}>Ir al checkout</a>:<button className="btn-secondary mt-6 w-full" disabled>Sin entradas disponibles</button>}<a className="btn-secondary mt-3 w-full" href="/eventos">Volver a eventos</a></div></div></section>;
}
