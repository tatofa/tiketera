import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { Event } from '@/lib/types';
import { dateTime, money } from '@/lib/format';

const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop';

function eventPublicPath(event: Event) {
  const slugOrId = String(event.slug || event.id || '').trim();
  return `/eventos/${encodeURIComponent(slugOrId)}`;
}

export default function EventCard({ event }: { event: Event }) {
  const prices = event.ticketTypes.map((ticket) => ticket.price).filter((price) => Number.isFinite(price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const firstDate = event.dates[0]?.start;

  return (
    <Link href={eventPublicPath(event)} className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 via-black/80 to-black shadow-xl shadow-black/50 transition-all hover:-translate-y-1 hover:border-white/25 hover:shadow-red-950/30">
      <div className="relative h-52 overflow-hidden">
        <Image src={event.imageUrl || fallbackImage} alt={event.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs font-black text-white backdrop-blur">{event.status}</span>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-xl font-black text-white">{event.name}</h3>
        <p className="line-clamp-2 text-sm text-white/65">{event.description || 'Evento disponible próximamente.'}</p>
        <div className="space-y-2 text-sm text-white/60">
          <div className="flex items-center gap-2"><MapPin size={16} className="text-white/80" />{event.venue || 'Lugar a confirmar'}</div>
          <div className="flex items-center gap-2"><CalendarDays size={16} className="text-white/80" />{firstDate ? dateTime(firstDate) : 'Fecha a confirmar'}</div>
        </div>
        <div className="flex items-center justify-between border-t border-white/15 pt-4">
          <span className="text-sm text-white/50">Desde</span>
          <span className="text-lg font-black text-red-300">{prices.length ? money(minPrice) : 'Sin precio'}</span>
        </div>
      </div>
    </Link>
  );
}
