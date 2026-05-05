'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function LoginPage(){
 const router=useRouter();
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [needsConfirmation,setNeedsConfirmation]=useState(false);
 const [loading,setLoading]=useState(false);
 const [resending,setResending]=useState(false);
 async function submit(e: React.FormEvent){
  e.preventDefault(); setLoading(true); setError(''); setMessage(''); setNeedsConfirmation(false);
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables de Supabase.'); setLoading(false); return;}
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error){
   const isUnconfirmed=error.message.toLowerCase().includes('not confirmed');
   setNeedsConfirmation(isUnconfirmed);
   setError(isUnconfirmed?'Tu email todavía no está confirmado. Revisá tu correo o reenviá el email de confirmación.':error.message);
   setLoading(false); return;
  }
  router.push('/mi-cuenta/compras'); router.refresh();
 }
 async function resendConfirmation(){
  setResending(true); setError(''); setMessage('');
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables de Supabase.'); setResending(false); return;}
  const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:`${window.location.origin}/auth/login`}});
  setResending(false);
  if(error){setError(error.message); return;}
  setMessage('Te reenviamos el email de confirmación. Revisá tu casilla y spam.');
 }
 return <section className="container-page py-14"><div className="mx-auto max-w-md card p-8"><p className="font-bold text-brand-500">Acceso</p><h1 className="mt-2 text-4xl font-black">Iniciar sesión</h1><p className="mt-2 text-white/65">Ingresá para comprar, ver historial o administrar tus eventos.</p><form onSubmit={submit} className="mt-8 space-y-4"><div><label className="label">Email</label><input className="input mt-1" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div><label className="label">Contraseña</label><input className="input mt-1" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<div className="rounded-xl bg-red-950/70 p-3 text-sm text-red-100"><p>{error}</p>{needsConfirmation&&<button type="button" onClick={resendConfirmation} disabled={resending||!email} className="mt-3 rounded-lg border border-red-200/30 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">{resending?'Reenviando...':'Reenviar confirmación'}</button>}</div>}{message&&<p className="rounded-xl bg-emerald-950/70 p-3 text-sm text-emerald-100">{message}</p>}<button className="btn-primary w-full" disabled={loading}>{loading?'Ingresando...':'Entrar'}</button></form><p className="mt-6 text-center text-sm text-white/65">¿No tenés cuenta? <Link className="font-bold text-brand-500" href="/auth/registro">Crear cuenta</Link></p></div></section>
}
