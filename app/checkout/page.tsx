'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ShieldCheck, Ticket } from 'lucide-react';
import { Store } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { serviceFeeConfig } from '@/lib/platform-config';
import type { Event } from '@/lib/types';

function ars(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function serviceFee(subtotal: number) {
  const raw = subtotal * (serviceFeeConfig.defaultPercentage / 100) + serviceFeeConfig.defaultFixedAmount;
  return Math.min(serviceFeeConfig.maxFee, Math.max(serviceFeeConfig.minFee, raw));
}

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [buyer, setBuyer] = useState({ name: '', email: '' });
  const qty = Math.max(1, Number(params.get('qty') ?? params.get('quantity') ?? 1));

  useEffect(() => {
    setEvents(Store.events());
    async function loadBuyer() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      setBuyer({ name: profile?.full_name || user.user_metadata?.full_name || '', email: user.email || '' });
    }
    loadBuyer();
  }, []);

  const selected = useMemo(() => {
    const eventParam = params.get('event') ?? params.get('eventId') ?? params.get('slug');
    const ticketParam = params.get('ticket') ?? params.get('ticketTypeId') ?? params.get('type');
    const event = events.find((item) => item.id === eventParam || item.slug === eventParam) ?? events.find((item) => item.status === 'published') ?? events[0];
    const ticketType = event?.ticketTypes.find((ticket) => ticket.id === ticketParam || ticket.name.toLowerCase() === String(ticketParam ?? '').toLowerCase()) ?? event?.ticketTypes[0];
    return { event, ticketType };
  }, [events, params]);

  if (!selected.event || !selected.ticketType) {
    return <section className="container-page py-12"><div className="card p-8"><h1 className="text-3xl font-black text-white">Checkout</h1><p className="mt-2 text-white/65">No encontramos entradas seleccionadas.</p><Link href="/eventos" className="btn-primary mt-6">Volver a eventos</Link></div></section>;
  }

  const subtotal = selected.ticketType.price * qty;
  const fee = serviceFee(subtotal);
  const total = subtotal + fee;
  const orderId = `ord_${Date.now()}`;

  function pay() {
    router.push(`/checkout/exito?order=${orderId}`);
  }

  return (
    <section className="container-page py-12">
      <h1 className="text-5xl font-black text-white">Checkout</h1>
      <p className="mt-2 text-white/65">Revisá el detalle antes de pagar. El costo de servicio siempre lo abona el comprador.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_.75fr]">
        <div className="card p-7">
          <h2 className="text-2xl font-black text-white">Datos del comprador</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label><span className="label">Nombre</span><input className="input mt-1" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Nombre y apellido" /></label>
            <label><span className="label">Email</span><input className="input mt-1" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} placeholder="email@dominio.com" /></label>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-1 text-red-200"/><div><p className="font-black text-white">Pago seguro</p><p className="mt-1 text-sm text-white/65">El pago real se conecta con Mercado Pago, Stripe u otro proveedor. El total ya incluye el costo de servicio.</p></div></div>
          </div>
          <button onClick={pay} className="btn-primary mt-6 w-full"><CreditCard size={18} className="mr-2"/>Pagar {ars(total)}</button>
        </div>

        <aside className="card p-7">
          <h2 className="text-2xl font-black text-white">Resumen</h2>
          <div className="mt-6 rounded-2xl bg-white/5 p-4">
            <div className="flex items-start gap-3"><Ticket className="mt-1 text-red-200"/><div><h3 className="font-black text-white">{selected.event.name}</h3><p className="mt-1 text-white/55">{selected.ticketType.name} × {qty}</p></div></div>
          </div>
          <div className="mt-6 space-y-3 border-b border-white/15 pb-5 text-sm">
            <div className="flex justify-between gap-4 text-white/70"><span>Entradas</span><strong className="text-white">{ars(subtotal)}</strong></div>
            <div className="flex justify-between gap-4 text-white/70"><span>Costo de servicio</span><strong className="text-white">{ars(fee)}</strong></div>
            <p className="rounded-xl bg-white/5 p-3 text-xs text-white/55">Cargo calculado: {serviceFeeConfig.defaultPercentage}% + {ars(serviceFeeConfig.defaultFixedAmount)}, con mínimo {ars(serviceFeeConfig.minFee)} y máximo {ars(serviceFeeConfig.maxFee)}.</p>
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
