import { formatMoney, serviceFeeConfig } from '@/lib/platform-config';

export default function CargosPage(){
 return <section className="container-page py-10">
  <p className="font-semibold text-brand-700">Configuración</p>
  <h1 className="text-4xl font-black">Cargos de servicio</h1>
  <p className="mt-2 max-w-3xl text-slate-600">Panel para configurar porcentajes, importes fijos, mínimos, máximos y reglas por canal de venta.</p>
  <div className="mt-8 grid gap-4 md:grid-cols-4">
   <div className="card p-5"><p className="text-sm text-slate-500">Comprador paga cargo</p><p className="text-3xl font-black">{serviceFeeConfig.buyerPaysFee?'Sí':'No'}</p></div>
   <div className="card p-5"><p className="text-sm text-slate-500">Porcentaje default</p><p className="text-3xl font-black">{serviceFeeConfig.defaultPercentage}%</p></div>
   <div className="card p-5"><p className="text-sm text-slate-500">Fijo default</p><p className="text-3xl font-black">{formatMoney(serviceFeeConfig.defaultFixedAmount)}</p></div>
   <div className="card p-5"><p className="text-sm text-slate-500">Tope</p><p className="text-3xl font-black">{formatMoney(serviceFeeConfig.maxFee)}</p></div>
  </div>
  <div className="mt-8 card p-6"><h2 className="text-xl font-black">Reglas por canal</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Regla</th><th className="p-3">Canal</th><th className="p-3">%</th><th className="p-3">Fijo</th></tr></thead><tbody>{serviceFeeConfig.rules.map(rule=><tr key={rule.id} className="border-b"><td className="p-3 font-bold">{rule.name}</td><td className="p-3">{rule.channel}</td><td className="p-3">{rule.percentage}%</td><td className="p-3">{formatMoney(rule.fixedAmount)}</td></tr>)}</tbody></table></div></div>
 </section>
}
