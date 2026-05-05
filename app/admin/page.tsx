'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Stats from '@/components/Stats';
import { Store } from '@/lib/store';
import { money } from '@/lib/format';

export default function AdminPage(){
 const [stats,setStats]=useState({events:0,orders:0,tickets:0,revenue:0,used:0});
 useEffect(()=>{const events=Store.events(),orders=Store.orders(),tickets=Store.tickets(); setStats({events:events.length,orders:orders.length,tickets:tickets.length,revenue:orders.reduce((s,o)=>s+o.totalAmount,0),used:tickets.filter(t=>t.status==='used').length});},[]);
 return <section className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-brand-700">Panel administrativo</p><h1 className="text-4xl font-black">Dashboard</h1></div><Link href="/admin/eventos/nuevo" className="btn-primary">Crear evento</Link></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stats label="Eventos" value={stats.events}/><Stats label="Órdenes" value={stats.orders}/><Stats label="Tickets" value={stats.tickets}/><Stats label="Check-ins" value={stats.used}/><Stats label="Ingresos" value={money(stats.revenue)}/></div><div className="mt-8 grid gap-4 md:grid-cols-3"><Link href="/admin/eventos" className="card p-6 hover:shadow-md"><h2 className="font-black">Gestionar eventos</h2><p className="mt-2 text-sm text-slate-600">Alta, edición, publicación, sectores y precios.</p></Link><Link href="/admin/ventas" className="card p-6 hover:shadow-md"><h2 className="font-black">Ventas</h2><p className="mt-2 text-sm text-slate-600">Órdenes, tickets y compradores.</p></Link><Link href="/admin/reportes" className="card p-6 hover:shadow-md"><h2 className="font-black">Reportes</h2><p className="mt-2 text-sm text-slate-600">Exportación CSV inicial.</p></Link></div></section>
}
