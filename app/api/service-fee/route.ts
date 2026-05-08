import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const fallback = {
  mode: 'percent',
  value: 12,
  minFee: 0,
  maxFee: null,
  currency: 'ARS'
};

function normalize(rule: any) {
  const percentage = Number(rule?.percentage ?? 0);
  const fixed = Number(rule?.fixed_amount ?? 0);
  const minFee = Number(rule?.min_fee ?? 0);
  const maxFee = rule?.max_fee == null ? null : Number(rule.max_fee);
  const common = { minFee, maxFee, currency: rule?.currency ?? 'ARS' };
  if (percentage > 0) return { mode: 'percent', value: percentage, ...common };
  return { mode: 'fixed', value: fixed, ...common };
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ fee: fallback });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabase
    .from('service_fee_rules')
    .select('percentage,fixed_amount,min_fee,max_fee,currency,active,channel,created_at')
    .eq('active', true)
    .eq('channel', 'web')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data?.length) return NextResponse.json({ fee: fallback });
  return NextResponse.json({ fee: normalize(data[0]) });
}
