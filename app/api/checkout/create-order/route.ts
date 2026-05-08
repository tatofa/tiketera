import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CheckoutItemInput = {
  ticketTypeId: string;
  quantity: number;
};

function calcFee(subtotal: number, rule: any) {
  const percentage = Number(rule?.percentage ?? 0);
  const fixed = Number(rule?.fixed_amount ?? 0);
  const min = Number(rule?.min_fee ?? 0);
  const max = rule?.max_fee == null ? null : Number(rule.max_fee);
  const raw = percentage > 0 ? subtotal * (percentage / 100) : fixed;
  const withMin = Math.max(raw, min);
  return Math.round(max && max > 0 ? Math.min(withMin, max) : withMin);
}

function normalizeItems(body: any): CheckoutItemInput[] {
  const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];
  const normalized: CheckoutItemInput[] = rawItems.map((item: any) => ({
    ticketTypeId: String(item?.ticketTypeId ?? '').trim(),
    quantity: Math.max(1, Number(item?.quantity ?? 1))
  })).filter((item: CheckoutItemInput) => item.ticketTypeId.length > 0 && item.quantity > 0);

  if (normalized.length) return normalized;

  const ticketTypeId = String(body?.ticketTypeId ?? '').trim();
  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  return ticketTypeId ? [{ ticketTypeId, quantity }] : [];
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const body = await request.json().catch(() => null);
  const eventId = String(body?.eventId ?? '').trim();
  const eventDateId = String(body?.eventDateId ?? '').trim();
  const buyerName = String(body?.buyerName ?? '').trim();
  const buyerEmail = String(body?.buyerEmail ?? '').trim().toLowerCase();
  const itemsInput = normalizeItems(body);
  const rrppCode = String(body?.rrppCode ?? body?.rrpp ?? '').trim().toLowerCase();
  const channel = rrppCode ? 'rrpp' : (['web', 'rrpp', 'door', 'box_office'].includes(body?.channel) ? body.channel : 'web');

  if (!eventId || !eventDateId || !itemsInput.length || !buyerName || !buyerEmail) {
    return NextResponse.json({ error: 'Faltan datos para crear la orden.' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: eventDate, error: dateError } = await supabase
    .from('event_dates')
    .select('id,event_id,status,event:events(id,name,producer_id,status)')
    .eq('id', eventDateId)
    .eq('event_id', eventId)
    .single();

  if (dateError || !eventDate) return NextResponse.json({ error: dateError?.message ?? 'Función no encontrada.' }, { status: 404 });
  if (eventDate.status !== 'active') return NextResponse.json({ error: 'La función no está activa.' }, { status: 400 });

  const event = Array.isArray((eventDate as any).event) ? (eventDate as any).event[0] : (eventDate as any).event;
  if (!event || event.status !== 'published') return NextResponse.json({ error: 'El evento no está publicado.' }, { status: 400 });

  const ticketIds = itemsInput.map((item: CheckoutItemInput) => item.ticketTypeId);
  const { data: ticketTypes, error: ticketError } = await supabase
    .from('ticket_types')
    .select('id,event_id,sector_id,name,price,currency,max_per_order,status')
    .eq('event_id', eventId)
    .in('id', ticketIds);

  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 400 });

  const items = itemsInput.map((input: CheckoutItemInput) => {
    const ticketType = (ticketTypes ?? []).find((ticket: any) => ticket.id === input.ticketTypeId);
    return ticketType ? { ticketType, quantity: input.quantity } : null;
  }).filter((item): item is { ticketType: any; quantity: number } => Boolean(item));

  if (items.length !== itemsInput.length) return NextResponse.json({ error: 'Alguna entrada seleccionada no existe.' }, { status: 400 });

  for (const item of items) {
    if (item.ticketType.status !== 'active') return NextResponse.json({ error: `La entrada ${item.ticketType.name} no está activa.` }, { status: 400 });
    if (item.quantity > Number(item.ticketType.max_per_order ?? 1)) return NextResponse.json({ error: `La cantidad de ${item.ticketType.name} supera el máximo por compra.` }, { status: 400 });
  }

  let promoterLinkId: string | null = null;
  if (rrppCode) {
    const { data: link } = await supabase
      .from('promoter_links')
      .select('id,event_id,active')
      .eq('code', rrppCode)
      .eq('event_id', eventId)
      .eq('active', true)
      .maybeSingle();
    promoterLinkId = link?.id ?? null;
  }

  const { data: feeRules } = await supabase
    .from('service_fee_rules')
    .select('percentage,fixed_amount,min_fee,max_fee,currency,created_at')
    .eq('active', true)
    .eq('channel', channel)
    .order('created_at', { ascending: false });

  const feeRule = feeRules?.[0] ?? null;

  const subtotal = items.reduce((sum: number, item) => sum + Number(item.ticketType.price ?? 0) * item.quantity, 0);
  const serviceFee = calcFee(subtotal, feeRule ?? { percentage: 0, fixed_amount: 0, min_fee: 0, max_fee: null });
  const total = subtotal + serviceFee;
  const totalQty = items.reduce((sum: number, item) => sum + item.quantity, 0);
  const currency = items[0]?.ticketType?.currency ?? 'ARS';

  const baseOrder = {
    producer_id: event.producer_id,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    status: 'paid',
    subtotal_amount: subtotal,
    service_fee_amount: serviceFee,
    discount_amount: 0,
    total_amount: total,
    currency,
    channel
  };

  const orderPayload: Record<string, unknown> = promoterLinkId ? { ...baseOrder, promoter_link_id: promoterLinkId } : baseOrder;
  let orderInsert = await supabase.from('orders').insert(orderPayload as any).select('id').single();
  if (orderInsert.error && promoterLinkId && orderInsert.error.message.toLowerCase().includes('promoter')) {
    orderInsert = await supabase.from('orders').insert(baseOrder as any).select('id').single();
  }

  const order = orderInsert.data;
  if (orderInsert.error || !order) return NextResponse.json({ error: orderInsert.error?.message ?? 'No se pudo crear la orden.' }, { status: 400 });

  const itemRows = items.map((item) => ({
    order_id: order.id,
    event_id: eventId,
    event_date_id: eventDateId,
    ticket_type_id: item.ticketType.id,
    quantity: item.quantity,
    unit_price: Number(item.ticketType.price ?? 0),
    service_fee_unit: totalQty > 0 ? Math.round(serviceFee / totalQty) : 0
  }));

  const { error: itemError } = await supabase.from('order_items').insert(itemRows);
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 });

  const ticketRows = items.flatMap((item) => Array.from({ length: item.quantity }).map(() => ({
    order_id: order.id,
    event_id: eventId,
    event_date_id: eventDateId,
    ticket_type_id: item.ticketType.id,
    sector_id: item.ticketType.sector_id,
    status: 'valid',
    holder_name: buyerName,
    holder_email: buyerEmail
  })));

  const { error: ticketsError } = await supabase.from('tickets').insert(ticketRows);
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 400 });

  return NextResponse.json({ orderId: order.id, subtotal, serviceFee, total, currency });
}
