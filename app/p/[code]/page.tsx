import Link from 'next/link';
import { notFound } from 'next/navigation';
import { demoEvents } from '@/lib/demo-data';
import { formatMoney, getPromoterByCode } from '@/lib/platform-config';

export default async function PromoterPage({ params }: { params: Promise<{ code: string }> }){
 const { code } = await params;
 const promoter=getPromoterByCode(code);
 if(!promoter) return notFound();
 const event=demoEvents.find(e=>e.id===promoter.eventId);
 if(!event) return notFound();
 const minPrice=Math.min(...event.ticketTypes.map(t=>t.price));
 return <section className="container-page py-10"><span className="badge">Link RRPP /{promoter.code}</span><h1 className="mt-4 text-5xl font-black">{event.name}</h1><p className="mt-3 max-w-3xl text-lg text-slate-600">{event.description}</p><p className="mt-4 text-slate-700">Vendedor: <strong>{promoter.name}</strong></p><p className="mt-2 text-slate-700">Desde <strong>{formatMoney(minPrice)}</strong></p><div className="mt-8 flex flex-wrap gap-3"><Link href={`/eventos/${event.slug}?rpp=${promoter.code}`} className="btn-primary">Comprar con este link</Link><Link href="/eventos" className="btn-secondary">Ver eventos</Link></div><div className="mt-10 card p-6"><h2 className="text-xl font-black">Tracking comercial</h2><p className="mt-2 text-slate-600">Las compras hechas desde este link quedan asociadas al código RRPP para reportes, comisiones y liquidación.</p></div></section>
}
