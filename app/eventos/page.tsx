'use client';
import { useEffect, useState } from 'react';
import EventCard from '@/components/EventCard';
import { Store } from '@/lib/store';
import { Event } from '@/lib/types';

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => setEvents(Store.events()), []);
  const filtered = events.filter((e) => e.status === 'published' && `${e.name} ${e.venue}`.toLowerCase().includes(q.toLowerCase()));
  return <section className="container-page py-10"><h1 className="text-4xl font-black">Eventos</h1><p className="mt-2 text-slate-600">Buscá y comprá entradas disponibles.</p><input className="input mt-6 max-w-lg" placeholder="Buscar por nombre o lugar" value={q} onChange={(e) => setQ(e.target.value)} /><div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((event) => <EventCard key={event.id} event={event} />)}</div></section>;
}
