import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function requireSuperAdmin(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return { error: 'Faltan variables de Supabase.', status: 500 } as const;

  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return { error: 'No autenticado.', status: 401 } as const;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return { error: 'Sesión inválida.', status: 401 } as const;

  const { data: profile } = await adminClient.from('profiles').select('role, active').eq('id', userData.user.id).maybeSingle();
  const { data: roles } = await adminClient.from('user_role_assignments').select('role, active').eq('profile_id', userData.user.id).eq('active', true);
  const isSuperAdmin = Boolean((profile?.active && profile.role === 'super_admin') || (roles ?? []).some((row: any) => row.role === 'super_admin'));
  if (!isSuperAdmin) return { error: 'Solo super admin puede modificar el cargo de servicio.', status: 403 } as const;
  return { adminClient } as const;
}

function normalize(rule: any) {
  const percentage = Number(rule?.percentage ?? 0);
  const fixed = Number(rule?.fixed_amount ?? 0);
  return {
    id: rule?.id,
    mode: percentage > 0 ? 'percent' : 'fixed',
    value: percentage > 0 ? percentage : fixed,
    currency: rule?.currency ?? 'ARS',
    active: Boolean(rule?.active ?? true)
  };
}

export async function GET(request: Request) {
  const checked = await requireSuperAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });

  const { data, error } = await checked.adminClient
    .from('service_fee_rules')
    .select('*')
    .eq('active', true)
    .order('channel', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ fee: { mode: 'percent', value: 12, currency: 'ARS', active: true } });
  return NextResponse.json({ fee: normalize(data[0]) });
}

export async function PATCH(request: Request) {
  const checked = await requireSuperAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });

  const body = await request.json().catch(() => null);
  const mode = body?.mode === 'fixed' ? 'fixed' : 'percent';
  const value = Number(body?.value ?? 0);
  if (Number.isNaN(value) || value < 0) return NextResponse.json({ error: 'El valor debe ser un número positivo.' }, { status: 400 });

  const percentage = mode === 'percent' ? value : 0;
  const fixed_amount = mode === 'fixed' ? Math.round(value) : 0;

  const { data: existing } = await checked.adminClient
    .from('service_fee_rules')
    .select('id')
    .eq('active', true)
    .order('channel', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  let result;
  if (existing?.length) {
    result = await checked.adminClient
      .from('service_fee_rules')
      .update({ name: 'Cargo de servicio', channel: 'global', percentage, fixed_amount, min_fee: 0, max_fee: null, buyer_pays_fee: true, active: true })
      .eq('id', existing[0].id)
      .select('*')
      .single();
  } else {
    result = await checked.adminClient
      .from('service_fee_rules')
      .insert({ name: 'Cargo de servicio', channel: 'global', percentage, fixed_amount, min_fee: 0, max_fee: null, buyer_pays_fee: true, active: true, currency: 'ARS' })
      .select('*')
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ fee: normalize(result.data), message: 'Cargo de servicio actualizado.' });
}
