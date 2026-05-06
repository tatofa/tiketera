'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, BadgeCheck, Banknote, Link2, LockKeyhole, Percent, ShieldCheck, Ticket, UserPlus, Users } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import Stats from '@/components/Stats';
import { formatMoney, loadDashboardStats } from '@/lib/supabase-production';

type DashboardStats = { events:number; orders:number; tickets:number; used:number; checkins:number; revenue:number; soldTickets:number; gross:number; fees:number; total:number };

function AdminDashboard(){
 const [stats,setStats]=useState<DashboardStats>({events:0,orders:0,tickets:0,used:0,checkins:0,revenue:0,soldTickets:0,gross:0,fees:0,total:0});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{async function load(){const result=await loadDashboardStats(); if(result.stats) setStats(result.stats); setError(result.ok?'':result.error); setLoading(false);} load();},[]);
 return <section className="container-page py-10">
  <div className="flex flex-wrap items-center justify-between gap-4">
   <div><p className="font-semibold text-disco-yellow">Admin general</p><h1 className="text-4xl font-black">Centro de control</h1><p className="mt-2 max-w-3xl text-white/70">Datos productivos desde Supabase: eventos, ventas, tickets, acreditación y operación.</p></div>
   <div className="flex flex-wrap gap-2"><Link href="/admin/eventos/nuevo" className="btn-primary">Crear evento</Link><Link href="/admin/tickets" className="btn-secondary">Crear e-tickets</Link><Link href="/admin/usuarios" className="btn-secondary">Crear usuario</Link></div>
  </div>
  {error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}
  {loading&&<div className="mt-8 card p-6 text-white/70">Cargando dashboard real desde Supabase...</div>}

  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stats label="Eventos" value={stats.events}/><Stats label="Tickets vendidos" value={stats.soldTickets}/><Stats label="Recaudación" value={formatMoney(stats.total)}/><Stats label="Service charges" value={formatMoney(stats.fees)}/><Stats label="Acreditados" value={stats.checkins}/></div>
  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stats label="Órdenes" value={stats.orders}/><Stats label="Tickets emitidos" value={stats.tickets}/><Stats label="Check-ins usados" value={stats.used}/><Stats label="Subtotal" value={formatMoney(stats.gross)}/><Stats label="Total cobrado" value={formatMoney(stats.revenue)}/></div>

  <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   {[
    ['/admin/usuarios','Usuarios','Alta web de productores, RRPP, acreditadores y compradores.',UserPlus],
    ['/admin/roles','Roles y seguridad','Permisos por admin, productor, RRPP, acreditador y comprador.',ShieldCheck],
    ['/admin/productores','Productores','Gestión de organizadores, eventos propios y permisos.',Users],
    ['/admin/tickets','Tickets y e-tickets','Tipos de entrada, stock, cortesías y envío por email.',Ticket],
    ['/admin/rrpp','RRPP y links','Links trackeables con el mismo cargo global del checkout.',Link2],
    ['/admin/acreditacion','Acreditación','QR/token, puertas, duplicados y entradas usadas.',BadgeCheck],
    ['/admin/reportes','Reportes','Ventas generales, por evento, fecha, canal y RRPP.',BarChart3],
    ['/admin/configuracion/cargos','Cargos de servicio','Cargo único global: porcentaje o fijo, siempre paga comprador.',Percent],
    ['/admin/ventas','Ventas','Órdenes, tickets, compradores y estados.',Banknote],
    ['/scanner','Scanner operativo','Validación rápida desde celular para ingresos.',LockKeyhole]
   ].map(([href,title,text,Icon]: any)=><Link key={href} href={href} className="card p-6 hover:border-disco-yellow/40"><Icon className="text-disco-yellow"/><h2 className="mt-3 font-black">{title}</h2><p className="mt-2 text-sm text-white/60">{text}</p></Link>)}
  </div>

  <div className="mt-8 card p-6"><h2 className="text-xl font-black">Estado productivo</h2><ul className="mt-4 space-y-3 text-sm text-white/70"><li>• Login real requerido.</li><li>• Métricas leídas desde Supabase.</li><li>• Eventos, tickets, órdenes y checkins salen de la base productiva.</li><li>• Las pantallas demo/localStorage se están reemplazando por queries reales.</li></ul></div>
 </section>
}

export default function AdminPage(){
 return <AuthGate allow={['super_admin','admin','producer']} title="Acceso administrativo"><AdminDashboard /></AuthGate>;
}
