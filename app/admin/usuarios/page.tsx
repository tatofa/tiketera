'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const roles = [
  { value: 'producer', label: 'Productor' },
  { value: 'rrpp', label: 'RRPP / Promotor' },
  { value: 'accreditor', label: 'Acreditador' },
  { value: 'buyer', label: 'Comprador' }
];

type UserRow = { id:string; full_name:string; email:string; phone?:string; role:string; active:boolean; roles?: any[] };

export default function UsuariosPage(){
 const [form,setForm]=useState({fullName:'',email:'',password:'',phone:'',role:'producer',producerName:''});
 const [users,setUsers]=useState<UserRow[]>([]);
 const [loading,setLoading]=useState(false);
 const [listLoading,setListLoading]=useState(true);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 async function loadUsers(){
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables públicas de Supabase.'); setListLoading(false); return;}
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token){setError('Primero iniciá sesión como admin.'); setListLoading(false); return;}
  const res=await fetch('/api/admin/users',{headers:{Authorization:`Bearer ${token}`}});
  const json=await res.json().catch(()=>({}));
  if(!res.ok){setError(json.error??'No se pudieron cargar usuarios.'); setListLoading(false); return;}
  setUsers(json.users??[]); setListLoading(false);
 }
 useEffect(()=>{loadUsers();},[]);
 async function submit(e: React.FormEvent){
  e.preventDefault(); setLoading(true); setMessage(''); setError('');
  const supabase=createBrowserSupabaseClient();
  if(!supabase){setError('Faltan variables públicas de Supabase.'); setLoading(false); return;}
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token){setError('Primero iniciá sesión como admin.'); setLoading(false); return;}
  const res=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(form)});
  const json=await res.json().catch(()=>({}));
  if(!res.ok){setError(json.error ?? 'No se pudo crear el usuario.');} else {setMessage(json.message ?? 'Usuario creado.'); setForm({fullName:'',email:'',password:'',phone:'',role:'producer',producerName:''}); await loadUsers();}
  setLoading(false);
 }
 return <section className="container-page py-10"><p className="font-semibold text-red-300">Usuarios</p><h1 className="text-4xl font-black text-white">Crear usuarios operativos</h1><p className="mt-2 max-w-3xl text-white/65">Desde la web solo se pueden crear productores, RRPP, acreditadores y compradores. Super admin y admin quedan reservados para carga manual segura desde Supabase.</p><form onSubmit={submit} className="card mt-8 grid gap-4 p-6 md:grid-cols-2"><div><label className="label">Nombre</label><input className="input mt-1" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></div><div><label className="label">Email</label><input type="email" className="input mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label className="label">Contraseña inicial</label><input type="password" className="input mt-1" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div><div><label className="label">Teléfono</label><input className="input mt-1" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div><label className="label">Rol operativo</label><select className="input mt-1" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>{form.role==='producer'&&<div><label className="label">Nombre productora</label><input className="input mt-1" value={form.producerName} onChange={e=>setForm({...form,producerName:e.target.value})}/></div>}<div className="md:col-span-2"><button disabled={loading} className="btn-primary">{loading?'Creando...':'Crear usuario'}</button></div>{message&&<p className="rounded-xl bg-emerald-950/60 p-3 text-emerald-100 md:col-span-2">{message}</p>}{error&&<p className="rounded-xl bg-red-950/60 p-3 text-red-100 md:col-span-2">{error}</p>}</form><div className="card mt-8 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-white">Usuarios reales</h2><p className="mt-1 text-sm text-white/55">Perfiles y roles activos desde Supabase.</p></div><button className="btn-secondary" onClick={loadUsers}>Actualizar</button></div>{listLoading&&<p className="mt-4 text-white/60">Cargando usuarios reales...</p>}<div className="mt-4 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm text-white"><thead className="bg-white/10 text-left text-white/70"><tr><th className="p-3">Nombre</th><th className="p-3">Email</th><th className="p-3">Base</th><th className="p-3">Roles operativos</th><th className="p-3">Estado</th></tr></thead><tbody>{users.map(user=><tr key={user.id} className="border-t border-white/10"><td className="p-3 font-bold">{user.full_name??'—'}</td><td className="p-3">{user.email??'—'}</td><td className="p-3">{user.role}</td><td className="p-3">{user.roles?.length?user.roles.map((role:any)=><span key={`${role.role}-${role.producer_id}-${role.event_id}`} className="badge mr-1">{role.role}</span>):'—'}</td><td className="p-3"><span className="badge">{user.active?'activo':'inactivo'}</span></td></tr>)}{!listLoading&&!users.length&&<tr><td className="p-3 text-white/55" colSpan={5}>No hay usuarios para mostrar.</td></tr>}</tbody></table></div></div></section>
}
