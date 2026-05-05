'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Store, resetDemo } from '@/lib/store';
import { Event } from '@/lib/types';

export default function AdminEventsPage(){
 const [events,setEvents]=useState<Event[]>([]); const load=()=>setEvents(Store.events()); useEffect(load,[]);
 function toggle(id:string){const next=events.map(e=>e.id===id?{...e,status:e.status==='published'?'unpublished':'published'} as Event:e); Store.saveEvents(next); setEvents(next)}
 return <section className="container-page py-10"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-4xl font-black">Eventos</h1><p className="mt-2 text-slate-600">Administrá eventos publicados y borradores.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={()=>{resetDemo(); load();}}>Reset demo</button><Link className="btn-primary" href="/admin/eventos/nuevo">Nuevo evento</Link></div></div><div className="mt-8 overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-4">Evento</th><th>Estado</th><th>Capacidad</th><th>Acciones</th></tr></thead><tbody>{events.map(e=><tr key={e.id} className="border-t"><td className="p-4 font-bold">{e.name}<p className="font-normal text-slate-500">{e.venue}</p></td><td><span className="badge bg-slate-100 text-slate-700">{e.status}</span></td><td>{e.capacity}</td><td className="space-x-2"><Link className="btn-secondary" href={`/admin/eventos/${e.id}`}>Editar</Link><button className="btn-secondary" onClick={()=>toggle(e.id)}>{e.status==='published'?'Despublicar':'Publicar'}</button></td></tr>)}</tbody></table></div></section>
}
