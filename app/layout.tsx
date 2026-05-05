import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import BootstrapDemo from '@/components/BootstrapDemo';
import AppHeader from '@/components/AppHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ticketera',
  description: 'Sistema de ticketera para eventos'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppHeader />
        <main>{children}</main>
        <footer className="mt-20 border-t border-white/10 bg-[#252632] py-8">
          <div className="container-page text-sm text-white/50">Ticketera para eventos, productores, RRPP y acreditación.</div>
        </footer>
        <BootstrapDemo />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
