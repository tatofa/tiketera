'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { money, dateTime } from '@/lib/format';

type DbOrder = {
 id: string; status: string; total_amount: number; currency: string; created_at: string; buyer_email: string;
 tickets?: { id: string; status: string; short_token: string; created_at: string; event?: { name: string; slug: string }; event_date?: { start_datetime: string }; ticket_type?: { name: string } }[];
};

function orderEventName(order: DbOrder) {
  return order.tickets?.[0]?.event?.name ?? 'Evento';
}

export default function PurchasesPage(){
  const [dbOrders,setDbOrders]=useState<DbOrder[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    async function load(){
      const supabase=createBrowserSupabaseClient();
      if(!supabase){setError('Falta configurar Supabase.'); setLoading(false); return;}
      const {data}=await supabase.auth.getSession();
      const token=data.session?.access_token;
      if(!token){setError('Iniciá sesión para ver tus compras reales.'); setLoading(false); return;}
      const res=await fetch('/api/account/orders',{headers:{Authorization:`Bearer ${token}`}});
      const json=await res.json().catch(()=>({}));
      if(!res.ok){setError(json.error??'No se pudieron cargar las compras.'); setLoading(false); return;}
      setDbOrders(json.orders ?? []); setLoading(false);
    }
    load();
  },[]);
  return <section className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-brand-500">Cuenta</p><h1 className="text-4xl font-black">Mis compras</h1><p className="mt-2 text-white/65">Historial real de órdenes y tickets desde Supabase.</p></div><Link href="/eventos" className="btn-primary">Comprar entradas</Link></div>{loading&&<p className="mt-8 text-orange-100/70">Cargando historial real...</p>}{error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}{!loading&&!error&&<div className="mt-8 space-y-4">{dbOrders.length?dbOrders.map((order: DbOrder)=><div key={order.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xl font-black text-white">{orderEventName(order)}</p><p className="mt-1 text-sm font-bold text-orange-100/75">Orden {order.id.slice(0,13)}...</p><p className="mt-1 text-sm text-orange-100/60">{dateTime(order.created_at)} · {order.buyer_email}</p></div><span className="badge">{order.status}</span></div><p className="mt-4 text-xl font-black">{money(Number(order.total_amount),order.currency)}</p><div className="mt-4 flex flex-wrap gap-2">{order.tickets?.map(ticket=><Link key={ticket.id} href={`/mi-cuenta/entradas/${ticket.id}`} className="btn-secondary">{ticket.event?.name ?? 'Evento'} · {ticket.ticket_type?.name ?? 'Ticket'} · {ticket.status} · {ticket.short_token}</Link>)}</div></div>):<p className="text-orange-100/60">Todavía no hay compras reales.</p>}</div>}</section>
}
