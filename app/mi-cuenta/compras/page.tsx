'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Store } from '@/lib/store';
import { Order, Ticket } from '@/lib/types';
import { money, dateTime } from '@/lib/format';

export default function PurchasesPage(){
  const [orders,setOrders]=useState<Order[]>([]); const [tickets,setTickets]=useState<Ticket[]>([]);
  useEffect(()=>{setOrders(Store.orders()); setTickets(Store.tickets());},[]);
  return <section className="container-page py-10"><h1 className="text-4xl font-black">Mis compras</h1><div className="mt-8 space-y-4">{orders.length?orders.map(o=><div key={o.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">Orden {o.id.slice(0,13)}...</p><p className="text-sm text-slate-500">{dateTime(o.createdAt)} · {o.buyerEmail}</p></div><span className="badge bg-emerald-100 text-emerald-700">{o.status}</span></div><p className="mt-4 text-xl font-black">{money(o.totalAmount,o.currency)}</p><div className="mt-4 flex flex-wrap gap-2">{o.ticketIds.map(id=>{const t=tickets.find(x=>x.id===id); return <Link key={id} href={`/mi-cuenta/entradas/${id}`} className="btn-secondary">Ticket {id.slice(4,10)} · {t?.status}</Link>})}</div></div>):<p className="text-slate-500">Todavía no hay compras. Agregá entradas desde Eventos.</p>}</div></section>
}
