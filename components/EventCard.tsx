import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { Event } from '@/lib/types';
import { dateTime, money } from '@/lib/format';

export default function EventCard({ event }: { event: Event }) {
  const minPrice = Math.min(...event.ticketTypes.map((t) => t.price));
  return (
    <Link href={`/eventos/${event.slug}`} className="group card overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="relative h-52 overflow-hidden">
        <Image src={event.imageUrl} alt={event.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="badge absolute left-4 top-4 bg-white/90 text-brand-700">{event.status}</span>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-xl font-black text-slate-950">{event.name}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{event.description}</p>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2"><MapPin size={16} />{event.venue}</div>
          <div className="flex items-center gap-2"><CalendarDays size={16} />{dateTime(event.dates[0].start)}</div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-500">Desde</span>
          <span className="text-lg font-black text-brand-700">{money(minPrice)}</span>
        </div>
      </div>
    </Link>
  );
}
