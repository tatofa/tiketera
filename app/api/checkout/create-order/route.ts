import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function calcFee(subtotal: number, rule: any) {
  const percentage = Number(rule?.percentage ?? 0);
  const fixed = Number(rule?.fixed_amount ?? 0);
  const min = Number(rule?.min_fee ?? 0);
  const max = rule?.max_fee == null ? null : Number(rule.max_fee);
  const raw = percentage > 0 ? subtotal * (percentage / 100) : fixed;
  const withMin = Math.max(raw, min);
  return Math.round(max && max > 0 ? Math.min(withMin, max) : withMin);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: 'Faltan variables de Supabase.' }, { status: 500 });

  const body = await request.json().catch(() => null);
  const eventId = String(body?.eventId ?? '').trim();
  const eventDateId = String(body?.eventDateId ?? '').trim();
  const ticketTypeId = String(body?.ticketTypeId ?? '').trim();
  const buyerName = String(body?.buyerName ?? '').trim();
  const buyerEmail = String(body?.buyerEmail ?? '').trim().toLowerCase();
  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  const rrppCode = String(body?.rrppCode ?? '').trim().toLowerCase();
  const channel = rrppCode ? 'rrpp' : (['web', 'rrpp', 'door', 'box_office'].includes(body?.channel) ? body.channel : 'web');

  if (!eventId || !eventDateId || !ticketTypeId || !buyerName || !buyerEmail) {
    return NextResponse.json({ error: 'Faltan datos para crear la orden.' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: ticketType, error: ticketError } = await supabase
    .from('ticket_types')
    .select('id,event_id,sector_id,name,price,currency,max_per_order,status,event:events(id,name,producer_id,status)')
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .single();

  if (ticketError || !ticketType) return NextResponse.json({ error: ticketError?.message ?? 'Tipo de entrada no encontrado.' }, { status: 404 });
  if (ticketType.status !== 'active') return NextResponse.json({ error: 'El tipo de entrada no está activo.' }, { status: 400 });
  if (quantity > Number(ticketType.max_per_order ?? 1)) return NextResponse.json({ error: 'La cantidad supera el máximo por compra.' }, { status: 400 });

  const event = Array.isArray((ticketType as any).event) ? (ticketType as any).event[0] : (ticketType as any).event;
  if (!event || event.status !== 'published') return NextResponse.json({ error: 'El evento no está publicado.' }, { status: 400 });

  const { data: eventDate, error: dateError } = await supabase
    .from('event_dates')
    .select('id,event_id,status')
    .eq('id', eventDateId)
    .eq('event_id', eventId)
    .single();

  if (dateError || !eventDate) return NextResponse.json({ error: dateError?.message ?? 'Función no encontrada.' }, { status: 404 });
  if (eventDate.status !== 'active') return NextResponse.json({ error: 'La función no está activa.' }, { status: 400 });

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

  const { data: feeRule } = await supabase
    .from('service_fee_rules')
    .select('percentage,fixed_amount,min_fee,max_fee,currency')
    .eq('active', true)
    .eq('channel', channel)
    .limit(1)
    .maybeSingle();

  const unitPrice = Number(ticketType.price ?? 0);
  const subtotal = unitPrice * quantity;
  const serviceFee = calcFee(subtotal, feeRule ?? { percentage: 0, fixed_amount: 0, min_fee: 0, max_fee: null });
  const total = subtotal + serviceFee;

  const baseOrder = {
    producer_id: event.producer_id,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    status: 'paid',
    subtotal_amount: subtotal,
    service_fee_amount: serviceFee,
    discount_amount: 0,
    total_amount: total,
    currency: ticketType.currency ?? 'ARS',
    channel
  };

  let orderInsert = await supabase.from('orders').insert(promoterLinkId ? { ...baseOrder, promoter_link_id: promoterLinkId } : baseOrder).select('id').single();
  if (orderInsert.error && promoterLinkId && orderInsert.error.message.toLowerCase().includes('promoter')) {
    orderInsert = await supabase.from('orders').insert(baseOrder).select('id').single();
  }

  const order = orderInsert.data;
  if (orderInsert.error || !order) return NextResponse.json({ error: orderInsert.error?.message ?? 'No se pudo crear la orden.' }, { status: 400 });

  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    event_id: eventId,
    event_date_id: eventDateId,
    ticket_type_id: ticketTypeId,
    quantity,
    unit_price: unitPrice,
    service_fee_unit: Math.round(serviceFee / quantity)
  });

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 });

  const tickets = Array.from({ length: quantity }).map(() => ({
    order_id: order.id,
    event_id: eventId,
    event_date_id: eventDateId,
    ticket_type_id: ticketTypeId,
    sector_id: ticketType.sector_id,
    status: 'valid',
    holder_name: buyerName,
    holder_email: buyerEmail
  }));

  const { error: ticketsError } = await supabase.from('tickets').insert(tickets);
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 400 });

  return NextResponse.json({ orderId: order.id, subtotal, serviceFee, total, currency: ticketType.currency ?? 'ARS' });
}
