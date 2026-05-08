'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AuthGate from '@/components/AuthGate';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type FeeMode = 'percent' | 'fixed';
type FeeConfig = { mode: FeeMode; value: number; minFee: number; maxFee: number | null; currency: string };

function ars(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
}

function calc(price: number, fee: FeeConfig) {
  const raw = fee.mode === 'percent' ? price * (fee.value / 100) : fee.value;
  const withMin = Math.max(raw, Number(fee.minFee ?? 0));
  const maxFee = fee.maxFee == null ? null : Number(fee.maxFee);
  return Math.round(maxFee && maxFee > 0 ? Math.min(withMin, maxFee) : withMin);
}

function CargosContent() {
  const [fee, setFee] = useState<FeeConfig>({ mode: 'percent', value: 12, minFee: 0, maxFee: null, currency: 'ARS' });
  const [price, setPrice] = useState(18000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbMode, setDbMode] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setLoading(false); return; }
      const res = await fetch('/api/admin/service-fee-single', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.fee) { setFee({ minFee: 0, maxFee: null, ...json.fee }); setDbMode(true); }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { toast.error('Falta configurar Supabase.'); return; }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { toast.error('Sesión vencida.'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/service-fee-single', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fee)
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { toast.error(json.error ?? 'No se pudo guardar.'); return; }
    setFee({ minFee: 0, maxFee: null, ...json.fee });
    setDbMode(true);
    toast.success('Cargo de servicio actualizado.');
  }

  const service = calc(price, fee);
  const total = price + service;

  return <section className="container-page py-10">
    <p className="font-semibold text-red-300">Configuración</p>
    <h1 className="text-4xl font-black text-white">Cargo de servicio</h1>
    <p className="mt-2 max-w-3xl text-white/65">Configurá un único cargo global para compras web. Puede tener porcentaje o valor fijo, con mínimo y máximo. Siempre lo abona quien compra la entrada.</p>
    {!dbMode && !loading && <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/30 p-4 text-sm text-red-100">Modo demo: para guardar cambios reales necesitás Supabase y rol super_admin.</div>}

    <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <div className="card p-6">
        <h2 className="text-2xl font-black text-white">Valor del cargo</h2>
        <p className="mt-1 text-sm text-white/60">Este valor se usa en checkout y en la orden real.</p>
        <div className="mt-6 grid gap-4">
          <label>
            <span className="label">Tipo de cargo</span>
            <select className="input mt-1" value={fee.mode} onChange={e => setFee({ ...fee, mode: e.target.value as FeeMode })}>
              <option value="percent">Porcentaje sobre la entrada</option>
              <option value="fixed">Valor fijo en pesos</option>
            </select>
          </label>
          <label>
            <span className="label">Valor</span>
            <input className="input mt-1" type="number" min="0" step={fee.mode === 'percent' ? '0.01' : '1'} value={fee.value} onChange={e => setFee({ ...fee, value: Number(e.target.value) })} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Mínimo a cobrar</span>
              <input className="input mt-1" type="number" min="0" step="1" value={fee.minFee} onChange={e => setFee({ ...fee, minFee: Number(e.target.value) })} />
            </label>
            <label>
              <span className="label">Máximo a cobrar</span>
              <input className="input mt-1" type="number" min="0" step="1" value={fee.maxFee ?? ''} onChange={e => setFee({ ...fee, maxFee: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Sin máximo" />
            </label>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Configuración actual</p>
            <p className="mt-1 text-3xl font-black text-white">{fee.mode === 'percent' ? `${fee.value}%` : ars(fee.value)}</p>
            <p className="mt-2 text-sm text-white/55">Mínimo: {ars(fee.minFee)} · Máximo: {fee.maxFee ? ars(fee.maxFee) : 'sin máximo'}</p>
            <p className="mt-1 text-sm text-white/55">Pagador: comprador final</p>
          </div>
          <button className="btn-primary" disabled={saving || !dbMode} onClick={save}>{saving ? 'Guardando...' : 'Guardar cargo'}</button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-black text-white">Simulador de checkout</h2>
        <p className="mt-1 text-sm text-white/60">Vista previa del mismo cálculo que se usa al crear la orden.</p>
        <label className="mt-6 block">
          <span className="label">Precio de entrada</span>
          <input className="input mt-1" type="number" min="0" value={price} onChange={e => setPrice(Number(e.target.value))} />
        </label>
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/60 p-5">
          <h3 className="text-xl font-black text-white">Detalle de compra</h3>
          <div className="mt-5 space-y-3 border-b border-white/15 pb-5 text-sm">
            <div className="flex justify-between text-white/70"><span>Entrada</span><strong className="text-white">{ars(price)}</strong></div>
            <div className="flex justify-between text-white/70"><span>Cargo por servicio</span><strong className="text-white">{ars(service)}</strong></div>
          </div>
          <div className="mt-5 flex justify-between text-2xl font-black text-white"><span>Total</span><span>{ars(total)}</span></div>
        </div>
      </div>
    </div>
  </section>;
}

export default function CargosPage() {
  return <AuthGate allow={['super_admin']} title="Solo super admin"><CargosContent /></AuthGate>;
}
