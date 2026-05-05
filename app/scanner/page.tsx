'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { validateTicket } from '@/lib/store';
import { Ticket } from '@/lib/types';

const QrReader = dynamic(() => import('@/components/QRScanner'), { ssr: false });

type Session = { event: { id: string; name: string; slug: string }; eventDate: { id: string; startDatetime: string; endDatetime?: string } };

export default function ScannerPage(){
 const [eventCode,setEventCode]=useState('');
 const [session,setSession]=useState<Session|null>(null);
 const [manual,setManual]=useState('');
 const [last,setLast]=useState<{ok:boolean;message:string;ticket:Ticket|null}|null>(null);
 const [loading,setLoading]=useState(false);
 const [demoMode,setDemoMode]=useState(false);
 async function startSession(){
  setLoading(true); setLast(null);
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setDemoMode(true); setSession({event:{id:'demo',name:'Evento demo local',slug:'demo'},eventDate:{id:'demo-date',startDatetime:new Date().toISOString()}}); setLoading(false); return;}
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token){toast.error('Iniciá sesión como acreditador.'); setLoading(false); return;}
  const res=await fetch('/api/scanner/session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({eventCode})});
  const json=await res.json();
  if(!res.ok){toast.error(json.error ?? 'No se pudo iniciar acreditación.'); setLoading(false); return;}
  setSession(json); setDemoMode(false); toast.success(`Acreditación iniciada: ${json.event.name}`); setLoading(false);
 }
 async function validate(tokenValue:string){
  const clean=tokenValue.trim();
  if(!clean) return;
  if(!session){toast.error('Primero ingresá el código del evento.'); return;}
  if(demoMode){const res=validateTicket(clean); setLast(res); res.ok?toast.success(res.message):toast.error(res.message); return;}
  const supabase=createBrowserSupabaseClient();
  if(!supabase) return;
  const {data}=await supabase.auth.getSession();
  const authToken=data.session?.access_token;
  if(!authToken){toast.error('Sesión vencida.'); return;}
  const res=await fetch('/api/scanner/validate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${authToken}`},body:JSON.stringify({token:clean,eventId:session.event.id,eventDateId:session.eventDate.id})});
  const json=await res.json();
  const result={ok:!!json.ok,message:json.message ?? json.error ?? 'Validación procesada',ticket:null};
  setLast(result);
  result.ok?toast.success(result.message):toast.error(result.message);
 }
 return <section className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-brand-500">Acreditación</p><h1 className="text-4xl font-black">Scanner de ingreso</h1><p className="mt-2 text-orange-100/70">Primero ingresá el código del evento o función. La validación queda limitada a ese evento y esa fecha.</p></div>{session&&<button className="btn-secondary" onClick={()=>setSession(null)}>Cambiar evento</button>}</div>{!session&&<div className="card mt-8 max-w-xl p-6"><h2 className="text-xl font-black">Iniciar acreditación</h2><p className="mt-2 text-orange-100/70">Usá el código de función/evento entregado al acreditador. Recomendado: usar ID de función para evitar validar entradas de otro día.</p><div className="mt-4 flex gap-2"><input className="input" placeholder="Código de evento o función" value={eventCode} onChange={e=>setEventCode(e.target.value)}/><button className="btn-primary" disabled={loading} onClick={startSession}>{loading?'Validando...':'Entrar'}</button></div></div>}{session&&<div className="mt-8 grid gap-8 lg:grid-cols-2"><div className="card p-5"><div className="mb-4 rounded-2xl bg-orange-500/10 p-4"><p className="text-sm text-orange-100/60">Acreditando</p><h2 className="text-xl font-black">{session.event.name}</h2><p className="text-sm text-orange-100/60">Función: {new Date(session.eventDate.startDatetime).toLocaleString('es-AR')}</p></div><QrReader onResult={validate}/></div><div className="card p-5"><h2 className="text-xl font-black">Validación manual</h2><div className="mt-4 flex gap-2"><input className="input" placeholder="QR o token breve" value={manual} onChange={e=>setManual(e.target.value)}/><button className="btn-primary" onClick={()=>validate(manual)}>Validar</button></div>{last&&<div className={`mt-6 rounded-2xl p-5 ${last.ok?'bg-emerald-950/70 text-emerald-100':'bg-red-950/70 text-red-100'}`}><h3 className="font-black">{last.ok?'Acceso permitido':'Acceso rechazado'}</h3><p>{last.message}</p>{last.ticket&&<p className="mt-2 break-all text-sm">Ticket: {last.ticket.id}</p>}</div>}</div></div>}</section>
}
