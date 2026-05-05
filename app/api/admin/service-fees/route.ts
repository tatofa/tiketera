import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function env() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function requireSuperAdmin(request: Request) {
  const { supabaseUrl, anonKey, serviceRoleKey } = env();
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return { error: 'Faltan variables de Supabase.', status: 500 } as const;
  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return { error: 'No autenticado.', status: 401 } as const;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return { error: 'Sesión inválida.', status: 401 } as const;

  const { data: profile } = await adminClient.from('profiles').select('role, active').eq('id', userData.user.id).maybeSingle();
  const { data: extraRoles } = await adminClient.from('user_role_assignments').select('role, active').eq('profile_id', userData.user.id).eq('active', true);
  const isSuperAdmin = profile?.active && profile.role === 'super_admin' || (extraRoles ?? []).some((r: any) => r.role === 'super_admin');
  if (!isSuperAdmin) return { error: 'Solo super admin puede modificar cargos de servicio.', status: 403 } as const;
  return { adminClient } as const;
}

export async function GET(request: Request) {
  const checked = await requireSuperAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { data, error } = await checked.adminClient.from('service_fee_rules').select('*').order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function PATCH(request: Request) {
  const checked = await requireSuperAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? '').trim();
  const percentage = Number(body?.percentage ?? 0);
  const fixed_amount = Number(body?.fixed_amount ?? 0);
  const min_fee = Number(body?.min_fee ?? 0);
  const max_fee_raw = body?.max_fee;
  const max_fee = max_fee_raw === null || max_fee_raw === '' || typeof max_fee_raw === 'undefined' ? null : Number(max_fee_raw);
  const buyer_pays_fee = Boolean(body?.buyer_pays_fee);
  const active = Boolean(body?.active);

  if (!id) return NextResponse.json({ error: 'Falta ID de regla.' }, { status: 400 });
  if ([percentage, fixed_amount, min_fee].some((n) => Number.isNaN(n) || n < 0) || (max_fee !== null && (Number.isNaN(max_fee) || max_fee < 0))) {
    return NextResponse.json({ error: 'Los importes y porcentajes deben ser números positivos.' }, { status: 400 });
  }

  const { data, error } = await checked.adminClient
    .from('service_fee_rules')
    .update({ percentage, fixed_amount, min_fee, max_fee, buyer_pays_fee, active })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rule: data, message: 'Cargo actualizado.' });
}
