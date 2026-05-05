'use client';
import { useEffect, useState } from 'react';
import { Store } from '@/lib/store';
import { Order } from '@/lib/types';
import { money, dateTime } from '@/lib/format';

export default function SalesPage(){const [orders,setOrders]=useState<Order[]>([]);useEffect(()=>setOrders(Store.orders()),[]);return <section className="container-page py-10"><h1 className="text-4xl font-black">Ventas</h1><div className="mt-8 overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-4">Orden</th><th>Comprador</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className="border-t"><td className="p-4 font-mono text-xs">{o.id}</td><td>{o.buyerName}<p className="text-slate-500">{o.buyerEmail}</p></td><td>{dateTime(o.createdAt)}</td><td className="font-bold">{money(o.totalAmount,o.currency)}</td><td><span className="badge bg-emerald-100 text-emerald-700">{o.status}</span></td></tr>)}</tbody></table>{!orders.length&&<p className="p-6 text-slate-500">Sin ventas todavía.</p>}</div></section>}
