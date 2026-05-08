'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type ProducerRow = {
  id: string;
  name: string;
  legal_name?: string | null;
  email?: string | null;
  status?: string | null;
  owner_profile_id?: string | null;
  events?: { id: string; name: string; capacity: number; status: string }[];
  producer_members?: { profile_id: string; role: string }[];
};

function ProductoresContent(){
 const [rows,setRows]=useState<ProducerRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{async function load(){const supabase=createBrowserSupabaseClient(); if(!supabase){setError('Falta configurar Supabase.'); setLoading(false); return;} const {data}=await supabase.auth.getSession(); if(!data.session){setError('Sesión vencida. Volvé a ingresar.'); setLoading(false); return;} const {data:producers,error}=await supabase.from('producers').select('id,name,legal_name,email,status,owner_profile_id,events(id,name,capacity,status),producer_members(profile_id,role)').order('created_at',{ascending:false}); if(error){setError(error.message); setLoading(false); return;} setRows((producers??[]) as ProducerRow[]); setLoading(false);} load();},[]);
 const totals=useMemo(()=>({events:rows.reduce((s,row)=>s+(row.events?.length??0),0),capacity:rows.reduce((s,row)=>s+(row.events??[]).reduce((a,e)=>a+(Number(e.capacity)||0),0),0),members:rows.reduce((s,row)=>s+(row.producer_members?.length??0),0)}),[rows]);
 return <section className="container-page py-10"><p className="font-semibold text-red-300">Organizadores</p><h1 className="text-4xl font-black text-white">Productores</h1><p className="mt-2 text-white/65">Productores reales desde Supabase, con sus eventos y miembros asociados.</p>{error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}{loading&&<div className="mt-8 card p-6 text-white/70">Cargando productores reales...</div>}<div className="mt-8 grid gap-4 md:grid-cols-3"><div className="card p-5"><p className="text-sm text-white/55">Productores</p><p className="mt-2 text-3xl font-black text-white">{rows.length}</p></div><div className="card p-5"><p className="text-sm text-white/55">Eventos asociados</p><p className="mt-2 text-3xl font-black text-white">{totals.events}</p></div><div className="card p-5"><p className="text-sm text-white/55">Miembros</p><p className="mt-2 text-3xl font-black text-white">{totals.members}</p></div></div><div className="mt-8 grid gap-4 md:grid-cols-2">{rows.map(producer=><div key={producer.id} className="card p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black text-white">{producer.name}</h2><p className="mt-1 text-sm text-white/55">{producer.email??'Sin email'}</p></div><span className="badge">{producer.status??'active'}</span></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-black text-white">{producer.events?.length??0}</p><p className="text-xs text-white/55">eventos</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-black text-white">{(producer.events??[]).reduce((s,e)=>s+(Number(e.capacity)||0),0)}</p><p className="text-xs text-white/55">capacidad</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-black text-white">{producer.producer_members?.length??0}</p><p className="text-xs text-white/55">miembros</p></div></div><div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-black text-white">Eventos</p><div className="mt-3 space-y-2">{producer.events?.length?producer.events.map(event=><div key={event.id} className="flex items-center justify-between gap-3 text-sm text-white/65"><span>{event.name}</span><span className="badge">{event.status}</span></div>):<p className="text-sm text-white/45">Sin eventos cargados.</p>}</div></div></div>)}{!loading&&!rows.length&&!error&&<div className="card p-6 text-white/65">Todavía no hay productores productivos.</div>}</div></section>;
}

export default function ProductoresPage(){return <AuthGate allow={['super_admin','admin']}><ProductoresContent/></AuthGate>}
