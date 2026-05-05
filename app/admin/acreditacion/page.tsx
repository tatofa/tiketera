import Link from 'next/link';
import { accreditationStats } from '@/lib/platform-config';

export default function AcreditacionPage(){
 return <section className="container-page py-10">
  <p className="font-semibold text-brand-700">Ingreso</p>
  <h1 className="text-4xl font-black">Acreditación</h1>
  <p className="mt-2 text-slate-600">Control por QR o código breve, con detección de entradas ya usadas.</p>
  <div className="mt-8 grid gap-4 md:grid-cols-3">{accreditationStats.map(row=><div key={row.eventId} className="card p-6"><h2 className="text-xl font-black">{row.eventName}</h2><p className="mt-1 text-sm text-slate-600">{row.gate}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{row.valid}</p><p className="text-xs">válidos</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-2xl font-black text-amber-700">{row.rejected}</p><p className="text-xs">rechazos</p></div><div className="rounded-xl bg-red-50 p-3"><p className="text-2xl font-black text-red-700">{row.duplicated}</p><p className="text-xs">repetidos</p></div></div></div>)}</div>
  <div className="mt-8 card p-6"><h2 className="text-xl font-black">Operación</h2><ul className="mt-3 space-y-2 text-sm text-slate-700"><li>• Acceso limitado para acreditadores.</li><li>• QR con token no secuencial.</li><li>• Código breve para carga manual.</li><li>• Estado de ticket: válido, usado, cancelado o reembolsado.</li></ul><Link href="/scanner" className="btn-primary mt-6">Abrir scanner</Link></div>
 </section>
}
