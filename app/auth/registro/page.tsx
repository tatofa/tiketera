'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function RegisterPage(){
 const router=useRouter();
 const [form,setForm]=useState({fullName:'',email:'',password:'',phone:''});
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(false);
 async function submit(e: React.FormEvent){
  e.preventDefault(); setLoading(true); setError(''); setMessage('');
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables de Supabase.'); setLoading(false); return;}
  const {data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.fullName,phone:form.phone}}});
  if(error){setError(error.message); setLoading(false); return;}
  if(data.user){
   await supabase.from('profiles').upsert({id:data.user.id,full_name:form.fullName,phone:form.phone || null,role:'buyer',active:true});
   await supabase.from('user_role_assignments').upsert({profile_id:data.user.id,role:'buyer',active:true});
  }
  setMessage('Cuenta creada. Ya podés iniciar sesión.');
  setLoading(false);
  setTimeout(()=>router.push('/auth/login'),900);
 }
 return <section className="container-page py-14"><div className="mx-auto max-w-lg card p-8"><p className="font-bold text-brand-500">Registro</p><h1 className="mt-2 text-4xl font-black">Crear cuenta</h1><p className="mt-2 text-orange-100/70">Todos los usuarios se registran como compradores. Luego un productor o admin puede sumar roles operativos.</p><form onSubmit={submit} className="mt-8 grid gap-4"><div><label className="label">Nombre completo</label><input className="input mt-1" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required/></div><div><label className="label">Email</label><input className="input mt-1" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div><div><label className="label">Teléfono</label><input className="input mt-1" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div><label className="label">Contraseña</label><input className="input mt-1" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6}/></div>{error&&<p className="rounded-xl bg-red-950/70 p-3 text-sm text-red-100">{error}</p>}{message&&<p className="rounded-xl bg-emerald-950/70 p-3 text-sm text-emerald-100">{message}</p>}<button className="btn-primary" disabled={loading}>{loading?'Creando...':'Crear cuenta'}</button></form><p className="mt-6 text-center text-sm text-orange-100/70">¿Ya tenés cuenta? <Link className="font-bold text-brand-500" href="/auth/login">Entrar</Link></p></div></section>
}
