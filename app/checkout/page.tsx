'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ShieldCheck, Ticket } from 'lucide-react';
import { loadEventsFromSupabase } from '@/lib/supabase-events';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { Event, TicketType } from '@/lib/types';

type FeeConfig = { mode: 'percent' | 'fixed'; value: number; minFee?: number; maxFee?: number | null; currency: string };
type SelectedItem = { ticketType: TicketType; quantity: number };

function ars(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
}

function calcServiceFee(subtotal: number, fee: FeeConfig) {
  const raw = fee.mode === 'percent' ? subtotal * (fee.value / 100) : fee.value;
  const minFee = Number(fee.minFee ?? 0);
  const maxFee = fee.maxFee == null ? null : Number(fee.maxFee);
  const withMin = Math.max(raw, minFee);
  return Math.round(maxFee && maxFee > 0 ? Math.min(withMin, maxFee) : withMin);
}

function parseItemsParam(value: string | null) {
  if (!value) return [] as { ticketTypeId: string; quantity: number }[];
  return value.split(',').map((part) => {
    const [ticketTypeId, qtyRaw] = part.split(':');
    return { ticketTypeId: String(ticketTypeId ?? '').trim(), quantity: Math.max(1, Number(qtyRaw ?? 1)) };
  }).filter((item) => item.ticketTypeId && item.quantity > 0);
}

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [buyer, setBuyer] = useState({ name: '', email: '' });
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({ mode: 'percent', value: 12, minFee: 0, maxFee: null, currency: 'ARS' });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const qty = Math.max(1, Number(params.get('qty') ?? params.get('quantity') ?? 1));

  useEffect(() => {
    async function load() {
      const eventResult = await loadEventsFromSupabase({ publicOnly: true });
      setEvents(eventResult.events);
      if (!eventResult.ok) setError(eventResult.error ?? 'No se pudieron cargar eventos.');

      const feeRes = await fetch('/api/service-fee');
      const feeJson = await feeRes.json().catch(() => ({}));
      if (feeJson.fee) setFeeConfig(feeJson.fee);

      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
          setBuyer({ name: profile?.full_name || user.user_metadata?.full_name || '', email: user.email || '' });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const selected = useMemo(() => {
    const eventParam = params.get('event') ?? params.get('eventId') ?? params.get('slug');
    const dateParam = params.get('eventDateId') ?? params.get('date');
    const singleTicketParam = params.get('ticket') ?? params.get('ticketTypeId') ?? params.get('type');
    const requestedItems = parseItemsParam(params.get('items'));
    const event = events.find((item) => item.id === eventParam || item.slug === eventParam) ?? events.find((item) => item.status === 'published') ?? events[0];
    const eventDate = event?.dates.find((date) => date.id === dateParam) ?? event?.dates[0];
    let items: SelectedItem[] = [];

    if (event && requestedItems.length) {
      items = requestedItems.map((requested) => {
        const ticketType = event.ticketTypes.find((ticket) => ticket.id === requested.ticketTypeId);
        if (!ticketType) return null;
        return { ticketType, quantity: requested.quantity };
      }).filter(Boolean) as SelectedItem[];
    }

    if (event && !items.length) {
      const ticketType = event.ticketTypes.find((ticket) => ticket.id === singleTicketParam || ticket.name.toLowerCase() === String(singleTicketParam ?? '').toLowerCase()) ?? event.ticketTypes[0];
      if (ticketType) items = [{ ticketType, quantity: qty }];
    }

    return { event, eventDate, items };
  }, [events, params, qty]);

  if (loading) {
    return <section className="container-page py-12"><div className="card p-8 text-white/70">Cargando checkout real desde Supabase...</div></section>;
  }

  if (!selected.event || !selected.eventDate || !selected.items.length) {
    return <section className="container-page py-12"><div className="card p-8"><h1 className="text-3xl font-black text-white">Checkout</h1>{error&&<p className="mt-2 text-red-200">{error}</p>}<p className="mt-2 text-white/65">No encontramos entradas seleccionadas.</p><Link href="/eventos" className="btn-primary mt-6">Volver a eventos</Link></div></section>;
  }

  const subtotal = selected.items.reduce((sum, item) => sum + item.ticketType.price * item.quantity, 0);
  const serviceFee = calcServiceFee(subtotal, feeConfig);
  const total = subtotal + serviceFee;
  const totalQty = selected.items.reduce((sum, item) => sum + item.quantity, 0);

  async function pay() {
    setPaying(true);
    setError('');
    const supabase = createBrowserSupabaseClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventId: selected.event!.id,
        eventDateId: selected.eventDate!.id,
        items: selected.items.map((item) => ({ ticketTypeId: item.ticketType.id, quantity: item.quantity })),
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        channel: 'web'
      })
    });
    const json = await res.json().catch(() => ({}));
    setPaying(false);
    if (!res.ok) {
      setError(json.error ?? 'No se pudo crear la orden.');
      return;
    }
    router.push(`/checkout/exito?order=${json.orderId}`);
  }

  return (
    <section className="container-page py-12">
      <h1 className="text-5xl font-black text-white">Checkout</h1>
      <p className="mt-2 text-white/65">Revisá el detalle antes de confirmar la orden.</p>
      {error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_.75fr]">
        <div className="card p-7">
          <h2 className="text-2xl font-black text-white">Datos del comprador</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label><span className="label">Nombre</span><input className="input mt-1" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Nombre y apellido" /></label>
            <label><span className="label">Email</span><input className="input mt-1" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} placeholder="email@dominio.com" /></label>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-1 text-red-200"/><div><p className="font-black text-white">Orden real</p><p className="mt-1 text-sm text-white/65">Si estás logueado, la compra queda asociada a tu cuenta.</p></div></div>
          </div>
          <button onClick={pay} disabled={paying || !buyer.name || !buyer.email} className="btn-primary mt-6 w-full"><CreditCard size={18} className="mr-2"/>{paying ? 'Confirmando...' : `Confirmar orden ${ars(total)}`}</button>
        </div>

        <aside className="card p-7">
          <h2 className="text-2xl font-black text-white">Resumen</h2>
          <div className="mt-6 rounded-2xl bg-white/5 p-4">
            <div className="flex items-start gap-3"><Ticket className="mt-1 text-red-200"/><div><h3 className="font-black text-white">{selected.event.name}</h3><p className="mt-1 text-white/55">{totalQty} entrada{totalQty === 1 ? '' : 's'}</p></div></div>
          </div>
          <div className="mt-5 space-y-3">
            {selected.items.map((item) => <div key={item.ticketType.id} className="flex justify-between gap-4 rounded-2xl bg-white/5 p-3 text-sm text-white/70"><span>{item.ticketType.name} × {item.quantity}</span><strong className="text-white">{ars(item.ticketType.price * item.quantity)}</strong></div>)}
          </div>
          <div className="mt-6 space-y-3 border-b border-white/15 pb-5 text-sm">
            <div className="flex justify-between gap-4 text-white/70"><span>Entrada</span><strong className="text-white">{ars(subtotal)}</strong></div>
            <div className="flex justify-between gap-4 text-white/70"><span>Cargo por servicio</span><strong className="text-white">{ars(serviceFee)}</strong></div>
          </div>
          <div className="mt-5 flex items-center justify-between text-2xl font-black text-white"><span>Total</span><span>{ars(total)}</span></div>
        </aside>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<section className="container-page py-12"><div className="card p-8">Cargando checkout...</div></section>}><CheckoutContent /></Suspense>;
}
