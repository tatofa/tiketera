'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

function money(amount: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

export default function PromoterPage(){
 const params = useParams<{ code: string }>();
 const code = String(params.code ?? '').toLowerCase();
 const [loading,setLoading]=useState(true);
 const [missing,setMissing]=useState(false);
 const [data,setData]=useState<any>(null);
 const [price,setPrice]=useState<{amount:number;currency:string}|null>(null);

 useEffect(()=>{
  async function load(){
   const supabase=createBrowserSupabaseClient();
   if(!supabase){setMissing(true); setLoading(false); return;}
   const { data: link } = await supabase
    .from('promoter_links')
    .select('id,code,name,event_id,active,event:events(id,name,slug,description,status)')
    .eq('code', code)
    .eq('active', true)
    .maybeSingle();
   if(!link){setMissing(true); setLoading(false); return;}
   const event = Array.isArray((link as any).event) ? (link as any).event[0] : (link as any).event;
   if(!event || event.status !== 'published'){setMissing(true); setLoading(false); return;}
   const { data: ticketTypes } = await supabase.from('ticket_types').select('price,currency,status').eq('event_id', event.id).eq('status','active');
   const prices=(ticketTypes??[]).map((ticket:any)=>Number(ticket.price??0));
   setPrice(prices.length?{amount:Math.min(...prices),currency:(ticketTypes?.[0] as any)?.currency??'ARS'}:null);
   setData({link,event});
   setLoading(false);
  }
  load();
 },[code]);

 if(loading) return <section className="container-page py-10"><div className="card p-6 text-white/70">Cargando link RRPP real...</div></section>;
 if(missing || !data) return notFound();
 const promoter=data.link;
 const event=data.event;
 return <section className="container-page py-10"><span className="badge">Link RRPP /{promoter.code}</span><h1 className="mt-4 text-5xl font-black text-white">{event.name}</h1><p className="mt-3 max-w-3xl text-lg text-white/65">{event.description}</p><p className="mt-4 text-white/70">Vendedor: <strong className="text-white">{promoter.name}</strong></p><p className="mt-2 text-white/70">Desde <strong className="text-white">{price?money(price.amount,price.currency):'Sin precio'}</strong></p><div className="mt-8 flex flex-wrap gap-3"><Link href={`/eventos/${event.slug}?rrpp=${promoter.code}`} className="btn-primary">Comprar con este link</Link><Link href="/eventos" className="btn-secondary">Ver eventos</Link></div><div className="mt-10 card p-6"><h2 className="text-xl font-black text-white">Tracking comercial</h2><p className="mt-2 text-white/65">Las compras hechas desde este link quedan asociadas al código RRPP para reportes, ventas y liquidación.</p></div></section>;
}
