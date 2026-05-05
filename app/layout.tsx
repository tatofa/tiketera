import type { Metadata } from 'next';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { Toaster } from 'sonner';
import BootstrapDemo from '@/components/BootstrapDemo';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ticketera MVP',
  description: 'Sistema de ticketera para eventos deployable en Vercel'
};

const nav = [
  { href: '/eventos', label: 'Eventos' },
  { href: '/mi-cuenta/compras', label: 'Mis compras' },
  { href: '/admin', label: 'Admin' },
  { href: '/scanner', label: 'Scanner' }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="container-page flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-black text-slate-950">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white"><Ticket size={20} /></span>
              Ticketera
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link href="/checkout" className="btn-primary">Checkout demo</Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t border-slate-200 bg-white py-8">
          <div className="container-page text-sm text-slate-500">MVP listo para localhost y Vercel. Modo demo con localStorage + esquema Supabase incluido.</div>
        </footer>
        <BootstrapDemo />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
