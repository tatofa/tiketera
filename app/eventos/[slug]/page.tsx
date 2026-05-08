'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TicketSelector from '@/components/TicketSelector';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Event } from '@/lib/types';
import { dateTime } from '@/lib/format';

const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop';

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

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const rrppCode = searchParams.get('rrpp') ?? searchParams.get('rpp') ?? '';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setError('Falta configurar Supabase.');
        setLoading(false);
        return;
      }

      const slugOrId = decodeURIComponent(String(params.slug ?? '')).trim();
      if (!slugOrId) {
        setError('Link de evento inválido.');
        setLoading(false);
        return;
      }

      const { data: eventRow, error: eventError } = await supabase
        .from('events')
        .select('id,producer_id,name,slug,description,image_url,status,capacity,venue_id,venues(name)')
        .eq('status', 'published')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();

      if (eventError) {
        setError(eventError.message);
        setLoading(false);
        return;
      }

      if (!eventRow) {
        setError('El evento no existe o todavía no está publicado.');
        setLoading(false);
        return;
      }

      const [{ data: dates, error: datesError }, { data: sectors, error: sectorsError }, { data: ticketTypes, error: ticketsError }] = await Promise.all([
        supabase.from('event_dates').select('id,event_id,start_datetime,end_datetime,status').eq('event_id', eventRow.id).eq('status', 'active').order('start_datetime', { ascending: true }),
        supabase.from('sectors').select('id,event_id,name,capacity').eq('event_id', eventRow.id),
        supabase.from('ticket_types').select('id,event_id,sector_id,name,price,currency,sale_start,sale_end,max_per_order,status').eq('event_id', eventRow.id).order('price', { ascending: true })
      ]);

      const childError = datesError?.message || sectorsError?.message || ticketsError?.message;
      if (childError) {
        setError(childError);
        setLoading(false);
        return;
      }

      setEvent(mapEvent(eventRow, dates ?? [], sectors ?? [], ticketTypes ?? []));
      setLoading(false);
    }

    load();
  }, [params.slug]);

  if (loading) return <section className="container-page py-12"><div className="card p-6 text-white/70">Cargando evento...</div></section>;
  if (error) return <section className="container-page py-12"><div className="rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100"><h1 className="text-2xl font-black text-white">No se pudo abrir el evento</h1><p className="mt-2 text-sm">{error}</p><a className="btn-primary mt-6 inline-flex" href="/eventos">Volver a eventos</a></div></section>;
  if (!event) return <section className="container-page py-12"><div className="card p-6 text-white/70">Evento no encontrado.</div></section>;

  return <section className="container-page py-10"><div className="relative h-[360px] overflow-hidden rounded-3xl"><Image src={event.imageUrl || fallbackImage} alt={event.name} fill className="object-cover" /></div><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><div><span className="badge">{event.venue || 'Lugar a confirmar'}</span>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<h1 className="mt-4 text-4xl font-black text-white">{event.name}</h1><p className="mt-4 text-lg text-white/65">{event.description || 'Evento disponible próximamente.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="card p-5"><h3 className="font-bold text-white">Funciones</h3>{event.dates.length?event.dates.map((d) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="card p-5"><h3 className="font-bold text-white">Sectores</h3>{event.sectors.length?event.sectors.map((s) => <p key={s.id} className="mt-2 text-white/65">{s.name} · capacidad {s.capacity}</p>):<p className="mt-2 text-white/55">Sector a confirmar</p>}</div></div></div><TicketSelector event={event} rrppCode={rrppCode} /></div></section>;
}
