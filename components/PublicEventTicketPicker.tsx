'use client';

import { useMemo, useState } from 'react';
import type { Event } from '@/lib/types';
import { money } from '@/lib/format';

type Props = {
  event: Event;
  rrppCode?: string;
};

export default function PublicEventTicketPicker({ event, rrppCode = '' }: Props) {
  const activeTickets = event.ticketTypes.filter((ticket) => ticket.status === 'active');
  const firstDate = event.dates.find((date) => date.status === 'active') ?? event.dates[0];
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selectedItems = useMemo(() => activeTickets
    .map((ticket) => ({ ticket, quantity: quantities[ticket.id] ?? 0 }))
    .filter((item) => item.quantity > 0), [activeTickets, quantities]);

  const subtotal = selectedItems.reduce((sum, item) => sum + item.ticket.price * item.quantity, 0);
  const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  function setQuantity(ticketId: string, nextQty: number, max: number) {
    const cleanQty = Math.max(0, Math.min(max, Number.isFinite(nextQty) ? nextQty : 0));
    setQuantities((current) => ({ ...current, [ticketId]: cleanQty }));
  }

  function checkoutHref() {
    if (!firstDate || !selectedItems.length) return '';
    const params = new URLSearchParams({
      eventId: event.id,
      eventDateId: firstDate.id,
      items: selectedItems.map((item) => `${item.ticket.id}:${item.quantity}`).join(',')
    });
    if (rrppCode) params.set('rrpp', rrppCode);
    return `/checkout?${params.toString()}`;
  }

  const href = checkoutHref();

  return <aside className="card p-6">
    <h2 className="text-2xl font-black text-white">Entradas</h2>
    <p className="mt-1 text-sm text-white/60">Elegí una o más entradas para continuar al checkout.</p>

    {!firstDate && <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">Este evento no tiene función activa.</div>}
    {!activeTickets.length && <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">No hay entradas activas para este evento.</div>}

    <div className="mt-5 space-y-3">
      {activeTickets.map((ticket) => {
        const qty = quantities[ticket.id] ?? 0;
        const max = Math.max(1, Number(ticket.maxPerOrder ?? 1));
        return <div key={ticket.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-black text-white">{ticket.name}</h3>
              <p className="mt-1 text-sm text-white/55">Máximo {max} por compra</p>
            </div>
            <p className="text-lg font-black text-red-300">{money(ticket.price, ticket.currency)}</p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" className="h-10 w-10 rounded-full bg-white/10 text-xl font-black text-white disabled:opacity-35" disabled={qty <= 0} onClick={() => setQuantity(ticket.id, qty - 1, max)}>−</button>
            <input className="input w-24 text-center" type="number" min="0" max={max} value={qty} onChange={(e) => setQuantity(ticket.id, Number(e.target.value), max)} />
            <button type="button" className="h-10 w-10 rounded-full bg-white/10 text-xl font-black text-white disabled:opacity-35" disabled={qty >= max} onClick={() => setQuantity(ticket.id, qty + 1, max)}>+</button>
          </div>
        </div>;
      })}
    </div>

    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex justify-between text-sm text-white/65"><span>Cantidad</span><strong className="text-white">{totalQty}</strong></div>
      <div className="mt-2 flex justify-between text-lg font-black text-white"><span>Subtotal</span><span>{money(subtotal)}</span></div>
      <p className="mt-2 text-xs text-white/45">El cargo por servicio se calcula en el checkout.</p>
    </div>

    {href ? <a className="btn-primary mt-5 w-full" href={href}>Continuar al checkout</a> : <button className="btn-secondary mt-5 w-full" disabled>Seleccioná una entrada</button>}
  </aside>;
}
