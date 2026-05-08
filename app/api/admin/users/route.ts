import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const assignableRoles = ['buyer', 'producer', 'rrpp', 'accreditor'] as const;
type AssignableRole = (typeof assignableRoles)[number];

function isAssignableRole(role: string): role is AssignableRole {
  return assignableRoles.includes(role as AssignableRole);
}

function randomPassword() {
  return `Tkt-${crypto.randomUUID()}-2026!`;
}

async function requireAdmin(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return { error: 'Faltan variables de entorno de Supabase.', status: 500 } as const;

  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return { error: 'No autenticado.', status: 401 } as const;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: sessionData, error: sessionError } = await userClient.auth.getUser();
  if (sessionError || !sessionData.user) return { error: 'Sesión inválida.', status: 401 } as const;

  const { data: callerProfile, error: callerError } = await adminClient.from('profiles').select('id, role, active').eq('id', sessionData.user.id).single();
  if (callerError || !callerProfile || !callerProfile.active) return { error: 'No tenés permisos para administrar usuarios.', status: 403 } as const;

  const isPlatformAdmin = ['super_admin', 'admin'].includes(callerProfile.role);
  const { data: callerProducerMemberships } = await adminClient.from('producer_members').select('producer_id, role').eq('profile_id', sessionData.user.id);
  const callerProducerIds = (callerProducerMemberships ?? []).map((m: any) => m.producer_id);
  const isProducer = callerProfile.role === 'producer' || callerProducerIds.length > 0;
  if (!isPlatformAdmin && !isProducer) return { error: 'Solo admin o productor pueden administrar usuarios operativos.', status: 403 } as const;

  return { adminClient, isPlatformAdmin, callerProducerIds } as const;
}

export async function GET(request: Request) {
  const checked = await requireAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { adminClient, isPlatformAdmin, callerProducerIds } = checked;

  const profilesRes = await adminClient.from('profiles').select('id,full_name,phone,role,active,created_at').order('created_at', { ascending: false }).limit(300);
  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 400 });
  const membersRes = await adminClient.from('producer_members').select('profile_id,producer_id,role,producer:producers(name)').order('created_at', { ascending: false });
  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 400 });
  const listed = await adminClient.auth.admin.listUsers();
  if (listed.error) return NextResponse.json({ error: listed.error.message }, { status: 400 });

  const authById = new Map(listed.data.users.map((user) => [user.id, user]));
  const allowedProfileIds = isPlatformAdmin
    ? new Set((profilesRes.data ?? []).map((profile: any) => profile.id))
    : new Set((membersRes.data ?? []).filter((row: any) => callerProducerIds.includes(row.producer_id)).map((row: any) => row.profile_id));

  const users = (profilesRes.data ?? []).filter((profile: any) => allowedProfileIds.has(profile.id)).map((profile: any) => {
    const operationalRoles = (membersRes.data ?? []).filter((row: any) => row.profile_id === profile.id);
    return { ...profile, email: authById.get(profile.id)?.email ?? '', roles: [{ role: 'buyer', active: true }, ...operationalRoles] };
  });

  return NextResponse.json({ users, assignments: users.flatMap((user: any) => user.roles) });
}

export async function POST(request: Request) {
  const checked = await requireAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { adminClient, isPlatformAdmin, callerProducerIds } = checked;
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '').trim() || randomPassword();
  const fullName = String(body?.fullName ?? '').trim();
  const extraRole = String(body?.role ?? 'buyer').trim();
  const phone = String(body?.phone ?? '').trim();
  const producerName = String(body?.producerName ?? '').trim();
  const producerIdFromBody = String(body?.producerId ?? '').trim() || null;

  if (!email || !fullName) return NextResponse.json({ error: 'Completá nombre y email.' }, { status: 400 });
  if (extraRole && !isAssignableRole(extraRole)) return NextResponse.json({ error: 'Solo se pueden sumar roles productor, RRPP o acreditador. Admin y super admin no se crean desde la web.' }, { status: 400 });
  if (!isPlatformAdmin && extraRole === 'producer') return NextResponse.json({ error: 'Un productor no puede crear otro productor.' }, { status: 403 });
  if (!isPlatformAdmin && extraRole && !['buyer', 'rrpp', 'accreditor'].includes(extraRole)) return NextResponse.json({ error: 'El productor solo puede sumar RRPP o acreditadores.' }, { status: 403 });

  let scopedProducerId = producerIdFromBody;
  if (!isPlatformAdmin) scopedProducerId = callerProducerIds[0] ?? null;
  if ((extraRole === 'rrpp' || extraRole === 'accreditor') && !scopedProducerId) return NextResponse.json({ error: 'Falta seleccionar productora para asignar el rol.' }, { status: 400 });

  const listed = await adminClient.auth.admin.listUsers();
  if (listed.error) return NextResponse.json({ error: listed.error.message }, { status: 400 });
  let authUser = listed.data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  const wasExisting = Boolean(authUser);
  if (!authUser) {
    const created = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (created.error || !created.data.user) return NextResponse.json({ error: created.error?.message ?? 'No se pudo crear el usuario.' }, { status: 400 });
    authUser = created.data.user;
  }

  const profileRes = await adminClient.from('profiles').upsert({ id: authUser.id, full_name: fullName, phone: phone || null, role: 'buyer', active: true });
  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 });

  let producerId: string | null = null;
  if (extraRole === 'producer') {
    const producerRes = await adminClient.from('producers').insert({ owner_profile_id: authUser.id, name: producerName || fullName, email, phone: phone || null, status: 'active' }).select('id').single();
    if (producerRes.error) return NextResponse.json({ error: producerRes.error.message }, { status: 400 });
    producerId = producerRes.data.id;
    await adminClient.from('producer_members').upsert({ producer_id: producerId, profile_id: authUser.id, role: 'owner' });
  }
  if (extraRole === 'rrpp' || extraRole === 'accreditor') await adminClient.from('producer_members').upsert({ producer_id: scopedProducerId, profile_id: authUser.id, role: extraRole });

  return NextResponse.json({ user: { id: authUser.id, email, fullName, baseRole: 'buyer', extraRole: extraRole === 'buyer' ? null : extraRole, producerId: producerId ?? scopedProducerId }, message: wasExisting ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.' });
}
