'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function SuccessPage() {
  const params = useSearchParams();
  return <section className="container-page py-16"><div className="card mx-auto max-w-2xl p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={56} /><h1 className="mt-4 text-4xl font-black">Compra confirmada</h1><p className="mt-3 text-slate-600">Orden: {params.get('order')}</p><div className="mt-8 flex justify-center gap-3"><Link href="/mi-cuenta/compras" className="btn-primary">Ver mis compras</Link><Link href="/scanner" className="btn-secondary">Probar scanner</Link></div></div></section>;
}
