'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { toast } from 'sonner';
import AuthGate from '@/components/AuthGate';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const QrReader = dynamic(() => import('@/components/QRScanner'), { ssr: false });

type Session = { event: { id: string; name: string; slug: string; eventCode?: string }; eventDate: { id: string; startDatetime: string; endDatetime?: string } };
type ScannedTicket = {
 id?: string;
 status?: string;
 short_token?: string;
 holder_name?: string;
 holder_email?: string;
 event?: { name?: string } | null;
 event_date?: { start_datetime?: string; end_datetime?: string } | null;
 ticket_type?: { name?: string; price?: number; currency?: string } | null;
 sector?: { name?: string } | null;
};
type ScanResult = { ok:boolean; message:string; ticket:ScannedTicket|null };

function fmt(value?: string) {
 if (!value) return 'Sin definir';
 return new Date(value).toLocaleString('es-AR');
}

function ScannerContent(){
 const [eventCode,setEventCode]=useState('');
 const [eventKey,setEventKey]=useState('');
 const [session,setSession]=useState<Session|null>(null);
 const [manual,setManual]=useState('');
 const [last,setLast]=useState<ScanResult|null>(null);
 const [loading,setLoading]=useState(false);
 async function startSession(){
  setLoading(true); setLast(null);
  const supabase=createBrowserSupabaseClient();
  if(!supabase){toast.error('Falta configurar Supabase.'); setLoading(false); return;}
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token){toast.error('Iniciá sesión como acreditador.'); setLoading(false); return;}
  const res=await fetch('/api/scanner/session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({eventCode,eventKey})});
  const json=await res.json();
  if(!res.ok){toast.error(json.error ?? 'No se pudo iniciar acreditación.'); setLoading(false); return;}
  setSession(json); toast.success(`Acreditación iniciada: ${json.event.name}`); setLoading(false);
 }
 async function validate(tokenValue:string){
  const clean=tokenValue.trim();
  if(!clean) return;
  if(!session){toast.error('Primero ingresá el código y la llave del evento.'); return;}
  const supabase=createBrowserSupabaseClient();
  if(!supabase){toast.error('Falta configurar Supabase.'); return;}
  const {data}=await supabase.auth.getSession();
  const authToken=data.session?.access_token;
  if(!authToken){toast.error('Sesión vencida.'); return;}
  const res=await fetch('/api/scanner/validate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${authToken}`},body:JSON.stringify({token:clean,eventId:session.event.id,eventDateId:session.eventDate.id})});
  const json=await res.json();
  const result:ScanResult={ok:!!json.ok,message:json.message ?? json.error ?? 'Validación procesada',ticket:json.ticket ?? null};
  setLast(result);
  result.ok?toast.success(result.message):toast.error(result.message);
 }
 return <section className="container-page py-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-disco-yellow">Acreditación</p><h1 className="text-4xl font-black">Scanner de ingreso</h1><p className="mt-2 text-white/70">Ingresá código y llave del evento. La validación queda limitada a ese evento y función.</p></div>{session&&<button className="btn-secondary" onClick={()=>setSession(null)}>Cambiar evento</button>}</div>{!session&&<div className="card mt-8 max-w-xl p-6"><h2 className="text-xl font-black">Iniciar acreditación</h2><p className="mt-2 text-white/70">Usá el código y la llave del evento que figuran en Mis eventos. Esto evita validar entradas de otro evento.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><label><span className="label">Código de evento</span><input className="input mt-1 uppercase" placeholder="CHNG2903" value={eventCode} onChange={e=>setEventCode(e.target.value.toUpperCase())}/></label><label><span className="label">Llave de evento</span><input className="input mt-1 uppercase" placeholder="A8F2K9" value={eventKey} onChange={e=>setEventKey(e.target.value.toUpperCase())}/></label></div><button className="btn-primary mt-4 w-full" disabled={loading||!eventCode||!eventKey} onClick={startSession}>{loading?'Validando...':'Entrar al scanner'}</button></div>}{session&&<div className="mt-8 grid gap-8 lg:grid-cols-2"><div className="card p-5"><div className="mb-4 rounded-2xl bg-disco-green/10 p-4"><p className="text-sm text-white/60">Acreditando</p><h2 className="text-xl font-black">{session.event.name}</h2><p className="text-sm text-white/60">Código: {session.event.eventCode ?? eventCode}</p><p className="text-sm text-white/60">Función: {new Date(session.eventDate.startDatetime).toLocaleString('es-AR')}</p></div><QrReader onResult={validate}/></div><div className="card p-5"><h2 className="text-xl font-black">Validación manual</h2><div className="mt-4 flex gap-2"><input className="input" placeholder="QR o token breve" value={manual} onChange={e=>setManual(e.target.value)}/><button className="btn-primary" onClick={()=>validate(manual)}>Validar</button></div>{last&&<div className={`mt-6 rounded-2xl p-5 ${last.ok?'bg-emerald-950/70 text-emerald-100':'bg-red-950/70 text-red-100'}`}><h3 className="text-2xl font-black">{last.ok?'Acceso permitido':'Acceso rechazado'}</h3><p className="mt-1">{last.message}</p>{last.ticket&&<div className="mt-5 grid gap-3 text-sm md:grid-cols-2"><div className="rounded-2xl bg-black/20 p-3"><p className="opacity-70">Titular</p><p className="font-black">{last.ticket.holder_name||'Sin titular'}</p><p className="opacity-70">{last.ticket.holder_email||''}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="opacity-70">Tipo de entrada</p><p className="font-black">{last.ticket.ticket_type?.name||'Entrada'}</p><p className="opacity-70">{last.ticket.sector?.name||'Sector general'}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="opacity-70">Código corto</p><p className="font-black tracking-widest">{last.ticket.short_token||'—'}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="opacity-70">Válido hasta</p><p className="font-black">{fmt(last.ticket.event_date?.end_datetime||session.eventDate.endDatetime)}</p></div><div className="rounded-2xl bg-black/20 p-3 md:col-span-2"><p className="opacity-70">Descripción</p><p className="font-black">{last.ticket.event?.name||session.event.name} · {last.ticket.ticket_type?.name||'Entrada'} · {last.ticket.sector?.name||'Sector general'}</p></div></div>}</div>}</div></div>}</section>
}

export default function ScannerPage(){
 return <AuthGate allow={['super_admin','admin','accreditor']} title="Acceso para acreditadores"><ScannerContent /></AuthGate>;
}
