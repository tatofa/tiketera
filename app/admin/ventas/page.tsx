'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Filter, Ticket } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { formatMoney, loadSalesReport, num } from '@/lib/supabase-production';
import { loadEventsFromSupabase } from '@/lib/supabase-events';
import type { Event } from '@/lib/types';

type SalesRow = {
  order_id: string;
  created_at: string;
  status: string;
  channel: string;
  event_id: string;
  event_name: string;
  rrpp_code: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal_amount: number | null;
  service_fee_amount: number | null;
  total_amount: number | null;
};

type EventOption = { id: string; name: string };

function VentasContent(){
 const [rows,setRows]=useState<SalesRow[]>([]);
 const [events,setEvents]=useState<EventOption[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [eventFilter,setEventFilter]=useState('');
 const [channelFilter,setChannelFilter]=useState('');
 useEffect(()=>{async function load(){const [salesResult,eventsResult]=await Promise.all([loadSalesReport(),loadEventsFromSupabase()]); const loadedEvents: Event[] = eventsResult.events; setRows(salesResult.rows as SalesRow[]); setEvents(loadedEvents.map((event: Event)=>({id:event.id,name:event.name}))); setError(salesResult.ok&&eventsResult.ok?'':salesResult.error||eventsResult.error||'No se pudieron cargar ventas.'); setLoading(false);} load();},[]);
 const filtered=rows.filter((row: SalesRow)=>(!eventFilter||row.event_id===eventFilter)&&(!channelFilter||row.channel===channelFilter));
 const totals=useMemo(()=>{const uniqueOrders=new Map<string,SalesRow>(); filtered.forEach((row: SalesRow)=>{if(row.order_id&&!uniqueOrders.has(row.order_id)) uniqueOrders.set(row.order_id,row);}); return {tickets:filtered.reduce((s:number,r:SalesRow)=>s+num(r.quantity),0),gross:Array.from(uniqueOrders.values()).reduce((s:number,r:SalesRow)=>s+num(r.subtotal_amount),0),fees:Array.from(uniqueOrders.values()).reduce((s:number,r:SalesRow)=>s+num(r.service_fee_amount),0),total:Array.from(uniqueOrders.values()).reduce((s:number,r:SalesRow)=>s+num(r.total_amount),0)}},[filtered]);
 return <section className="container-page py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-semibold text-red-300">Comercial</p><h1 className="text-4xl font-black text-white">Ventas</h1><p className="mt-2 max-w-3xl text-white/65">Órdenes, tickets vendidos, cargos de servicio y totales reales desde Supabase.</p></div><Link href="/admin/reportes" className="btn-secondary">Ver reportes avanzados</Link></div>{error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}{loading&&<div className="mt-8 card p-6 text-white/70">Cargando ventas reales...</div>}<div className="mt-8 grid gap-4 md:grid-cols-4"><div className="card p-5"><Ticket className="text-red-200"/><p className="mt-3 text-sm text-white/55">Tickets vendidos</p><p className="text-3xl font-black text-white">{totals.tickets}</p></div><div className="card p-5"><Banknote className="text-red-200"/><p className="mt-3 text-sm text-white/55">Subtotal</p><p className="text-3xl font-black text-white">{formatMoney(totals.gross)}</p></div><div className="card p-5"><Filter className="text-red-200"/><p className="mt-3 text-sm text-white/55">Cargos</p><p className="text-3xl font-black text-white">{formatMoney(totals.fees)}</p></div><div className="card p-5"><CalendarDays className="text-red-200"/><p className="mt-3 text-sm text-white/55">Total</p><p className="text-3xl font-black text-white">{formatMoney(totals.total)}</p></div></div><div className="mt-8 card p-6"><h2 className="text-xl font-black text-white">Filtros</h2><div className="mt-4 grid gap-3 md:grid-cols-4"><select className="input" value={eventFilter} onChange={e=>setEventFilter(e.target.value)}><option value="">Todos los eventos</option>{events.map((event: EventOption)=><option key={event.id} value={event.id}>{event.name}</option>)}</select><select className="input" value={channelFilter} onChange={e=>setChannelFilter(e.target.value)}><option value="">Todos los canales</option><option value="web">web</option><option value="rrpp">rrpp</option><option value="door">door</option><option value="box_office">box_office</option></select><input className="input" type="date" disabled/><input className="input" placeholder="Buscar RRPP" disabled/></div><p className="mt-3 text-xs text-white/45">Los eventos del filtro salen de la tabla events, aunque todavía no tengan ventas.</p></div><div className="mt-8 card p-6"><h2 className="text-xl font-black text-white">Detalle de ventas</h2>{filtered.length?<div className="mt-4 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm text-white"><thead className="bg-white/10 text-left text-white/70"><tr><th className="p-3">Fecha</th><th className="p-3">Evento</th><th className="p-3">Estado</th><th className="p-3">Canal</th><th className="p-3">RRPP</th><th className="p-3">Tickets</th><th className="p-3">Subtotal</th><th className="p-3">Cargos</th><th className="p-3">Total</th></tr></thead><tbody>{filtered.map((row: SalesRow,index:number)=><tr key={`${row.order_id}-${index}`} className="border-t border-white/10 hover:bg-white/5"><td className="p-3">{row.created_at?new Date(row.created_at).toLocaleDateString('es-AR'):'—'}</td><td className="p-3 font-bold">{row.event_name??events.find((event: EventOption)=>event.id===row.event_id)?.name??'—'}</td><td className="p-3">{row.status}</td><td className="p-3">{row.channel}</td><td className="p-3 font-mono">{row.rrpp_code??'—'}</td><td className="p-3">{num(row.quantity)}</td><td className="p-3">{formatMoney(num(row.subtotal_amount))}</td><td className="p-3">{formatMoney(num(row.service_fee_amount))}</td><td className="p-3 font-black">{formatMoney(num(row.total_amount))}</td></tr>)}</tbody></table></div>:<div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-10 text-center"><h3 className="text-2xl font-black text-white">Todavía no hay ventas registradas</h3><p className="mx-auto mt-2 max-w-lg text-white/60">Los eventos ya aparecen en filtros. Cuando entren órdenes reales en Supabase, aparecen acá.</p><div className="mt-6 flex justify-center gap-3"><Link href="/eventos" className="btn-primary">Ver eventos</Link><Link href="/admin/eventos/nuevo" className="btn-secondary">Crear evento</Link></div></div>}</div></section>
}
export default function VentasPage(){return <AuthGate allow={['super_admin','admin','producer']}><VentasContent/></AuthGate>}
