'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, BadgeCheck, Banknote, Link2, LockKeyhole, Percent, ShieldCheck, Users } from 'lucide-react';
import Stats from '@/components/Stats';
import { Store } from '@/lib/store';
import { money } from '@/lib/format';
import { accreditationStats, formatMoney, getSalesByRrpp, getTotals, serviceFeeConfig } from '@/lib/platform-config';

export default function AdminPage(){
 const [stats,setStats]=useState({events:0,orders:0,tickets:0,revenue:0,used:0});
 useEffect(()=>{const events=Store.events(),orders=Store.orders(),tickets=Store.tickets(); setStats({events:events.length,orders:orders.length,tickets:tickets.length,revenue:orders.reduce((s,o)=>s+o.totalAmount,0),used:tickets.filter(t=>t.status==='used').length});},[]);
 const totals=getTotals();
 const rrpp=getSalesByRrpp();
 const checkins=accreditationStats.reduce((acc,row)=>acc+row.valid,0);
 return <section className="container-page py-10">
  <div className="flex flex-wrap items-center justify-between gap-4">
   <div><p className="font-semibold text-brand-700">Admin general</p><h1 className="text-4xl font-black">Centro de control</h1><p className="mt-2 max-w-3xl text-slate-600">Roles, seguridad, productores, RRPP, links propios, cargos de servicio, acreditación y reportes operativos en una sola consola.</p></div>
   <div className="flex flex-wrap gap-2"><Link href="/admin/eventos/nuevo" className="btn-primary">Crear evento</Link><Link href="/login" className="btn-secondary">Probar login</Link></div>
  </div>

  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stats label="Eventos demo" value={stats.events}/><Stats label="Ventas reales demo" value={totals.tickets}/><Stats label="Recaudación" value={formatMoney(totals.gross)}/><Stats label="Service charges" value={formatMoney(totals.serviceFees)}/><Stats label="Acreditados" value={checkins}/></div>
  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stats label="Órdenes locales" value={stats.orders}/><Stats label="Tickets locales" value={stats.tickets}/><Stats label="Check-ins locales" value={stats.used}/><Stats label="Ingresos locales" value={money(stats.revenue)}/><Stats label="Fee default" value={`${serviceFeeConfig.defaultPercentage}% + ${formatMoney(serviceFeeConfig.defaultFixedAmount)}`}/></div>

  <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   {[
    ['/admin/roles','Roles y seguridad','Permisos por admin, productor, RRPP, acreditador y comprador.',ShieldCheck],
    ['/admin/productores','Productores','Gestión de organizadores, eventos propios y permisos.',Users],
    ['/admin/rrpp','RRPP y links','Links trackeables, comisiones y ventas por promotor.',Link2],
    ['/admin/acreditacion','Acreditación','QR/token, puertas, duplicados y entradas usadas.',BadgeCheck],
    ['/admin/reportes','Reportes','Ventas generales, por evento, fecha, canal y RRPP.',BarChart3],
    ['/admin/configuracion/cargos','Cargos de servicio','Porcentaje, fijo, mínimo, máximo y reglas por canal.',Percent],
    ['/admin/ventas','Ventas','Órdenes, tickets, compradores y estados.',Banknote],
    ['/scanner','Scanner operativo','Validación rápida desde celular para ingresos.',LockKeyhole]
   ].map(([href,title,text,Icon]: any)=><Link key={href} href={href} className="card p-6 hover:shadow-md"><Icon className="text-brand-700"/><h2 className="mt-3 font-black">{title}</h2><p className="mt-2 text-sm text-slate-600">{text}</p></Link>)}
  </div>

  <div className="mt-8 grid gap-6 lg:grid-cols-2">
   <div className="card p-6"><h2 className="text-xl font-black">Top RRPP</h2><div className="mt-4 space-y-3">{rrpp.map(row=><div key={row.code} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="font-bold">/{row.code}</p><p className="text-sm text-slate-600">{row.tickets} tickets vendidos</p></div><p className="font-black">{formatMoney(row.gross)}</p></div>)}</div></div>
   <div className="card p-6"><h2 className="text-xl font-black">Seguridad operativa</h2><ul className="mt-4 space-y-3 text-sm text-slate-700"><li>• RBAC por rol y permisos.</li><li>• RLS preparado para Supabase en la capa SQL.</li><li>• QR/token único con estado: válido, usado, cancelado o reembolsado.</li><li>• Reportes exportables y segmentados por canal / RRPP.</li><li>• Cargos de servicio configurables desde admin general.</li></ul></div>
  </div>
 </section>
}
