import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const creatableRoles = ['producer', 'rrpp', 'accreditor', 'buyer'] as const;
type CreatableRole = (typeof creatableRoles)[number];

function isCreatableRole(role: string): role is CreatableRole {
  return creatableRoles.includes(role as CreatableRole);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Faltan variables de entorno de Supabase.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '').trim();
  const fullName = String(body?.fullName ?? '').trim();
  const role = String(body?.role ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const producerName = String(body?.producerName ?? '').trim();

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: 'Completá nombre, email, contraseña y rol.' }, { status: 400 });
  }

  if (!isCreatableRole(role)) {
    return NextResponse.json({ error: 'Desde la web solo se pueden crear productores, RRPP, acreditadores y compradores.' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: sessionData, error: sessionError } = await userClient.auth.getUser();
  if (sessionError || !sessionData.user) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  }

  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles')
    .select('id, role, active')
    .eq('id', sessionData.user.id)
    .single();

  if (callerError || !callerProfile || !callerProfile.active || !['super_admin', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'No tenés permisos para crear usuarios.' }, { status: 403 });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role }
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? 'No se pudo crear el usuario.' }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: created.user.id,
    full_name: fullName,
    phone: phone || null,
    role,
    active: true
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  let producerId: string | null = null;
  if (role === 'producer') {
    const { data: producer, error: producerError } = await adminClient
      .from('producers')
      .insert({ owner_profile_id: created.user.id, name: producerName || fullName, email, phone: phone || null })
      .select('id')
      .single();

    if (producerError) {
      return NextResponse.json({ error: `Usuario creado, pero falló crear productor: ${producerError.message}` }, { status: 207 });
    }

    producerId = producer.id;
    await adminClient.from('producer_members').insert({ producer_id: producer.id, profile_id: created.user.id, role: 'owner' });
  }

  return NextResponse.json({
    user: { id: created.user.id, email, fullName, role, producerId },
    message: 'Usuario creado correctamente.'
  });
}
