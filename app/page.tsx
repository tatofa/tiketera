import Link from 'next/link';
import { ArrowRight, ShieldCheck, Smartphone, TicketCheck } from 'lucide-react';
import { demoEvents } from '@/lib/demo-data';
import EventCard from '@/components/EventCard';

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-slate-950 py-20 text-white">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <span className="badge bg-white/10 text-white ring-1 ring-white/20">MVP deployable en Vercel</span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">Sistema de ticketera para eventos</h1>
            <p className="mt-6 max-w-2xl text-lg text-indigo-100">Eventos, entradas, checkout, QR, scanner, panel administrativo y reportes iniciales en una sola aplicación Next.js.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/eventos" className="btn-primary bg-white text-brand-700 hover:bg-indigo-50">Ver eventos <ArrowRight size={18} /></Link>
              <Link href="/admin" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">Entrar al admin</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['Alta demanda', 'Carrito con reserva temporal preparado para producción', ShieldCheck],
              ['Mobile-first', 'Scanner web para validar ingresos desde celular', Smartphone],
              ['QR único', 'Cada ticket genera token único y estado de uso', TicketCheck]
            ].map(([title, text, Icon]: any) => <div key={title} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15"><Icon /><h3 className="mt-3 font-bold">{title}</h3><p className="mt-1 text-sm text-indigo-100">{text}</p></div>)}
          </div>
        </div>
      </section>
      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <div><p className="font-semibold text-brand-700">Eventos destacados</p><h2 className="text-3xl font-black">Vendé entradas online</h2></div>
          <Link href="/eventos" className="btn-secondary">Ver todos</Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">{demoEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>
      </section>
    </>
  );
}
