import { createBrowserSupabaseClient } from './supabase';

export function formatMoney(amount: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

export function num(value: unknown) {
  return Number(value ?? 0) || 0;
}

export async function requireSupabase() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { supabase: null, userId: null, error: 'Falta configurar Supabase.' };
  const { data } = await supabase.auth.getSession();
  return { supabase, userId: data.session?.user?.id ?? null, error: data.session ? '' : 'Sesión vencida. Volvé a ingresar.' };
}

export async function loadSalesReport() {
  const { supabase, error } = await requireSupabase();
  if (!supabase) return { ok: false, rows: [] as any[], error };
  const { data, error: dbError } = await supabase
    .from('sales_report')
    .select('order_id,created_at,status,channel,event_id,event_name,producer_id,producer_name,rrpp_code,rrpp_name,quantity,unit_price,subtotal_amount,service_fee_amount,discount_amount,total_amount,currency')
    .order('created_at', { ascending: false });
  return { ok: !dbError, rows: data ?? [], error: dbError?.message ?? '' };
}

export async function loadDashboardStats() {
  const { supabase, error } = await requireSupabase();
  if (!supabase) return { ok: false, error, stats: null as any };
  const [events, orders, tickets, checkins, sales] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id,total_amount,service_fee_amount,status'),
    supabase.from('tickets').select('id,status'),
    supabase.from('checkins').select('id,result'),
    supabase.from('sales_report').select('quantity,subtotal_amount,service_fee_amount,total_amount,order_id,rrpp_code')
  ]);
  const orderRows = orders.data ?? [];
  const salesRows = sales.data ?? [];
  const uniqueOrders = new Map<string, any>();
  salesRows.forEach((row: any) => { if (row.order_id && !uniqueOrders.has(row.order_id)) uniqueOrders.set(row.order_id, row); });
  return {
    ok: !(events.error || orders.error || tickets.error || checkins.error || sales.error),
    error: events.error?.message || orders.error?.message || tickets.error?.message || checkins.error?.message || sales.error?.message || '',
    stats: {
      events: events.count ?? 0,
      orders: orderRows.length,
      tickets: (tickets.data ?? []).length,
      used: (tickets.data ?? []).filter((ticket: any) => ticket.status === 'used').length,
      checkins: (checkins.data ?? []).filter((row: any) => row.result === 'ok').length,
      revenue: orderRows.reduce((sum: number, row: any) => sum + num(row.total_amount), 0),
      soldTickets: salesRows.reduce((sum: number, row: any) => sum + num(row.quantity), 0),
      gross: Array.from(uniqueOrders.values()).reduce((sum: number, row: any) => sum + num(row.subtotal_amount), 0),
      fees: Array.from(uniqueOrders.values()).reduce((sum: number, row: any) => sum + num(row.service_fee_amount), 0),
      total: Array.from(uniqueOrders.values()).reduce((sum: number, row: any) => sum + num(row.total_amount), 0)
    }
  };
}

export async function loadPromoterLinksAndSales() {
  const { supabase, error } = await requireSupabase();
  if (!supabase) return { ok: false, error, links: [] as any[], rows: [] as any[] };
  const [links, sales] = await Promise.all([
    supabase.from('promoter_links').select('id,code,name,event_id,active,created_at').order('created_at', { ascending: false }),
    supabase.from('sales_report').select('rrpp_code,rrpp_name,quantity,unit_price,subtotal_amount,service_fee_amount,total_amount').not('rrpp_code', 'is', null)
  ]);
  const map = new Map<string, any>();
  (sales.data ?? []).forEach((row: any) => {
    const code = row.rrpp_code || 'sin_codigo';
    const current = map.get(code) ?? { code, name: row.rrpp_name || code, tickets: 0, gross: 0, serviceFees: 0, total: 0 };
    current.tickets += num(row.quantity);
    current.gross += num(row.quantity) * num(row.unit_price);
    current.serviceFees += num(row.service_fee_amount);
    current.total += num(row.total_amount);
    map.set(code, current);
  });
  return { ok: !(links.error || sales.error), error: links.error?.message || sales.error?.message || '', links: links.data ?? [], rows: Array.from(map.values()) };
}

export async function loadAccreditationProduction() {
  const { supabase, error } = await requireSupabase();
  if (!supabase) return { ok: false, error, events: [] as any[], checkins: [] as any[] };
  const [events, checkins] = await Promise.all([
    supabase.from('events').select('id,name,capacity,status').order('created_at', { ascending: false }),
    supabase.from('checkins').select('id,event_id,result,message,created_at').order('created_at', { ascending: false })
  ]);
  return { ok: !(events.error || checkins.error), error: events.error?.message || checkins.error?.message || '', events: events.data ?? [], checkins: checkins.data ?? [] };
}
