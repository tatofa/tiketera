'use client';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import EventCard from '@/components/EventCard';
import { Store } from '@/lib/store';
import { Event } from '@/lib/types';

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => setEvents(Store.events()), []);
  const filtered = events.filter((e) => e.status === 'published' && `${e.name} ${e.venue}`.toLowerCase().includes(q.toLowerCase()));
  return <section className="container-page py-10"><h1 className="text-4xl font-black text-white">Eventos</h1><p className="mt-2 text-white/65">Buscá y comprá entradas disponibles.</p><div className="mt-6 flex max-w-3xl items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-whiteglow backdrop-blur"><Search size={20} className="text-white/55"/><input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45" placeholder="Buscar por nombre o lugar" value={q} onChange={(e) => setQ(e.target.value)} /></div><div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((event) => <EventCard key={event.id} event={event} />)}</div></section>;
}
