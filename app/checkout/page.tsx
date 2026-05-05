'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPaidOrder, Store } from '@/lib/store';
import { CartItem, Event } from '@/lib/types';
import { money } from '@/lib/format';

export default function CheckoutPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyerName, setBuyerName] = useState('Cliente Demo');
  const [buyerEmail, setBuyerEmail] = useState('cliente@demo.com');
  useEffect(() => { setEvents(Store.events()); setCart(Store.cart()); }, []);
  const rows = useMemo(() => cart.map((item) => {
    const event = events.find((e) => e.id === item.eventId)!;
    const type = event?.ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    return { item, event, type, subtotal: (type?.price || 0) * item.quantity };
  }).filter((x) => x.event && x.type), [cart, events]);
  const total = rows.reduce((s, r) => s + r.subtotal, 0);
  function pay() {
    if (!cart.length) return toast.error('El carrito está vacío');
    if (!buyerEmail || !buyerName) return toast.error('Completá los datos del comprador');
    const order = createPaidOrder({ buyerName, buyerEmail, items: cart });
    toast.success('Pago demo aprobado');
    router.push(`/checkout/exito?order=${order.id}`);
  }
  return <section className="container-page py-10"><h1 className="text-4xl font-black">Checkout</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]"><div className="card p-5"><h2 className="text-xl font-black">Datos del comprador</h2><div className="mt-5 grid gap-4"><div><label className="label">Nombre</label><input className="input mt-1" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div><div><label className="label">Email</label><input className="input mt-1" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} /></div><div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Modo demo: el pago se aprueba automáticamente. En producción se conecta Mercado Pago, Stripe u otro proveedor.</div><button className="btn-primary" onClick={pay}>Pagar {money(total)}</button></div></div><aside className="card p-5"><h2 className="text-xl font-black">Resumen</h2><div className="mt-5 space-y-4">{rows.length ? rows.map((r, i) => <div key={i} className="border-b border-slate-100 pb-4"><p className="font-bold">{r.event.name}</p><p className="text-sm text-slate-600">{r.type.name} × {r.item.quantity}</p><p className="mt-1 font-black">{money(r.subtotal, r.type.currency)}</p></div>) : <p className="text-slate-500">No hay entradas en el carrito.</p>}<div className="flex justify-between text-xl font-black"><span>Total</span><span>{money(total)}</span></div></div></aside></div></section>;
}
