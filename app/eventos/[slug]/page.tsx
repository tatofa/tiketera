'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import TicketSelector from '@/components/TicketSelector';
import { loadEventsFromSupabase } from '@/lib/supabase-events';
import { Event } from '@/lib/types';
import { dateTime } from '@/lib/format';

const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop';

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const rrppCode = searchParams.get('rrpp') ?? searchParams.get('rpp') ?? '';
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    async function load() {
      const result = await loadEventsFromSupabase({ publicOnly: true });
      setError(result.ok ? '' : result.error ?? 'No se pudo cargar el evento.');
      setEvent(result.events.find((e) => e.slug === params.slug) || null);
    }
    load();
  }, [params.slug]);
  if (event === undefined) return <section className="container-page py-12"><div className="card p-6 text-white/70">Cargando evento real desde Supabase...</div></section>;
  if (event === null) return notFound();
  return <section className="container-page py-10">{error&&<div className="mb-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}<div className="relative h-[360px] overflow-hidden rounded-3xl"><Image src={event.imageUrl || fallbackImage} alt={event.name} fill className="object-cover" /></div><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><div><span className="badge">{event.venue || 'Lugar a confirmar'}</span>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<h1 className="mt-4 text-4xl font-black text-white">{event.name}</h1><p className="mt-4 text-lg text-white/65">{event.description || 'Evento disponible próximamente.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="card p-5"><h3 className="font-bold text-white">Funciones</h3>{event.dates.length?event.dates.map((d) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="card p-5"><h3 className="font-bold text-white">Sectores</h3>{event.sectors.length?event.sectors.map((s) => <p key={s.id} className="mt-2 text-white/65">{s.name} · capacidad {s.capacity}</p>):<p className="mt-2 text-white/55">Sector a confirmar</p>}</div></div></div><TicketSelector event={event} rrppCode={rrppCode} /></div></section>;
}
