'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import PublicEventTicketPicker from '@/components/PublicEventTicketPicker';
import { dateTime, money } from '@/lib/format';
import type { Event } from '@/lib/types';

function ErrorBox({ message }: { message: string }) {
  return <section className="container-page py-12"><div className="rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100"><h1 className="text-2xl font-black text-white">No se pudo abrir la compra</h1><p className="mt-2 text-sm">{message}</p><a className="btn-primary mt-6 inline-flex" href="/eventos">Volver a eventos</a></div></section>;
}

export default function StandalonePurchasePage() {
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
        setError('Link de compra inválido.');
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

  return <section className="container-page py-10"><div className="mb-8"><a href="/eventos" className="text-sm font-bold text-white/55 hover:text-white">← Volver a eventos</a><p className="mt-6 font-semibold text-red-300">Comprar entradas</p><h1 className="mt-2 text-5xl font-black text-white">{event.name}</h1>{rrppCode&&<p className="mt-3 inline-flex rounded-2xl bg-red-950/35 px-3 py-2 text-sm font-bold text-red-100">Link RRPP /{rrppCode}</p>}<p className="mt-4 max-w-3xl text-lg text-white/65">{event.description || 'Evento disponible próximamente.'}</p></div><div className="grid gap-8 lg:grid-cols-[1fr_420px]"><div className="space-y-5"><div className="card p-6"><h2 className="text-2xl font-black text-white">Información del evento</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Funciones</h3>{event.dates.length?event.dates.map((d) => <p key={d.id} className="mt-2 text-white/65">{dateTime(d.start)}</p>):<p className="mt-2 text-white/55">Fecha a confirmar</p>}</div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold text-white">Sectores</h3>{event.sectors.length?event.sectors.map((s) => <p key={s.id} className="mt-2 text-white/65">{s.name} · capacidad {s.capacity}</p>):<p className="mt-2 text-white/55">Sector general</p>}</div></div></div><div className="card p-6"><h2 className="text-2xl font-black text-white">Tipos de entrada</h2>{event.ticketTypes.length?<div className="mt-5 space-y-3">{event.ticketTypes.map((t) => <div key={t.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><div><p className="font-black text-white">{t.name}</p><p className="mt-1 text-sm text-white/45">Máximo {t.maxPerOrder} por compra</p></div><p className="font-black text-red-300">{money(t.price, t.currency)}</p></div>)}</div>:<p className="mt-4 text-white/55">Sin entradas activas</p>}</div></div><PublicEventTicketPicker event={event} rrppCode={rrppCode} /></div></section>;
}
