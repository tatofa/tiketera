'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Event } from '@/lib/types';
import { dateTime, money } from '@/lib/format';

export default function TicketSelector({ event }: { event: Event }) {
  const activeTypes = useMemo(() => event.ticketTypes.filter((ticket) => ticket.status === 'active'), [event.ticketTypes]);
  const [eventDateId, setEventDateId] = useState(event.dates[0]?.id || '');
  const [ticketTypeId, setTicketTypeId] = useState(activeTypes[0]?.id || event.ticketTypes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const selectedType = event.ticketTypes.find((t) => t.id === ticketTypeId);
  const max = selectedType?.maxPerOrder || 8;
  const checkoutHref = selectedType && eventDateId
    ? `/checkout?eventId=${event.id}&eventDateId=${eventDateId}&ticketTypeId=${selectedType.id}&qty=${quantity}`
    : '/eventos';

  return (
    <div className="card sticky top-24 p-5">
      <h2 className="text-xl font-black text-white">Comprar entradas</h2>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label">Función</label>
          <select className="input mt-1" value={eventDateId} onChange={(e) => setEventDateId(e.target.value)}>
            {event.dates.map((d) => <option key={d.id} value={d.id}>{dateTime(d.start)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo de entrada</label>
          <select className="input mt-1" value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
            {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name} — {money(t.price, t.currency)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cantidad</label>
          <input className="input mt-1" type="number" min={1} max={max} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} />
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <div className="flex justify-between text-sm text-white/70"><span>Entrada</span><b className="text-white">{money((selectedType?.price || 0) * quantity, selectedType?.currency)}</b></div>
          <p className="mt-2 text-xs text-white/45">El cargo de servicio se calcula en el checkout con la regla global vigente.</p>
        </div>
        {selectedType && eventDateId ? <Link className="btn-primary w-full gap-2" href={checkoutHref}><ShoppingCart size={18} /> Ir al checkout</Link> : <button className="btn-secondary w-full" disabled>Sin entradas disponibles</button>}
      </div>
    </div>
  );
}
