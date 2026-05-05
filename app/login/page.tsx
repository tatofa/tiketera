'use client';

import Link from 'next/link';
import { useState } from 'react';
import { can, demoUsers, roleLabels, type PlatformRole } from '@/lib/platform-config';

export default function LoginPage(){
 const [role,setRole]=useState<PlatformRole>('super_admin');
 const user=demoUsers.find(u=>u.role===role)!;
 const permissions=['events.manage_all','events.manage_own','sales.view_all','sales.view_own','sales.view_rrpp','tickets.validate','service_fees.manage','users.manage','reports.export','links.manage_own'] as const;
 return <section className="container-page py-12"><div className="mx-auto max-w-4xl"><p className="font-semibold text-brand-700">Login y roles</p><h1 className="text-4xl font-black">Ingresar como perfil demo</h1><p className="mt-2 text-slate-600">Demo visual de acceso por rol. En producción esto se conecta a Supabase Auth + RLS + middleware de Next.js.</p><div className="mt-8 grid gap-6 md:grid-cols-[.9fr_1.1fr]"><div className="card p-6"><label className="text-sm font-bold">Rol</label><select className="mt-2 w-full rounded-xl border p-3" value={role} onChange={(e)=>setRole(e.target.value as PlatformRole)}>{demoUsers.map(u=><option key={u.id} value={u.role}>{roleLabels[u.role]}</option>)}</select><div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="font-black">{user.name}</p><p className="text-sm text-slate-600">{user.email}</p><p className="mt-2 text-xs font-bold uppercase text-brand-700">{roleLabels[user.role]}</p></div><div className="mt-6 flex flex-wrap gap-2"><Link href={role==='buyer'?'/mi-cuenta/compras':role==='accreditor'?'/scanner':'/admin'} className="btn-primary">Entrar</Link><Link href="/admin/roles" className="btn-secondary">Ver matriz</Link></div></div><div className="card p-6"><h2 className="text-xl font-black">Permisos activos</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{permissions.map(p=><div key={p} className={`rounded-xl border p-3 text-sm ${can(role,p)?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-slate-200 bg-slate-50 text-slate-400'}`}>{can(role,p)?'✓':'—'} {p}</div>)}</div></div></div></div></section>
}
