'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import TicketSelector from '@/components/TicketSelector';
import { Store } from '@/lib/store';
import { Event } from '@/lib/types';
import { dateTime } from '@/lib/format';

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  useEffect(() => setEvent(Store.events().find((e) => e.slug === params.slug) || null), [params.slug]);
  if (event === null) return <section className="container-page py-12"><p>Cargando evento...</p></section>;
  if (!event) return notFound();
  return <section className="container-page py-10"><div className="relative h-[360px] overflow-hidden rounded-3xl"><Image src={event.imageUrl} alt={event.name} fill className="object-cover" /></div><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><div><span className="badge bg-brand-100 text-brand-700">{event.venue}</span><h1 className="mt-4 text-4xl font-black">{event.name}</h1><p className="mt-4 text-lg text-slate-600">{event.description}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="card p-5"><h3 className="font-bold">Funciones</h3>{event.dates.map((d) => <p key={d.id} className="mt-2 text-slate-600">{dateTime(d.start)}</p>)}</div><div className="card p-5"><h3 className="font-bold">Sectores</h3>{event.sectors.map((s) => <p key={s.id} className="mt-2 text-slate-600">{s.name} · capacidad {s.capacity}</p>)}</div></div></div><TicketSelector event={event} /></div></section>;
}
