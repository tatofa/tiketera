'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type EventRow = {
  id: string;
  name: string;
  status: string;
  capacity: number;
  created_at?: string;
};

type TicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  price: number;
  status: string;
  max_per_order: number;
};

type SalesRow = {
  order_id: string;
  created_at: string;
  status: string;
  channel: string;
  event_id: string;
  event_name: string;
  producer_name: string | null;
  rrpp_code: string | null;
  rrpp_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal_amount: number | null;
  service_fee_amount: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  currency: string | null;
};

type ReportState = {
  loading: boolean;
  error: string;
  events: EventRow[];
  ticketTypes: TicketTypeRow[];
  sales: SalesRow[];
};

function formatMoney(amount: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

function asNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

function ReportesContent(){
 const [state,setState]=useState<ReportState>({loading:true,error:'',events:[],ticketTypes:[],sales:[]});
 const [selected,setSelected]=useState('');

 useEffect(()=>{
  async function load(){
   const supabase=createBrowserSupabaseClient();
   if(!supabase){setState({loading:false,error:'Falta configurar Supabase.',events:[],ticketTypes:[],sales:[]}); return;}
   const {data:sessionData}=await supabase.auth.getSession();
   if(!sessionData.session){setState({loading:false,error:'Sesión vencida. Volvé a ingresar.',events:[],ticketTypes:[],sales:[]}); return;}

   const [eventsRes,ticketsRes,salesRes]=await Promise.all([
    supabase.from('events').select('id,name,status,capacity,created_at').order('created_at',{ascending:false}),
    supabase.from('ticket_types').select('id,event_id,name,price,status,max_per_order').order('sale_start',{ascending:false}),
    supabase.from('sales_report').select('order_id,created_at,status,channel,event_id,event_name,producer_name,rrpp_code,rrpp_name,quantity,unit_price,subtotal_amount,service_fee_amount,discount_amount,total_amount,currency').order('created_at',{ascending:false})
   ]);

   if(eventsRes.error){setState({loading:false,error:eventsRes.error.message,events:[],ticketTypes:[],sales:[]}); return;}
   if(ticketsRes.error){setState({loading:false,error:ticketsRes.error.message,events:eventsRes.data as EventRow[] ?? [],ticketTypes:[],sales:[]}); return;}
   if(salesRes.error){setState({loading:false,error:salesRes.error.message,events:eventsRes.data as EventRow[] ?? [],ticketTypes:ticketsRes.data as TicketTypeRow[] ?? [],sales:[]}); return;}

   const events=(eventsRes.data ?? []) as EventRow[];
   setState({loading:false,error:'',events,ticketTypes:(ticketsRes.data ?? []) as TicketTypeRow[],sales:(salesRes.data ?? []) as SalesRow[]});
   setSelected(current=>current || events[0]?.id || '');
  }
  load();
 },[]);

 const eventRows=useMemo(()=>state.sales.filter(row=>!selected || row.event_id===selected),[state.sales,selected]);
 const eventTicketTypes=useMemo(()=>state.ticketTypes.filter(row=>!selected || row.event_id===selected),[state.ticketTypes,selected]);

 const totals=useMemo(()=>{
  const uniqueOrders=new Map<string,SalesRow>();
  state.sales.forEach(row=>{if(row.order_id&&!uniqueOrders.has(row.order_id)) uniqueOrders.set(row.order_id,row);});
  const tickets=state.sales.reduce((sum,row)=>sum+asNumber(row.quantity),0);
  const gross=Array.from(uniqueOrders.values()).reduce((sum,row)=>sum+asNumber(row.subtotal_amount),0);
  const serviceFees=Array.from(uniqueOrders.values()).reduce((sum,row)=>sum+asNumber(row.service_fee_amount),0);
  const total=Array.from(uniqueOrders.values()).reduce((sum,row)=>sum+asNumber(row.total_amount),0);
  return {tickets,gross,serviceFees,total};
 },[state.sales]);

 const eventTotals=useMemo(()=>{
  const uniqueOrders=new Map<string,SalesRow>();
  eventRows.forEach(row=>{if(row.order_id&&!uniqueOrders.has(row.order_id)) uniqueOrders.set(row.order_id,row);});
  const tickets=eventRows.reduce((sum,row)=>sum+asNumber(row.quantity),0);
  const gross=Array.from(uniqueOrders.values()).reduce((sum,row)=>sum+asNumber(row.subtotal_amount),0);
  const serviceFees=Array.from(uniqueOrders.values()).reduce((sum,row)=>sum+asNumber(row.service_fee_amount),0);
  const total=Array.from(uniqueOrders.values()).reduce((sum,row)=>sum+asNumber(row.total_amount),0);
  return {tickets,gross,serviceFees,total};
 },[eventRows]);

 const byRrpp=useMemo(()=>{
  const map=new Map<string,{code:string;name:string;tickets:number;gross:number}>();
  eventRows.forEach(row=>{
   const code=row.rrpp_code || 'web';
   const current=map.get(code)??{code,name:row.rrpp_name || (code==='web'?'Venta web':'RRPP'),tickets:0,gross:0};
   current.tickets+=asNumber(row.quantity);
   current.gross+=asNumber(row.quantity)*asNumber(row.unit_price);
   map.set(code,current);
  });
  return Array.from(map.values()).sort((a,b)=>b.gross-a.gross);
 },[eventRows]);

 const selectedEvent=state.events.find(event=>event.id===selected);

 if(state.loading) return <section className="container-page py-10"><div className="card p-6 text-white">Cargando reportes reales desde Supabase...</div></section>;

 return <section className="container-page py-10"><p className="font-semibold text-red-300">Reportes</p><h1 className="text-4xl font-black text-white">Ventas y rendimiento</h1><p className="mt-2 text-white/65">Datos reales de producción desde Supabase. Sin datos demo/localStorage.</p>{state.error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{state.error}</div>}<div className="mt-8 grid gap-4 md:grid-cols-4"><div className="card p-5"><p className="text-sm text-white/55">Eventos</p><p className="text-3xl font-black text-white">{state.events.length}</p></div><div className="card p-5"><p className="text-sm text-white/55">Tickets vendidos</p><p className="text-3xl font-black text-white">{totals.tickets}</p></div><div className="card p-5"><p className="text-sm text-white/55">Bruto</p><p className="text-3xl font-black text-white">{formatMoney(totals.gross)}</p></div><div className="card p-5"><p className="text-sm text-white/55">Total cobrado</p><p className="text-3xl font-black text-white">{formatMoney(totals.total)}</p></div></div><div className="mt-8 card p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-white">Reporte por evento</h2><p className="mt-1 text-sm text-white/60">Seleccioná un evento real creado en Supabase.</p></div><select className="input max-w-sm" value={selected} onChange={e=>setSelected(e.target.value)}>{state.events.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}</select></div>{!state.events.length&&<div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">Todavía no hay eventos productivos cargados.</div>}{selectedEvent&&<div className="mt-6 grid gap-4 md:grid-cols-5"><div className="rounded-2xl bg-white/8 p-4"><p className="text-sm text-white/55">Estado</p><p className="text-2xl font-black text-white">{selectedEvent.status}</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-sm text-white/55">Capacidad</p><p className="text-2xl font-black text-white">{selectedEvent.capacity}</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-sm text-white/55">Tickets vendidos</p><p className="text-2xl font-black text-white">{eventTotals.tickets}</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-sm text-white/55">Bruto evento</p><p className="text-2xl font-black text-white">{formatMoney(eventTotals.gross)}</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-sm text-white/55">Total evento</p><p className="text-2xl font-black text-white">{formatMoney(eventTotals.total)}</p></div></div>}<div className="mt-6 grid gap-6 lg:grid-cols-2"><div><h3 className="font-black text-white">Tipos de entrada configurados</h3><div className="mt-3 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm text-white"><thead className="bg-white/10 text-left"><tr><th className="p-3">Tipo</th><th className="p-3">Precio</th><th className="p-3">Máx/compra</th><th className="p-3">Estado</th></tr></thead><tbody>{eventTicketTypes.map(row=><tr key={row.id} className="border-t border-white/10"><td className="p-3 font-bold">{row.name}</td><td className="p-3">{formatMoney(asNumber(row.price))}</td><td className="p-3">{row.max_per_order}</td><td className="p-3"><span className="badge">{row.status}</span></td></tr>)}{!eventTicketTypes.length&&<tr><td className="p-3 text-white/55" colSpan={4}>Este evento todavía no tiene tipos de entrada.</td></tr>}</tbody></table></div></div><div><h3 className="font-black text-white">Ventas por canal / RRPP</h3><div className="mt-3 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm text-white"><thead className="bg-white/10 text-left"><tr><th className="p-3">Canal</th><th className="p-3">Tickets</th><th className="p-3">Bruto</th></tr></thead><tbody>{byRrpp.map(row=><tr key={row.code} className="border-t border-white/10"><td className="p-3 font-mono">{row.code==='web'?'web':`/${row.code}`}</td><td className="p-3">{row.tickets}</td><td className="p-3 font-bold">{formatMoney(row.gross)}</td></tr>)}{!byRrpp.length&&<tr><td className="p-3 text-white/55" colSpan={3}>Todavía no hay ventas para este evento.</td></tr>}</tbody></table></div></div></div></div><div className="mt-8 card p-6"><h2 className="text-xl font-black text-white">Detalle de ventas reales</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm text-white"><thead><tr className="border-b border-white/15 text-left text-white/65"><th className="p-3">Fecha</th><th className="p-3">Evento</th><th className="p-3">Estado</th><th className="p-3">Canal</th><th className="p-3">RRPP</th><th className="p-3">Tickets</th><th className="p-3">Subtotal</th><th className="p-3">Cargos</th><th className="p-3">Total</th></tr></thead><tbody>{state.sales.map((row,index)=><tr key={`${row.order_id}-${index}`} className="border-b border-white/10"><td className="p-3">{row.created_at?new Date(row.created_at).toLocaleDateString('es-AR'):'—'}</td><td className="p-3 font-medium">{row.event_name ?? '—'}</td><td className="p-3">{row.status}</td><td className="p-3">{row.channel}</td><td className="p-3 font-mono">{row.rrpp_code??'—'}</td><td className="p-3">{asNumber(row.quantity)}</td><td className="p-3">{formatMoney(asNumber(row.subtotal_amount))}</td><td className="p-3">{formatMoney(asNumber(row.service_fee_amount))}</td><td className="p-3 font-bold">{formatMoney(asNumber(row.total_amount))}</td></tr>)}{!state.sales.length&&<tr><td className="p-3 text-white/55" colSpan={9}>Todavía no hay ventas productivas. Cuando entren órdenes pagas, aparecen acá.</td></tr>}</tbody></table></div></div></section>
}
export default function ReportesPage(){return <AuthGate allow={['super_admin','admin','producer']}><ReportesContent/></AuthGate>}
