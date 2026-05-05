'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type Role = 'super_admin' | 'admin' | 'producer' | 'rrpp' | 'accreditor' | 'buyer';

type Props = {
  children: React.ReactNode;
  allow?: Role[];
  title?: string;
  description?: string;
};

export default function AuthGate({ children, allow, title = 'Necesitás iniciar sesión', description = 'Registrate o ingresá con tu cuenta para continuar.' }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [supabaseReady, setSupabaseReady] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setSupabaseReady(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);
      const roleSet = new Set<Role>(['buyer']);

      const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', user.id).maybeSingle();
      if (profile?.active && profile.role) roleSet.add(profile.role as Role);

      const { data: assignedRoles } = await supabase
        .from('user_role_assignments')
        .select('role, active')
        .eq('profile_id', user.id)
        .eq('active', true);

      assignedRoles?.forEach((row: any) => roleSet.add(row.role as Role));
      setRoles(Array.from(roleSet));
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <section className="container-page py-12"><div className="card p-6">Cargando sesión...</div></section>;

  if (!supabaseReady) {
    return <section className="container-page py-12"><div className="card p-6"><h1 className="text-2xl font-black">Falta configurar Supabase</h1><p className="mt-2 text-orange-100/70">Cargá las variables de entorno para habilitar login real.</p></div></section>;
  }

  if (!authenticated) {
    return <section className="container-page py-12"><div className="mx-auto max-w-xl card p-8 text-center"><h1 className="text-3xl font-black">{title}</h1><p className="mt-3 text-orange-100/70">{description}</p><div className="mt-6 flex justify-center gap-3"><Link href="/auth/login" className="btn-primary">Iniciar sesión</Link><Link href="/auth/registro" className="btn-secondary">Registrarme</Link></div></div></section>;
  }

  const isSuperAdmin = roles.includes('super_admin');
  const allowed = !allow?.length || isSuperAdmin || allow.some((role) => roles.includes(role));

  if (!allowed) {
    return <section className="container-page py-12"><div className="mx-auto max-w-xl card p-8 text-center"><h1 className="text-3xl font-black">Sin permisos</h1><p className="mt-3 text-orange-100/70">Tu cuenta no tiene el rol necesario para esta sección.</p><p className="mt-3 text-sm text-orange-100/50">Roles activos: {roles.join(', ')}</p><Link href="/mi-cuenta/compras" className="btn-secondary mt-6">Ir a mi cuenta</Link></div></section>;
  }

  return <>{children}</>;
}
