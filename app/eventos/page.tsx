'use client';

import { CalendarDays, MapPin, Search, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dateTime, money } from '@/lib/format';
import type { Event } from '@/lib/types';

function purchasePath(event: Event) {
  const slugOrId = String(event.slug || event.id || '').trim();
  return `/comprar/${encodeURIComponent(slugOrId)}`;
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      const timeout = window.setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch('/api/public/events', { cache: 'no-store', signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'No se pudieron cargar los eventos.');
        setEvents(json.events ?? []);
      } catch (err: any) {
        setError(err?.name === 'AbortError' ? 'La carga tardó demasiado. Probá recargar la página.' : err?.message ?? 'No se pudieron cargar los eventos.');
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const filtered = events.filter((e) => e.status === 'published' && `${e.name} ${e.venue}`.toLowerCase().includes(q.toLowerCase()));

  function openPurchase(event: Event) {
    window.location.href = purchasePath(event);
  }

  return <section className="container-page py-10"><h1 className="text-4xl font-black text-white">Eventos</h1><p className="mt-2 text-white/65">Buscá y comprá entradas disponibles.</p><div className="mt-6 flex max-w-3xl items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-whiteglow backdrop-blur"><Search size={20} className="text-white/55"/><input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45" placeholder="Buscar por nombre o lugar" value={q} onChange={(e) => setQ(e.target.value)} /></div>{loading&&<div className="mt-8 card p-6 text-white/70">Cargando eventos...</div>}{error&&<div className="mt-8 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100"><strong>No se pudieron cargar los eventos.</strong><br />{error}</div>}<div className="mt-8 space-y-4">{filtered.map((event) => {
    const firstDate = event.dates[0]?.start;
    const prices = event.ticketTypes.map((ticket) => ticket.price).filter((price) => Number.isFinite(price));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    return <div key={event.id} className="rounded-3xl border border-white/10 bg-black/60 p-5 shadow-xl shadow-black/35"><div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-200">Publicado</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60">{event.ticketTypes.length} tipo{event.ticketTypes.length === 1 ? '' : 's'} de entrada</span></div><h2 className="mt-3 text-2xl font-black text-white">{event.name}</h2><p className="mt-2 line-clamp-2 max-w-3xl text-sm text-white/60">{event.description || 'Evento disponible próximamente.'}</p><div className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2"><div className="flex items-center gap-2"><CalendarDays size={16} className="text-white/80" />{firstDate ? dateTime(firstDate) : 'Fecha a confirmar'}</div><div className="flex items-center gap-2"><MapPin size={16} className="text-white/80" />{event.venue || 'Lugar a confirmar'}</div><div className="flex items-center gap-2"><Ticket size={16} className="text-white/80" />Desde {prices.length ? money(minPrice) : 'Sin precio'}</div></div></div><div className="flex flex-col gap-3 md:min-w-52"><button type="button" onClick={() => openPurchase(event)} className="rounded-2xl bg-red-500 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-red-400">Comprar</button><button type="button" onClick={() => openPurchase(event)} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-bold text-white/75 transition hover:bg-white/10">Ver detalle</button></div></div></div>;
  })}</div>{!loading&&!filtered.length&&!error&&<div className="mt-8 card p-6 text-white/70">Todavía no hay eventos publicados.</div>}</section>;
}
