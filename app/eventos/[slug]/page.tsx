'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import PublicEventTicketPicker from '@/components/PublicEventTicketPicker';
import { dateTime, money } from '@/lib/format';
import type { Event } from '@/lib/types';

function ErrorBox({ message }: { message: string }) {
  return <section className="container-page py-12"><div className="rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100"><h1 className="text-2xl font-black text-white">No se pudo abrir el evento</h1><p className="mt-2 text-sm">{message}</p><a className="btn-primary mt-6 inline-flex" href="/eventos">Volver a eventos</a></div></section>;
}

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const rrppCode = searchParams.get('rrpp') ?? searchParams.get('rpp') ?? '';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      setEvent(null);

      const slugOrId = decodeURIComponent(String(params.slug ?? '')).trim();
      if (!slugOrId) {
        setError('Link de evento inválido.');
        setLoading(false);
        return;
      }

      const timeout = window.setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`/api/public/events/${encodeURIComponent(slugOrId)}`, {
          cache: 'no-store',
          signal: controller.signal
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'No se pudo cargar el evento.');
        setEvent(json.event);
      } catch (err: any) {
        setError(err?.name === 'AbortError' ? 'La carga tardó demasiado. Probá recargar la página.' : err?.message ?? 'No se pudo cargar el evento.');
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [params.slug]);

  if (loading) return <section className="container-page py-12"><div className="card p-6 text-white/70">Cargando evento...</div></section>;
  if (error) return <ErrorBox message={error} />;
  if (!event) return <ErrorBox message="Evento no encontrado." />;

  return <section className="container-page py-10"><div className="grid gap-8 lg:grid-cols-[1fr_420px]"><div className="card p-6"><p className="font-semibold text-red-300">Evento</p><h1 className="mt-2 text-4xl font-black text-white">{event.name}</h1>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<p className="mt-4 text-lg text-white/65">{event.description || 'Evento disponible próximamente.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Funciones</h3>{event.dates.length?event.dates.map((d) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Sectores</h3>{event.sectors.length?event.sectors.map((s) => <p key={s.id} className="mt-2 text-white/65">{s.name} · capacidad {s.capacity}</p>):<p className="mt-2 text-white/55">Sector general</p>}</div></div><div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Tipos de entrada</h3>{event.ticketTypes.length?event.ticketTypes.map((t) => <p key={t.id} className="mt-2 text-white/65">{t.name} · {money(t.price, t.currency)}</p>):<p className="mt-2 text-white/55">Sin entradas activas</p>}</div></div><PublicEventTicketPicker event={event} rrppCode={rrppCode} /></div></section>;
}
