'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Store } from '@/lib/store';
import { Event } from '@/lib/types';

export default function EditEventPage(){
 const {id}=useParams<{id:string}>(); const router=useRouter(); const [event,setEvent]=useState<Event|null>(null);
 useEffect(()=>setEvent(Store.events().find(e=>e.id===id)||null),[id]);
 function save(){if(!event)return; Store.saveEvents(Store.events().map(e=>e.id===event.id?event:e)); router.push('/admin/eventos')}
 if(!event)return <section className="container-page py-10">Evento no encontrado.</section>;
 return <section className="container-page py-10"><h1 className="text-4xl font-black">Editar evento</h1><div className="card mt-8 max-w-3xl p-6"><div className="grid gap-4"><div><label className="label">Nombre</label><input className="input mt-1" value={event.name} onChange={e=>setEvent({...event,name:e.target.value})}/></div><div><label className="label">Lugar</label><input className="input mt-1" value={event.venue} onChange={e=>setEvent({...event,venue:e.target.value})}/></div><div><label className="label">Descripción</label><textarea className="input mt-1 min-h-28" value={event.description} onChange={e=>setEvent({...event,description:e.target.value})}/></div><div><label className="label">Imagen URL</label><input className="input mt-1" value={event.imageUrl} onChange={e=>setEvent({...event,imageUrl:e.target.value})}/></div><div><label className="label">Estado</label><select className="input mt-1" value={event.status} onChange={e=>setEvent({...event,status:e.target.value as Event['status']})}><option value="draft">draft</option><option value="published">published</option><option value="unpublished">unpublished</option><option value="cancelled">cancelled</option></select></div><h2 className="mt-4 text-xl font-black">Tipos de entrada</h2>{event.ticketTypes.map((t,i)=><div key={t.id} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"><input className="input" value={t.name} onChange={e=>setEvent({...event,ticketTypes:event.ticketTypes.map((x,idx)=>idx===i?{...x,name:e.target.value}:x)})}/><input className="input" type="number" value={t.price} onChange={e=>setEvent({...event,ticketTypes:event.ticketTypes.map((x,idx)=>idx===i?{...x,price:Number(e.target.value)}:x)})}/></div>)}<button className="btn-primary" onClick={save}>Guardar cambios</button></div></div></section>
}
