'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { createBrowserSupabaseClient } from '@/lib/supabase';

function PerfilContent(){
 const [loading,setLoading]=useState(true);
 const [profile,setProfile]=useState({fullName:'',email:'',phone:'',roles:''});
 useEffect(()=>{async function load(){const supabase=createBrowserSupabaseClient(); if(!supabase){setLoading(false); return;} const {data}=await supabase.auth.getSession(); const user=data.session?.user; if(!user){setLoading(false); return;} const {data:p}=await supabase.from('profiles').select('full_name, phone, role').eq('id',user.id).maybeSingle(); const {data:rs}=await supabase.from('user_role_assignments').select('role, active').eq('profile_id',user.id).eq('active',true); const roles=[p?.role,...(rs?.map((r:any)=>r.role)||[])].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · '); setProfile({fullName:p?.full_name||user.user_metadata?.full_name||'',email:user.email||'',phone:p?.phone||'',roles:roles||'buyer'}); setLoading(false);} load();},[]);
 if(loading) return <section className="container-page py-10"><div className="card p-6">Cargando perfil...</div></section>;
 return <section className="container-page py-10"><p className="font-semibold text-red-300">Mi cuenta</p><h1 className="text-4xl font-black text-white">Mi perfil</h1><p className="mt-2 max-w-2xl text-white/65">Desde acá podés revisar tu usuario. Los roles los asigna un productor o administrador.</p><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]"><div className="card p-6"><h2 className="text-xl font-black text-white">Datos del usuario</h2><div className="mt-5 grid gap-4"><div><label className="label">Nombre</label><input className="input mt-1 opacity-70" value={profile.fullName} readOnly/></div><div><label className="label">Email</label><input className="input mt-1 opacity-70" value={profile.email} readOnly/></div><div><label className="label">Telefono</label><input className="input mt-1 opacity-70" value={profile.phone||'Sin cargar'} readOnly/></div><div><label className="label">Roles activos</label><div className="mt-1 rounded-xl border border-white/15 bg-white/10 p-3 text-sm font-bold text-white">{profile.roles}</div></div></div></div><div className="card p-6"><h2 className="text-xl font-black text-white">Seguridad</h2><p className="mt-2 text-sm text-white/60">El cambio de clave se va a conectar como accion segura de Supabase en el siguiente paso.</p><a className="btn-secondary mt-5 w-full" href="/auth/login">Reingresar</a></div></div></section>;
}

export default function PerfilPage(){return <AuthGate><PerfilContent/></AuthGate>}
