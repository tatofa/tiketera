'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Store } from '@/lib/store';
import { Order, Ticket } from '@/lib/types';
import { money, dateTime } from '@/lib/format';

type DbOrder = {
 id: string; status: string; total_amount: number; currency: string; created_at: string; buyer_email: string;
 tickets?: { id: string; status: string; short_token: string; created_at: string; event?: { name: string; slug: string }; event_date?: { start_datetime: string }; ticket_type?: { name: string } }[];
};

export default function PurchasesPage(){
  const [orders,setOrders]=useState<Order[]>([]);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [dbOrders,setDbOrders]=useState<DbOrder[]>([]);
  const [loading,setLoading]=useState(true);
  const [usingDemo,setUsingDemo]=useState(false);
  useEffect(()=>{
    async function load(){
      const supabase=createBrowserSupabaseClient();
      if(!supabase){setOrders(Store.orders()); setTickets(Store.tickets()); setUsingDemo(true); setLoading(false); return;}
      const {data}=await supabase.auth.getSession();
      const token=data.session?.access_token;
      if(!token){setOrders(Store.orders()); setTickets(Store.tickets()); setUsingDemo(true); setLoading(false); return;}
      const res=await fetch('/api/account/orders',{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){setOrders(Store.orders()); setTickets(Store.tickets()); setUsingDemo(true); setLoading(false); return;}
      const json=await res.json(); setDbOrders(json.orders ?? []); setLoading(false);
    }
    load();
  },[]);
  return <section className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-brand-500">Cuenta</p><h1 className="text-4xl font-black">Mis compras</h1></div><Link href="/eventos" className="btn-primary">Comprar entradas</Link></div>{loading&&<p className="mt-8 text-orange-100/70">Cargando historial...</p>}{!loading&&usingDemo&&<div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">Modo local: iniciá sesión con Supabase para ver compras reales.</div>}{!loading&&!usingDemo&&<div className="mt-8 space-y-4">{dbOrders.length?dbOrders.map(o=><div key={o.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">Orden {o.id.slice(0,13)}...</p><p className="text-sm text-orange-100/60">{dateTime(o.created_at)} · {o.buyer_email}</p></div><span className="badge">{o.status}</span></div><p className="mt-4 text-xl font-black">{money(Number(o.total_amount),o.currency)}</p><div className="mt-4 flex flex-wrap gap-2">{o.tickets?.map(t=><Link key={t.id} href={`/mi-cuenta/entradas/${t.id}`} className="btn-secondary">{t.event?.name ?? 'Evento'} · {t.status} · {t.short_token}</Link>)}</div></div>):<p className="text-orange-100/60">Todavía no hay compras reales.</p>}</div>}{!loading&&usingDemo&&<div className="mt-8 space-y-4">{orders.length?orders.map(o=><div key={o.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">Orden {o.id.slice(0,13)}...</p><p className="text-sm text-orange-100/60">{dateTime(o.createdAt)} · {o.buyerEmail}</p></div><span className="badge">{o.status}</span></div><p className="mt-4 text-xl font-black">{money(o.totalAmount,o.currency)}</p><div className="mt-4 flex flex-wrap gap-2">{o.ticketIds.map(id=>{const t=tickets.find(x=>x.id===id); return <Link key={id} href={`/mi-cuenta/entradas/${id}`} className="btn-secondary">Ticket {id.slice(4,10)} · {t?.status}</Link>})}</div></div>):<p className="text-orange-100/60">Todavía no hay compras.</p>}</div>}</section>
}
