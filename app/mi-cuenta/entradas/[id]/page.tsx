'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { dateTime, money } from '@/lib/format';

type TicketDetail = {
  id: string;
  qr_token: string;
  short_token: string;
  status: string;
  holder_name: string;
  holder_email: string;
  event?: { name: string; slug: string };
  event_date?: { start_datetime: string; end_datetime?: string };
  ticket_type?: { name: string; price: number; currency: string };
  sector?: { name: string };
  order?: { id: string; buyer_email: string; buyer_name: string; status: string; total_amount: number; currency: string; created_at: string };
};

export default function TicketDetailPage(){
 const params=useParams<{id:string}>();
 const [ticket,setTicket]=useState<TicketDetail|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{async function load(){const supabase=createBrowserSupabaseClient(); if(!supabase){setError('Falta configurar Supabase.'); setLoading(false); return;} const {data}=await supabase.auth.getSession(); const token=data.session?.access_token; if(!token){setError('Iniciá sesión para ver esta entrada.'); setLoading(false); return;} const res=await fetch(`/api/account/tickets/${params.id}`,{headers:{Authorization:`Bearer ${token}`}}); const json=await res.json().catch(()=>({})); if(!res.ok){setError(json.error??'No se pudo cargar la entrada.'); setLoading(false); return;} setTicket(json.ticket); setLoading(false);} load();},[params.id]);
 return <section className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-brand-500">Cuenta</p><h1 className="text-4xl font-black text-white">Mi entrada</h1><p className="mt-2 text-white/65">Entrada real emitida desde Supabase.</p></div><Link href="/mi-cuenta/compras" className="btn-secondary">Volver a compras</Link></div>{loading&&<div className="card mt-8 p-6 text-white/70">Cargando entrada real...</div>}{error&&<div className="mt-8 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}{ticket&&<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.8fr]"><div className="card p-7"><span className="badge">{ticket.status}</span><h2 className="mt-4 text-3xl font-black text-white">{ticket.event?.name??'Evento'}</h2><p className="mt-2 text-white/65">{ticket.ticket_type?.name??'Entrada'} · {ticket.sector?.name??'Sector general'}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-white/55">Función</p><p className="mt-1 font-bold text-white">{ticket.event_date?.start_datetime?dateTime(ticket.event_date.start_datetime):'Fecha a confirmar'}</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-white/55">Precio</p><p className="mt-1 font-bold text-white">{money(Number(ticket.ticket_type?.price??0),ticket.ticket_type?.currency??'ARS')}</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-white/55">Titular</p><p className="mt-1 font-bold text-white">{ticket.holder_name}</p><p className="text-sm text-white/55">{ticket.holder_email}</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-white/55">Orden</p><p className="mt-1 font-bold text-white">{ticket.order?.id?.slice(0,13)}...</p><p className="text-sm text-white/55">{ticket.order?.status}</p></div></div>{ticket.event?.slug&&<Link href={`/eventos/${ticket.event.slug}`} className="btn-primary mt-6">Ver evento</Link>}</div><div className="card p-7 text-center"><h2 className="text-2xl font-black text-white">Código de ingreso</h2><div className="mt-6 rounded-3xl border border-white/10 bg-white p-6 text-black"><p className="break-all font-mono text-sm">{ticket.qr_token}</p></div><p className="mt-4 text-sm text-white/55">Token corto</p><p className="mt-1 text-3xl font-black text-white">{ticket.short_token}</p><p className="mt-4 text-xs text-white/45">Mostrá este código en puerta. El scanner validará contra Supabase.</p></div></div>}</section>;
}
