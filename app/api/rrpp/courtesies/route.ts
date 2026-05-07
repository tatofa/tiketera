import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClients(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return { error: 'Faltan variables de Supabase.', status: 500 } as const;
  if (!token) return { error: 'No autenticado.', status: 401 } as const;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return { userClient, adminClient } as const;
}

async function requireOperational(request: Request) {
  const clients = getClients(request);
  if ('error' in clients) return clients;
  const { userClient, adminClient } = clients;
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return { error: 'Sesión inválida.', status: 401 } as const;
  const { data: profile } = await adminClient.from('profiles').select('role,active').eq('id', user.id).maybeSingle();
  const { data: memberships } = await adminClient.from('producer_members').select('producer_id,role').eq('profile_id', user.id);
  const isPlatformAdmin = ['super_admin', 'admin'].includes(profile?.role ?? '');
  const isProducer = profile?.role === 'producer' || (memberships ?? []).some((m: any) => m.role === 'owner' || m.role === 'producer');
  const isRrpp = (memberships ?? []).some((m: any) => m.role === 'rrpp');
  if (!profile?.active || (!isPlatformAdmin && !isProducer && !isRrpp)) return { error: 'Sin permisos para cortesías RRPP.', status: 403 } as const;
  return { adminClient, user, isPlatformAdmin, isProducer, isRrpp, producerIds: (memberships ?? []).map((m: any) => m.producer_id) } as const;
}

export async function GET(request: Request) {
  const checked = await requireOperational(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { adminClient } = checked;

  const { data: allowances, error } = await adminClient
    .from('rrpp_courtesy_allowances')
    .select('id,promoter_link_id,ticket_type_id,quantity_total,quantity_used,active,created_at')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const promoterIds = Array.from(new Set((allowances ?? []).map((a: any) => a.promoter_link_id).filter(Boolean)));
  const ticketTypeIds = Array.from(new Set((allowances ?? []).map((a: any) => a.ticket_type_id).filter(Boolean)));
  const [linksRes, ticketTypesRes] = await Promise.all([
    promoterIds.length ? adminClient.from('promoter_links').select('id,code,name,event_id,active').in('id', promoterIds) : Promise.resolve({ data: [], error: null }),
    ticketTypeIds.length ? adminClient.from('ticket_types').select('id,event_id,sector_id,name,price,currency').in('id', ticketTypeIds) : Promise.resolve({ data: [], error: null })
  ]);
  if (linksRes.error) return NextResponse.json({ error: linksRes.error.message }, { status: 400 });
  if (ticketTypesRes.error) return NextResponse.json({ error: ticketTypesRes.error.message }, { status: 400 });

  const eventIds = Array.from(new Set([...(linksRes.data ?? []).map((l: any) => l.event_id), ...(ticketTypesRes.data ?? []).map((t: any) => t.event_id)].filter(Boolean)));
  const eventsRes = eventIds.length ? await adminClient.from('events').select('id,name,status').in('id', eventIds) : { data: [], error: null };
  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 400 });

  const linksById = new Map((linksRes.data ?? []).map((row: any) => [row.id, row]));
  const ticketsById = new Map((ticketTypesRes.data ?? []).map((row: any) => [row.id, row]));
  const eventsById = new Map((eventsRes.data ?? []).map((row: any) => [row.id, row]));

  const rows = (allowances ?? []).map((allowance: any) => {
    const link = linksById.get(allowance.promoter_link_id) as any;
    const ticketType = ticketsById.get(allowance.ticket_type_id) as any;
    const event = eventsById.get(link?.event_id ?? ticketType?.event_id) as any;
    return { ...allowance, remaining: Math.max(0, Number(allowance.quantity_total ?? 0) - Number(allowance.quantity_used ?? 0)), promoter_link: link ?? null, ticket_type: ticketType ?? null, event: event ?? null };
  });

  return NextResponse.json({ allowances: rows });
}

