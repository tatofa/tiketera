'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AuthGate from '@/components/AuthGate';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { formatMoney, serviceFeeConfig } from '@/lib/platform-config';

type FeeRule = {
 id: string;
 name: string;
 channel: string;
 buyer_pays_fee: boolean;
 percentage: number;
 fixed_amount: number;
 min_fee: number;
 max_fee: number | null;
 currency: string;
 active: boolean;
};

function fallbackRules(): FeeRule[] {
 return serviceFeeConfig.rules.map((rule) => ({
  id: rule.id,
  name: rule.name,
  channel: rule.channel,
  buyer_pays_fee: serviceFeeConfig.buyerPaysFee,
  percentage: rule.percentage,
  fixed_amount: rule.fixedAmount,
  min_fee: serviceFeeConfig.minFee,
  max_fee: serviceFeeConfig.maxFee,
  currency: serviceFeeConfig.currency,
  active: true
 }));
}

function CargosContent(){
 const [rules,setRules]=useState<FeeRule[]>(fallbackRules());
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState<string | null>(null);
 const [dbMode,setDbMode]=useState(false);

 useEffect(()=>{async function load(){const supabase=createBrowserSupabaseClient(); if(!supabase){setLoading(false); return;} const {data}=await supabase.auth.getSession(); const token=data.session?.access_token; if(!token){setLoading(false); return;} const res=await fetch('/api/admin/service-fees',{headers:{Authorization:`Bearer ${token}`}}); const json=await res.json().catch(()=>({})); if(res.ok){setRules(json.rules ?? []); setDbMode(true);} setLoading(false);} load();},[]);

 function updateLocal(id:string,patch:Partial<FeeRule>){setRules(current=>current.map(rule=>rule.id===id?{...rule,...patch}:rule));}
 async function save(rule:FeeRule){const supabase=createBrowserSupabaseClient(); if(!supabase){toast.error('Falta configurar Supabase.'); return;} const {data}=await supabase.auth.getSession(); const token=data.session?.access_token; if(!token){toast.error('Sesión vencida.'); return;} setSaving(rule.id); const res=await fetch('/api/admin/service-fees',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(rule)}); const json=await res.json().catch(()=>({})); setSaving(null); if(!res.ok){toast.error(json.error ?? 'No se pudo guardar.'); return;} updateLocal(rule.id,json.rule); toast.success('Cargo actualizado.');}

 const totalPercent = rules.find(r=>r.channel==='web')?.percentage ?? serviceFeeConfig.defaultPercentage;
 const totalFixed = rules.find(r=>r.channel==='web')?.fixed_amount ?? serviceFeeConfig.defaultFixedAmount;
 const maxFee = rules.find(r=>r.channel==='web')?.max_fee ?? serviceFeeConfig.maxFee;

 return <section className="container-page py-10"><p className="font-semibold text-red-300">Configuración</p><h1 className="text-4xl font-black text-white">Cargos de servicio</h1><p className="mt-2 max-w-3xl text-white/65">Como super admin podés modificar porcentajes, importes fijos, mínimos, máximos y si el comprador paga el cargo por canal.</p>{!dbMode&&!loading&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/30 p-4 text-sm text-red-100">Modo demo: para guardar cambios reales necesitás Supabase y rol super_admin.</div>}<div className="mt-8 grid gap-4 md:grid-cols-4"><div className="card p-5"><p className="text-sm text-white/55">Reglas activas</p><p className="text-3xl font-black text-white">{rules.filter(r=>r.active).length}</p></div><div className="card p-5"><p className="text-sm text-white/55">% web</p><p className="text-3xl font-black text-white">{totalPercent}%</p></div><div className="card p-5"><p className="text-sm text-white/55">Fijo web</p><p className="text-3xl font-black text-white">{formatMoney(totalFixed)}</p></div><div className="card p-5"><p className="text-sm text-white/55">Tope web</p><p className="text-3xl font-black text-white">{formatMoney(maxFee ?? 0)}</p></div></div><div className="mt-8 grid gap-4">{rules.map(rule=><div key={rule.id} className="card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black text-white">{rule.name}</h2><p className="text-sm text-white/55">Canal: <span className="font-mono">{rule.channel}</span></p></div><label className="flex items-center gap-2 text-sm font-bold text-white/80"><input type="checkbox" checked={rule.active} onChange={e=>updateLocal(rule.id,{active:e.target.checked})}/> Activa</label></div><div className="mt-5 grid gap-4 md:grid-cols-5"><label className="block"><span className="label">% cargo</span><input className="input mt-1" type="number" min="0" step="0.01" value={rule.percentage} onChange={e=>updateLocal(rule.id,{percentage:Number(e.target.value)})}/></label><label className="block"><span className="label">Fijo</span><input className="input mt-1" type="number" min="0" step="1" value={rule.fixed_amount} onChange={e=>updateLocal(rule.id,{fixed_amount:Number(e.target.value)})}/></label><label className="block"><span className="label">Mínimo</span><input className="input mt-1" type="number" min="0" step="1" value={rule.min_fee} onChange={e=>updateLocal(rule.id,{min_fee:Number(e.target.value)})}/></label><label className="block"><span className="label">Máximo</span><input className="input mt-1" type="number" min="0" step="1" value={rule.max_fee ?? ''} onChange={e=>updateLocal(rule.id,{max_fee:e.target.value===''?null:Number(e.target.value)})}/></label><label className="flex items-end gap-2 pb-3 text-sm font-bold text-white"><input type="checkbox" checked={rule.buyer_pays_fee} onChange={e=>updateLocal(rule.id,{buyer_pays_fee:e.target.checked})}/> Lo paga comprador</label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-4"><p className="text-sm text-white/65">Ejemplo sobre entrada de $10.000: <strong className="text-white">{formatMoney(Math.min(rule.max_fee ?? 999999999, Math.max(rule.min_fee, 10000*(rule.percentage/100)+rule.fixed_amount)))}</strong></p><button className="btn-primary" disabled={saving===rule.id || !dbMode} onClick={()=>save(rule)}>{saving===rule.id?'Guardando...':'Guardar cambios'}</button></div></div>)}</div></section>
}

export default function CargosPage(){return <AuthGate allow={['super_admin']} title="Solo super admin"><CargosContent/></AuthGate>}
