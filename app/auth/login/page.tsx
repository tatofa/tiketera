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
 const [loading,setLoading]=useState(false);
 async function submit(e: React.FormEvent){
  e.preventDefault(); setLoading(true); setError('');
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables de Supabase.'); setLoading(false); return;}
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error){setError(error.message); setLoading(false); return;}
  router.push('/mi-cuenta/compras'); router.refresh();
 }
 return <section className="container-page py-14"><div className="mx-auto max-w-md card p-8"><p className="font-bold text-brand-500">Acceso</p><h1 className="mt-2 text-4xl font-black">Iniciar sesión</h1><p className="mt-2 text-orange-100/70">Ingresá para comprar, ver historial o administrar tus eventos.</p><form onSubmit={submit} className="mt-8 space-y-4"><div><label className="label">Email</label><input className="input mt-1" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div><label className="label">Contraseña</label><input className="input mt-1" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<p className="rounded-xl bg-red-950/70 p-3 text-sm text-red-100">{error}</p>}<button className="btn-primary w-full" disabled={loading}>{loading?'Ingresando...':'Entrar'}</button></form><p className="mt-6 text-center text-sm text-orange-100/70">¿No tenés cuenta? <Link className="font-bold text-brand-500" href="/auth/registro">Crear cuenta</Link></p></div></section>
}
