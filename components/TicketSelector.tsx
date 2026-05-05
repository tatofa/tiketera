'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { addToCart } from '@/lib/store';
import { Event } from '@/lib/types';
import { dateTime, money } from '@/lib/format';

export default function TicketSelector({ event }: { event: Event }) {
  const [eventDateId, setEventDateId] = useState(event.dates[0]?.id || '');
  const [ticketTypeId, setTicketTypeId] = useState(event.ticketTypes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const selectedType = event.ticketTypes.find((t) => t.id === ticketTypeId);

  function onAdd() {
    if (!selectedType || !eventDateId) return;
    addToCart({ eventId: event.id, eventDateId, ticketTypeId, quantity });
    toast.success('Entradas agregadas al carrito');
  }

  return (
    <div className="card p-5 sticky top-24">
      <h2 className="text-xl font-black">Comprar entradas</h2>
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
            {event.ticketTypes.map((t) => <option key={t.id} value={t.id}>{t.name} — {money(t.price, t.currency)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cantidad</label>
          <input className="input mt-1" type="number" min={1} max={selectedType?.maxPerOrder || 8} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex justify-between text-sm"><span>Total</span><b>{money((selectedType?.price || 0) * quantity, selectedType?.currency)}</b></div>
          <p className="mt-2 text-xs text-slate-500">La reserva del carrito debería vencer en 10 minutos en modo producción.</p>
        </div>
        <button className="btn-primary w-full gap-2" onClick={onAdd}><ShoppingCart size={18} /> Agregar al carrito</button>
        <a href="/checkout" className="btn-secondary w-full">Ir al checkout</a>
      </div>
    </div>
  );
}
