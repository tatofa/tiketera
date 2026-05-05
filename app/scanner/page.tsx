'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { toast } from 'sonner';
import { validateTicket } from '@/lib/store';
import { Ticket } from '@/lib/types';

const QrReader = dynamic(() => import('@/components/QRScanner'), { ssr: false });

export default function ScannerPage(){
 const [manual,setManual]=useState(''); const [last,setLast]=useState<{ok:boolean;message:string;ticket:Ticket|null}|null>(null);
 function validate(token:string){const res=validateTicket(token.trim()); setLast(res); res.ok?toast.success(res.message):toast.error(res.message)}
 return <section className="container-page py-10"><h1 className="text-4xl font-black">Scanner de ingreso</h1><p className="mt-2 text-slate-600">Escaneá un QR o pegá el token de una entrada demo.</p><div className="mt-8 grid gap-8 lg:grid-cols-2"><div className="card p-5"><h2 className="text-xl font-black">Cámara</h2><QrReader onResult={validate}/></div><div className="card p-5"><h2 className="text-xl font-black">Validación manual</h2><div className="mt-4 flex gap-2"><input className="input" placeholder="TICKETERA:..." value={manual} onChange={e=>setManual(e.target.value)}/><button className="btn-primary" onClick={()=>validate(manual)}>Validar</button></div>{last&&<div className={`mt-6 rounded-2xl p-5 ${last.ok?'bg-emerald-50 text-emerald-900':'bg-red-50 text-red-900'}`}><h3 className="font-black">{last.ok?'Acceso permitido':'Acceso rechazado'}</h3><p>{last.message}</p>{last.ticket&&<p className="mt-2 break-all text-sm">Ticket: {last.ticket.id}</p>}</div>}</div></div></section>
}
