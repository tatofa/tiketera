'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { Store, resetDemo } from '@/lib/store';
import { Event } from '@/lib/types';

function AdminEventsContent(){
 const [events,setEvents]=useState<Event[]>([]); const load=()=>setEvents(Store.events()); useEffect(load,[]);
 function toggle(id:string){const next=events.map(e=>e.id===id?{...e,status:e.status==='published'?'unpublished':'published'} as Event:e); Store.saveEvents(next); setEvents(next)}
 return <section className="container-page py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-semibold text-red-300">Productor</p><h1 className="text-4xl font-black text-white">Mis eventos</h1><p className="mt-2 text-white/65">Administrá eventos, funciones, ventas, RRPP y acreditación.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={()=>{resetDemo(); load();}}>Reset demo</button><Link className="btn-primary" href="/admin/eventos/nuevo">Nuevo evento</Link></div></div><div className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-white/5 backdrop-blur"><table className="w-full min-w-[900px] text-sm text-white"><thead className="bg-white/10 text-left text-white/75"><tr><th className="p-4">Evento</th><th className="p-4">Estado</th><th className="p-4">Capacidad</th><th className="p-4">Acciones rápidas</th></tr></thead><tbody>{events.map(e=><tr key={e.id} className="border-t border-white/10 align-top hover:bg-white/5"><td className="p-4"><p className="font-black text-white">{e.name}</p><p className="mt-1 text-white/55">{e.venue}</p></td><td className="p-4"><span className="badge">{e.status}</span></td><td className="p-4 font-bold text-white/80">{e.capacity}</td><td className="p-4"><div className="flex flex-wrap gap-2"><Link className="btn-secondary" href={`/admin/eventos/${e.id}`}>Editar</Link><button className="btn-secondary" onClick={()=>toggle(e.id)}>{e.status==='published'?'Despublicar':'Publicar'}</button><Link className="btn-secondary" href="/admin/rrpp">RRPP</Link><Link className="btn-secondary" href="/scanner">Acreditar</Link><Link className="btn-secondary" href="/admin/reportes">Reportes</Link></div></td></tr>)}</tbody></table></div></section>
}
export default function AdminEventsPage(){return <AuthGate allow={['super_admin','admin','producer']}><AdminEventsContent/></AuthGate>}