export async function POST(request: Request) {
  const checked = await requireOperational(request);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { adminClient, user } = checked;
  const body = await request.json().catch(() => null);
  const allowanceId = String(body?.allowanceId ?? '').trim();
  const holderName = String(body?.holderName ?? '').trim();
  const holderEmail = String(body?.holderEmail ?? '').trim().toLowerCase();
  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  if (!allowanceId || !holderEmail) return NextResponse.json({ error: 'Falta seleccionar cortesía y email.' }, { status: 400 });

  const { data: allowance, error: allowanceError } = await adminClient
    .from('rrpp_courtesy_allowances')
    .select('id,promoter_link_id,ticket_type_id,quantity_total,quantity_used,active')
    .eq('id', allowanceId)
    .single();
  if (allowanceError || !allowance) return NextResponse.json({ error: allowanceError?.message ?? 'Cupo de cortesías no encontrado.' }, { status: 404 });
  const remaining = Number(allowance.quantity_total ?? 0) - Number(allowance.quantity_used ?? 0);
  if (!allowance.active || remaining < quantity) return NextResponse.json({ error: 'No quedan cortesías disponibles para ese cupo.' }, { status: 400 });

  const [{ data: link }, { data: ticketType, error: ticketError }] = await Promise.all([
    adminClient.from('promoter_links').select('id,code,event_id,active').eq('id', allowance.promoter_link_id).single(),
    adminClient.from('ticket_types').select('id,event_id,sector_id,name').eq('id', allowance.ticket_type_id).single()
  ]);
  if (ticketError || !ticketType) return NextResponse.json({ error: ticketError?.message ?? 'Tipo de ticket no encontrado.' }, { status: 404 });
  if (!link?.active) return NextResponse.json({ error: 'El link RRPP no está activo.' }, { status: 400 });

  const eventId = link.event_id || ticketType.event_id;
  const [{ data: event }, { data: eventDate }] = await Promise.all([
    adminClient.from('events').select('id,producer_id,status').eq('id', eventId).single(),
    adminClient.from('event_dates').select('id').eq('event_id', eventId).eq('status', 'active').order('start_datetime', { ascending: true }).limit(1).maybeSingle()
  ]);
  if (!event) return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
  if (!eventDate) return NextResponse.json({ error: 'El evento no tiene función activa.' }, { status: 400 });

  const baseOrder = {
    user_id: user.id,
    producer_id: event.producer_id,
    buyer_name: holderName || holderEmail,
    buyer_email: holderEmail,
    status: 'paid',
    subtotal_amount: 0,
    service_fee_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    currency: 'ARS',
    channel: 'rrpp'
  };
  const orderPayload: Record<string, unknown> = { ...baseOrder, promoter_link_id: link.id };
  let orderRes = await adminClient.from('orders').insert(orderPayload as any).select('id').single();
  if (orderRes.error && orderRes.error.message.toLowerCase().includes('promoter')) orderRes = await adminClient.from('orders').insert(baseOrder as any).select('id').single();
  if (orderRes.error || !orderRes.data) return NextResponse.json({ error: orderRes.error?.message ?? 'No se pudo crear la orden.' }, { status: 400 });

  await adminClient.from('order_items').insert({ order_id: orderRes.data.id, event_id: eventId, event_date_id: eventDate.id, ticket_type_id: ticketType.id, quantity, unit_price: 0, service_fee_unit: 0 });
  const tickets = Array.from({ length: quantity }).map(() => ({ order_id: orderRes.data.id, event_id: eventId, event_date_id: eventDate.id, ticket_type_id: ticketType.id, sector_id: ticketType.sector_id, status: 'valid', holder_name: holderName || holderEmail, holder_email: holderEmail }));
  const ticketsRes = await adminClient.from('tickets').insert(tickets);
  if (ticketsRes.error) return NextResponse.json({ error: ticketsRes.error.message }, { status: 400 });

  const updateRes = await adminClient.from('rrpp_courtesy_allowances').update({ quantity_used: Number(allowance.quantity_used ?? 0) + quantity }).eq('id', allowance.id);
  if (updateRes.error) return NextResponse.json({ error: updateRes.error.message }, { status: 400 });

  return NextResponse.json({ ok: true, orderId: orderRes.data.id });
}
