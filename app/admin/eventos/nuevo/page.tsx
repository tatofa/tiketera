'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuid } from 'uuid';
import { Store } from '@/lib/store';
import { Event } from '@/lib/types';

const slugify=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
export default function NewEventPage(){
 const router=useRouter(); const [form,setForm]=useState({name:'Nuevo Evento',venue:'Lugar a definir',description:'Descripción del evento',imageUrl:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop',capacity:500,price:10000});
 function save(){const id=`evt_${uuid()}`; const sectorId=`sec_${uuid()}`; const e:Event={id,name:form.name,slug:slugify(form.name),venue:form.venue,description:form.description,imageUrl:form.imageUrl,status:'draft',capacity:Number(form.capacity),dates:[{id:`date_${uuid()}`,eventId:id,start:new Date(Date.now()+7*86400000).toISOString(),status:'active'}],sectors:[{id:sectorId,eventId:id,name:'General',capacity:Number(form.capacity)}],ticketTypes:[{id:`tt_${uuid()}`,eventId:id,sectorId,name:'General',price:Number(form.price),currency:'ARS',saleStart:new Date().toISOString(),saleEnd:new Date(Date.now()+6*86400000).toISOString(),maxPerOrder:6,status:'active'}]}; Store.saveEvents([e,...Store.events()]); router.push('/admin/eventos')}
 return <section className="container-page py-10"><h1 className="text-4xl font-black">Crear evento</h1><div className="card mt-8 max-w-2xl p-6"><div className="grid gap-4">{(['name','venue','description','imageUrl'] as const).map(k=><div key={k}><label className="label">{k}</label><input className="input mt-1" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}<div className="grid grid-cols-2 gap-4"><div><label className="label">Capacidad</label><input className="input mt-1" type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></div><div><label className="label">Precio general</label><input className="input mt-1" type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></div></div><button className="btn-primary" onClick={save}>Guardar borrador</button></div></div></section>
}
