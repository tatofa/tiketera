'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const roles = [
  { value: 'producer', label: 'Productor' },
  { value: 'rrpp', label: 'RRPP / Promotor' },
  { value: 'accreditor', label: 'Acreditador' },
  { value: 'buyer', label: 'Comprador' }
];

export default function UsuariosPage(){
 const [form,setForm]=useState({fullName:'',email:'',password:'',phone:'',role:'producer',producerName:''});
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 async function submit(e: React.FormEvent){
  e.preventDefault(); setLoading(true); setMessage(''); setError('');
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables públicas de Supabase.'); setLoading(false); return;}
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token){setError('Primero iniciá sesión como admin.'); setLoading(false); return;}
  const res=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(form)});
  const json=await res.json();
  if(!res.ok){setError(json.error ?? 'No se pudo crear el usuario.');} else {setMessage(json.message ?? 'Usuario creado.'); setForm({fullName:'',email:'',password:'',phone:'',role:'producer',producerName:''});}
  setLoading(false);
 }
 return <section className="container-page py-10"><p className="font-semibold text-brand-700">Usuarios</p><h1 className="text-4xl font-black">Crear usuarios operativos</h1><p className="mt-2 max-w-3xl text-slate-600">Desde la web solo se pueden crear productores, RRPP, acreditadores y compradores. Super admin y admin quedan reservados para carga manual segura desde Supabase.</p><form onSubmit={submit} className="card mt-8 grid gap-4 p-6 md:grid-cols-2"><div><label className="text-sm font-bold">Nombre</label><input className="mt-1 w-full rounded-xl border p-3" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></div><div><label className="text-sm font-bold">Email</label><input type="email" className="mt-1 w-full rounded-xl border p-3" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label className="text-sm font-bold">Contraseña inicial</label><input type="password" className="mt-1 w-full rounded-xl border p-3" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div><div><label className="text-sm font-bold">Teléfono</label><input className="mt-1 w-full rounded-xl border p-3" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div><label className="text-sm font-bold">Rol</label><select className="mt-1 w-full rounded-xl border p-3" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>{form.role==='producer'&&<div><label className="text-sm font-bold">Nombre productora</label><input className="mt-1 w-full rounded-xl border p-3" value={form.producerName} onChange={e=>setForm({...form,producerName:e.target.value})}/></div>}<div className="md:col-span-2"><button disabled={loading} className="btn-primary">{loading?'Creando...':'Crear usuario'}</button></div>{message&&<p className="rounded-xl bg-emerald-50 p-3 text-emerald-800 md:col-span-2">{message}</p>}{error&&<p className="rounded-xl bg-red-50 p-3 text-red-800 md:col-span-2">{error}</p>}</form><div className="card mt-6 p-6"><h2 className="text-xl font-black">Regla de seguridad</h2><p className="mt-2 text-slate-600">La API verifica que quien crea el usuario tenga perfil activo con rol super_admin o admin. Si intentan mandar rol super_admin o admin, lo rechaza.</p></div></section>
}
