'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarPlus, ChevronDown, LogIn, LogOut, Ticket, UserRound } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type Role = 'super_admin' | 'admin' | 'producer' | 'rrpp' | 'accreditor' | 'buyer';
type SessionState = { loading: boolean; logged: boolean; name: string; email: string; roles: Role[] };
const emptyState: SessionState = { loading: false, logged: false, name: '', email: '', roles: [] };

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SessionState>({ ...emptyState, loading: true });

  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserSupabaseClient();
    async function load() {
      if (!supabase) { if (mounted) setState(emptyState); return; }
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { if (mounted) setState(emptyState); return; }
      const roleSet = new Set<Role>(['buyer']);
      let displayName = String(user.user_metadata?.full_name ?? '').trim();
      const { data: profile } = await supabase.from('profiles').select('full_name, role, active').eq('id', user.id).maybeSingle();
      if (profile?.full_name) displayName = profile.full_name;
      if (profile?.active && profile.role) roleSet.add(profile.role as Role);
      const { data: assigned } = await supabase.from('user_role_assignments').select('role, active').eq('profile_id', user.id).eq('active', true);
      assigned?.forEach((row: any) => roleSet.add(row.role as Role));
      if (mounted) setState({ loading: false, logged: true, name: displayName || user.email || 'Usuario', email: user.email ?? '', roles: Array.from(roleSet) });
    }
    load();
    const { data: subscription } = supabase?.auth.onAuthStateChange(() => setTimeout(load, 0)) ?? { data: { subscription: null } };
    window.addEventListener('focus', load);
    return () => { mounted = false; window.removeEventListener('focus', load); subscription.subscription?.unsubscribe(); };
  }, []);

  const isAdmin = state.roles.some((role) => role === 'super_admin' || role === 'admin');
  const isProducer = isAdmin || state.roles.includes('producer');
  const isAccreditor = isAdmin || state.roles.includes('accreditor');
  const isRrpp = isAdmin || state.roles.includes('rrpp');
  const menuItems = useMemo(() => [
    { href: '/perfil', label: 'Mi perfil', show: true },
    { href: '/mi-cuenta/compras', label: 'Mis compras', show: true },
    { href: '/admin/eventos/nuevo', label: 'Crear evento', show: isProducer },
    { href: '/admin/eventos', label: 'Mis eventos', show: isProducer },
    { href: '/admin/rrpp', label: 'Promotores RRPP', show: isProducer || isRrpp },
    { href: '/admin/usuarios', label: 'Usuarios y acreditadores', show: isProducer || isAdmin },
    { href: '/scanner', label: 'Acreditar', show: isAccreditor },
    { href: '/admin/reportes', label: 'Reportes', show: isProducer || isAdmin },
    { href: '/admin/configuracion/cargos', label: 'Cargos de servicio', show: isAdmin },
    { href: '/admin', label: 'Admin general', show: isAdmin }
  ].filter((item) => item.show), [isAccreditor, isAdmin, isProducer, isRrpp]);

  async function logout() { const supabase = createBrowserSupabaseClient(); await supabase?.auth.signOut(); window.location.href = '/'; }

  return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#252632]/95 backdrop-blur"><div className="container-page flex h-16 items-center justify-between gap-4"><Link href="/" className="flex items-center gap-2 font-black text-white"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-gradient-to-br from-brand-700 to-disco-redSoft text-white shadow-redglow"><Ticket size={20} /></span><span className="text-2xl tracking-tight">ticket<span className="text-white">era</span></span></Link><nav className="hidden items-center gap-1 md:flex"><Link href="/eventos" className="rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Eventos</Link>{state.logged && <Link href="/mi-cuenta/compras" className="rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Mis compras</Link>}{isAccreditor && <Link href="/scanner" className="rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Scanner</Link>}</nav><div className="flex items-center gap-2">{isProducer && <Link href="/admin/eventos/nuevo" className="hidden rounded-xl border border-white/60 px-4 py-2 text-sm font-black text-white hover:bg-white/10 sm:inline-flex"><CalendarPlus size={16} className="mr-2"/>CREAR EVENTO</Link>}{!state.logged && !state.loading && <Link href="/auth/login" className="btn-primary"><LogIn size={16} className="mr-2"/>Login</Link>}{state.logged && <button className="hidden rounded-full p-2 text-white hover:bg-white/10 sm:inline-flex" aria-label="Notificaciones"><Bell size={20}/></button>}{state.logged && <div className="relative"><button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white hover:bg-white/10"><UserRound size={18}/><span className="hidden max-w-[120px] truncate sm:inline">{state.name}</span><ChevronDown size={16}/></button>{open && <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-[#2a090f]/95 via-black/95 to-[#140307]/95 text-white shadow-2xl shadow-red-950/60 backdrop-blur-xl"><div className="border-b border-white/10 px-6 py-5"><p className="text-lg font-black text-white">{state.name}</p><p className="mt-1 truncate text-xs text-white/65">{state.email}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-red-100/70">{state.roles.join(' · ')}</p></div><div className="p-2"><Link href="/eventos" onClick={() => setOpen(false)} className="mb-2 block rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-disco-redSoft px-5 py-3 text-center text-sm font-black text-white shadow-redglow hover:brightness-110">Comprar entradas</Link>{menuItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white">{item.label}</Link>)}<button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white"><LogOut size={16}/> Cerrar sesión</button></div></div>}</div>}</div></div></header>;
}
