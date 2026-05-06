import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const assignableRoles = ['producer', 'rrpp', 'accreditor'] as const;
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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: 'Faltan variables de entorno de Supabase.', status: 500 } as const;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { error: 'No autenticado.', status: 401 } as const;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: sessionData, error: sessionError } = await userClient.auth.getUser();
  if (sessionError || !sessionData.user) return { error: 'Sesión inválida.', status: 401 } as const;

  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles')
    .select('id, role, active')
    .eq('id', sessionData.user.id)
    .single();

  if (callerError || !callerProfile || !callerProfile.active) {
    return { error: 'No tenés permisos para administrar usuarios.', status: 403 } as const;
  }

  const isPlatformAdmin = ['super_admin', 'admin'].includes(callerProfile.role);
  const { data: callerProducerMemberships } = await adminClient
    .from('producer_members')
    .select('producer_id, role')
    .eq('profile_id', sessionData.user.id);
  const callerProducerIds = (callerProducerMemberships ?? []).map((m: any) => m.producer_id);
  const isProducer = callerProfile.role === 'producer' || callerProducerIds.length > 0;

  if (!isPlatformAdmin && !isProducer) {
    return { error: 'Solo admin o productor pueden administrar usuarios operativos.', status: 403 } as const;
  }

  return { adminClient, sessionUserId: sessionData.user.id, callerProfile, isPlatformAdmin, callerProducerIds } as const;
}

export async function GET(request: Request) {
  const checked = await requireAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });

  const { adminClient, isPlatformAdmin, callerProducerIds } = checked;
  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id,full_name,email,phone,role,active,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 400 });

  let rolesQuery = adminClient
    .from('user_role_assignments')
    .select('profile_id,role,producer_id,event_id,active,created_at,producer:producers(name),event:events(name)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (!isPlatformAdmin) rolesQuery = rolesQuery.in('producer_id', callerProducerIds);

  const { data: assignments, error: assignmentsError } = await rolesQuery;
  if (assignmentsError) return NextResponse.json({ error: assignmentsError.message }, { status: 400 });

  const allowedProfileIds = isPlatformAdmin
    ? new Set((profiles ?? []).map((profile: any) => profile.id))
    : new Set((assignments ?? []).map((row: any) => row.profile_id));

  const users = (profiles ?? [])
    .filter((profile: any) => allowedProfileIds.has(profile.id))
    .map((profile: any) => ({
      ...profile,
      roles: (assignments ?? []).filter((row: any) => row.profile_id === profile.id)
    }));

  return NextResponse.json({ users, assignments: assignments ?? [] });
}

export async function POST(request: Request) {
  const checked = await requireAdmin(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });

  const { adminClient, sessionUserId, callerProfile, isPlatformAdmin, callerProducerIds } = checked;
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '').trim() || randomPassword();
  const fullName = String(body?.fullName ?? '').trim();
  const extraRole = String(body?.role ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const producerName = String(body?.producerName ?? '').trim();
  const producerIdFromBody = String(body?.producerId ?? '').trim() || null;
  const eventId = String(body?.eventId ?? '').trim() || null;

  if (!email || !fullName) {
    return NextResponse.json({ error: 'Completá nombre y email.' }, { status: 400 });
  }

  if (extraRole && !isAssignableRole(extraRole)) {
    return NextResponse.json({ error: 'Solo se pueden sumar roles productor, RRPP o acreditador. Admin y super admin no se crean desde la web.' }, { status: 400 });
  }

  if (!isPlatformAdmin && extraRole === 'producer') {
    return NextResponse.json({ error: 'Un productor no puede crear otro productor.' }, { status: 403 });
  }

  if (!isPlatformAdmin && extraRole && !['rrpp', 'accreditor'].includes(extraRole)) {
    return NextResponse.json({ error: 'El productor solo puede sumar RRPP o acreditadores.' }, { status: 403 });
  }

  let scopedProducerId = producerIdFromBody;
  if (!isPlatformAdmin) {
    scopedProducerId = callerProducerIds[0] ?? null;
  }

  if ((extraRole === 'rrpp' || extraRole === 'accreditor') && !scopedProducerId) {
    return NextResponse.json({ error: 'Falta seleccionar productora para asignar el rol.' }, { status: 400 });
  }

  const { data: listed, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) return NextResponse.json({ error: listError.message }, { status: 400 });
  let authUser = listed.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  const wasExisting = Boolean(authUser);

  if (!authUser) {
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? 'No se pudo crear el usuario.' }, { status: 400 });
    }
    authUser = created.user;
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: authUser.id,
    full_name: fullName,
    email,
    phone: phone || null,
    role: 'buyer',
    active: true
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  await adminClient.from('user_role_assignments').upsert({
    profile_id: authUser.id,
    role: 'buyer',
    producer_id: null,
    event_id: null,
    active: true,
    assigned_by: sessionUserId
  });

  let producerId: string | null = null;
  if (extraRole === 'producer') {
    const { data: producer, error: producerError } = await adminClient
      .from('producers')
      .insert({ owner_profile_id: authUser.id, name: producerName || fullName, email, phone: phone || null })
      .select('id')
      .single();
    if (producerError) return NextResponse.json({ error: producerError.message }, { status: 400 });
    producerId = producer.id;
    await adminClient.from('producer_members').upsert({ producer_id: producer.id, profile_id: authUser.id, role: 'owner' });
    await adminClient.from('user_role_assignments').upsert({ profile_id: authUser.id, role: 'producer', producer_id: producer.id, event_id: null, active: true, assigned_by: sessionUserId });
  }

  if (extraRole === 'rrpp' || extraRole === 'accreditor') {
    await adminClient.from('user_role_assignments').upsert({
      profile_id: authUser.id,
      role: extraRole,
      producer_id: scopedProducerId,
      event_id: eventId,
      active: true,
      assigned_by: sessionUserId
    });
  }

  return NextResponse.json({
    user: { id: authUser.id, email, fullName, baseRole: 'buyer', extraRole: extraRole || null, producerId: producerId ?? scopedProducerId },
    message: wasExisting ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.'
  });
}
