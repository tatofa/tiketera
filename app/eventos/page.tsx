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

  const filtered = events.filter((e) => e.status === 'published' && `${e.name} ${e.venue} ${e.category ?? ''} ${e.artistName ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  return <section className="container-page py-10"><h1 className="text-4xl font-black text-white">Eventos</h1><p className="mt-2 text-white/65">Buscá y comprá entradas disponibles.</p><div className="mt-6 flex max-w-3xl items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-whiteglow backdrop-blur"><Search size={20} className="text-white/55"/><input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45" placeholder="Buscar por nombre, artista o lugar" value={q} onChange={(e) => setQ(e.target.value)} /></div>{loading&&<div className="mt-8 card p-6 text-white/70">Cargando eventos...</div>}{error&&<div className="mt-8 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100"><strong>No se pudieron cargar los eventos.</strong><br />{error}</div>}<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{filtered.map((event) => {
    const firstDate = event.dates[0]?.start;
    const prices = event.ticketTypes.map((ticket) => ticket.price).filter((price) => Number.isFinite(price));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const href = purchasePath(event);
    const location = event.venue || event.address || event.locality || 'Lugar a confirmar';
    return <article key={event.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 via-black/80 to-black shadow-xl shadow-black/50 transition-all hover:-translate-y-1 hover:border-white/25 hover:shadow-red-950/30"><div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-red-950/40 via-black to-zinc-950"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,.28),transparent_45%)]"/><span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs font-black text-white backdrop-blur">Publicado</span><div className="relative text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-red-200">ticketera</p><h2 className="mt-2 line-clamp-2 px-4 text-2xl font-black text-white">{event.name}</h2></div></div><div className="space-y-3 p-4"><div className="flex flex-wrap gap-2">{event.category&&<span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white/65">{event.category}</span>}{event.ageRestriction&&<span className="rounded-full bg-red-500/15 px-2 py-1 text-[11px] font-bold text-red-100">{event.ageRestriction}</span>}</div><p className="line-clamp-2 min-h-10 text-sm text-white/65">{event.summary || event.description || 'Evento disponible próximamente.'}</p><div className="space-y-2 text-xs text-white/60"><div className="flex items-center gap-2"><CalendarDays size={15} className="text-white/80" />{firstDate ? dateTime(firstDate) : 'Fecha a confirmar'}</div><div className="flex items-center gap-2"><MapPin size={15} className="text-white/80" />{location}</div><div className="flex items-center gap-2"><Ticket size={15} className="text-white/80" />{event.ticketTypes.length} entrada{event.ticketTypes.length === 1 ? '' : 's'}</div></div><div className="flex items-center justify-between border-t border-white/15 pt-3"><span className="text-xs text-white/50">Desde</span><span className="text-lg font-black text-red-300">{prices.length ? money(minPrice) : 'Sin precio'}</span></div><a href={href} className="block rounded-2xl bg-red-500 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-400">Comprar</a></div></article>;
  })}</div>{!loading&&!filtered.length&&!error&&<div className="mt-8 card p-6 text-white/70">Todavía no hay eventos publicados.</div>}</section>;
}
