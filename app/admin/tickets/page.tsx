'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Gift, Mail, Plus, Save, Ticket, Wand2 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { createCourtesyTicketsInSupabase, loadEventsFromSupabase, saveManagedTicketToSupabase } from '@/lib/supabase-events';
import type { Event } from '@/lib/types';

type TicketStatus = 'active' | 'paused' | 'sold_out' | 'hidden';
type PromoMode = '1x1' | '2x1' | '3x1' | '4x1';
type ManagedTicket = { id:string; eventId:string; sectorId:string; name:string; status:TicketStatus; price:number; maxPerOrder:number; promoMode:PromoMode; saleStart:string; saleEnd:string };

const today = new Date().toISOString().slice(0, 16);
function currency(value: number) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0); }
function fromEventTicket(ticket: Event['ticketTypes'][number]): ManagedTicket { return { id: ticket.id, eventId: ticket.eventId, sectorId: ticket.sectorId, name: ticket.name, status: ticket.status as TicketStatus, price: ticket.price, maxPerOrder: ticket.maxPerOrder || 4, promoMode: '1x1', saleStart: ticket.saleStart?.slice(0, 16) || today, saleEnd: ticket.saleEnd?.slice(0, 16) || today }; }

function TicketsContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<ManagedTicket[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quick, setQuick] = useState({ prefix: 'Promo', count: 3, price: 10000, promoMode: '1x1' as PromoMode });
  const [courtesy, setCourtesy] = useState({ ticketId: '', email: '', name: '', quantity: 1, note: '' });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const eventFromUrl = params.get('eventId') ?? '';
    const result = await loadEventsFromSupabase();
    setEvents(result.events);
    setTickets(result.events.flatMap(event => event.ticketTypes.map(fromEventTicket)));
    setError(result.ok ? '' : result.error ?? 'No se pudieron cargar tickets.');
    const firstEvent = result.events.find(event => event.id === eventFromUrl)?.id ?? result.events[0]?.id ?? '';
    const firstTicket = result.events.find(event => event.id === firstEvent)?.ticketTypes[0]?.id ?? '';
    setSelectedEvent(firstEvent);
    setSelectedId(firstTicket);
    setCourtesy(current => ({ ...current, ticketId: firstTicket }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const eventTickets = useMemo(() => tickets.filter(ticket => ticket.eventId === selectedEvent), [tickets, selectedEvent]);
  const selected = tickets.find(ticket => ticket.id === selectedId) ?? eventTickets[0];
  const selectedEventData = events.find(event => event.id === selectedEvent);
  const activeTickets = eventTickets.filter(ticket => ticket.status === 'active').length;
  const promoTickets = eventTickets.filter(ticket => ticket.promoMode !== '1x1').length;

  function patch(id: string, changes: Partial<ManagedTicket>) { setTickets(current => current.map(ticket => ticket.id === id ? { ...ticket, ...changes } : ticket)); }

  async function persist(ticket: ManagedTicket) {
    const result = await saveManagedTicketToSupabase({ id: ticket.id, eventId: ticket.eventId, name: ticket.name, status: ticket.status, price: ticket.price, maxPerOrder: ticket.maxPerOrder, saleStart: new Date(ticket.saleStart).toISOString(), saleEnd: new Date(ticket.saleEnd).toISOString() }, ticket.sectorId);
    if (result.ok) toast.success('Ticket guardado en Supabase.');
    else toast.error(result.error ?? 'No se pudo guardar el ticket.');
  }

  async function addTicket() {
    if (!selectedEventData) return;
    const sectorId = selectedEventData.sectors[0]?.id;
    if (!sectorId) { toast.error('El evento no tiene sector en Supabase.'); return; }
    const newTicket: ManagedTicket = { id: crypto.randomUUID(), eventId: selectedEvent, sectorId, name: 'Nuevo ticket', status: 'active', price: 0, maxPerOrder: 4, promoMode: '1x1', saleStart: today, saleEnd: selectedEventData.dates[0]?.start?.slice(0, 16) ?? today };
    setTickets(current => [newTicket, ...current]);
    setSelectedId(newTicket.id);
    setCourtesy(current => ({ ...current, ticketId: newTicket.id }));
    await persist(newTicket);
  }

  async function quickGenerate() {
    if (!selectedEventData) return;
    const sectorId = selectedEventData.sectors[0]?.id;
    if (!sectorId) { toast.error('El evento no tiene sector en Supabase.'); return; }
    const generated = Array.from({ length: quick.count }).map((_, index) => ({ id: crypto.randomUUID(), eventId: selectedEvent, sectorId, name: `${quick.prefix} ${index + 1}`, status: 'active' as TicketStatus, price: quick.price, maxPerOrder: 4, promoMode: quick.promoMode, saleStart: today, saleEnd: selectedEventData.dates[0]?.start?.slice(0, 16) ?? today }));
    setTickets(current => [...generated, ...current]);
    setSelectedId(generated[0]?.id ?? selectedId);
    setCourtesy(current => ({ ...current, ticketId: generated[0]?.id ?? current.ticketId }));
    for (const ticket of generated) await persist(ticket);
  }

  async function sendCourtesy() {
    const ticket = tickets.find(item => item.id === courtesy.ticketId);
    const eventDateId = selectedEventData?.dates[0]?.id;
    if (!courtesy.email || !ticket || !eventDateId) { toast.error('Completá email, tipo de ticket y función.'); return; }
    const result = await createCourtesyTicketsInSupabase({ eventId: ticket.eventId, eventDateId, ticketTypeId: ticket.id, sectorId: ticket.sectorId, holderName: courtesy.name || courtesy.email, holderEmail: courtesy.email, quantity: courtesy.quantity });
    if (result.ok) toast.success(`Cortesía real emitida para ${courtesy.email}.`);
    else toast.error(result.error ?? 'No se pudo emitir la cortesía.');
    setCourtesy({ ticketId: ticket.id, email: '', name: '', quantity: 1, note: '' });
  }

  return <section className="container-page py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-semibold text-red-300">Tickets</p><h1 className="text-4xl font-black text-white">Tipos de entrada</h1><p className="mt-2 max-w-3xl text-white/65">Datos reales desde Supabase. Los tipos de entrada escriben en ticket_types y las cortesías emiten orders/tickets reales.</p></div><div className="flex flex-wrap gap-2"><button onClick={sendCourtesy} className="btn-secondary"><Gift size={18} className="mr-2"/>Emitir cortesía</button><button onClick={addTicket} className="btn-primary"><Plus size={18} className="mr-2"/>Agregar ticket</button></div></div>
    {error&&<div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}{loading&&<div className="mt-8 card p-6 text-white/70">Cargando tickets reales desde Supabase...</div>}
    <div className="mt-8 grid gap-4 md:grid-cols-5"><div className="card p-5"><p className="text-sm text-white/55">Tickets del evento</p><p className="mt-2 text-3xl font-black text-white">{eventTickets.length}</p></div><div className="card p-5"><p className="text-sm text-white/55">Activos</p><p className="mt-2 text-3xl font-black text-white">{activeTickets}</p></div><div className="card p-5"><p className="text-sm text-white/55">Eventos</p><p className="mt-2 text-3xl font-black text-white">{events.length}</p></div><div className="card p-5"><p className="text-sm text-white/55">Promos visuales</p><p className="mt-2 text-3xl font-black text-white">{promoTickets}</p></div><div className="card p-5"><p className="text-sm text-white/55">Fuente</p><p className="mt-2 text-xl font-black text-white">Supabase</p></div></div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><div className="space-y-6"><div className="card p-6"><h2 className="text-xl font-black text-white">Evento</h2><select className="input mt-4" value={selectedEvent} onChange={event => { const nextEvent = event.target.value; const nextTicket = tickets.find(ticket => ticket.eventId === nextEvent)?.id ?? ''; setSelectedEvent(nextEvent); setSelectedId(nextTicket); setCourtesy(current => ({ ...current, ticketId: nextTicket })); }}>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></div><div className="card p-6"><div className="flex items-center gap-2"><Wand2 className="text-red-200"/><h2 className="text-xl font-black text-white">Carga rápida</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="label">Prefijo</span><input className="input mt-1" value={quick.prefix} onChange={e => setQuick({ ...quick, prefix: e.target.value })}/></label><label><span className="label">Cantidad</span><input className="input mt-1" type="number" min="1" value={quick.count} onChange={e => setQuick({ ...quick, count: Number(e.target.value) })}/></label><label><span className="label">Precio</span><input className="input mt-1" type="number" min="0" value={quick.price} onChange={e => setQuick({ ...quick, price: Number(e.target.value) })}/></label><label><span className="label">Promo visual</span><select className="input mt-1" value={quick.promoMode} onChange={e => setQuick({ ...quick, promoMode: e.target.value as PromoMode })}><option value="1x1">Sin promo</option><option value="2x1">2x1</option><option value="3x1">3x1</option><option value="4x1">4x1</option></select></label></div><button onClick={quickGenerate} className="btn-secondary mt-4 w-full">Generar en Supabase</button></div><div className="card p-6"><h2 className="text-xl font-black text-white">Tickets creados</h2><div className="mt-4 space-y-2">{eventTickets.map(ticket => <button key={ticket.id} onClick={() => { setSelectedId(ticket.id); setCourtesy(current => ({ ...current, ticketId: ticket.id })); }} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected?.id === ticket.id ? 'border-red-300 bg-red-950/35' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{ticket.name}</p><p className="text-sm text-white/55">{currency(ticket.price)} · máx {ticket.maxPerOrder}</p></div><span className="badge">{ticket.status}</span></div></button>)}</div></div></div>
    {selected && <div className="space-y-6"><div className="card p-6"><div className="flex items-center gap-2"><Ticket className="text-red-200"/><h2 className="text-xl font-black text-white">Editar ticket</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="label">Nombre</span><input className="input mt-1" value={selected.name} onChange={e => patch(selected.id, { name: e.target.value })}/></label><label><span className="label">Estado</span><select className="input mt-1" value={selected.status} onChange={e => patch(selected.id, { status: e.target.value as TicketStatus })}><option value="active">Activo</option><option value="paused">Pausado</option><option value="sold_out">Agotado</option><option value="hidden">Oculto</option></select></label><label><span className="label">Promo visual</span><select className="input mt-1" value={selected.promoMode} onChange={e => patch(selected.id, { promoMode: e.target.value as PromoMode })}><option value="1x1">Sin promo</option><option value="2x1">2x1</option><option value="3x1">3x1</option><option value="4x1">4x1</option></select></label><label><span className="label">Precio</span><input className="input mt-1" type="number" min="0" value={selected.price} onChange={e => patch(selected.id, { price: Number(e.target.value) })}/></label><label><span className="label">Máximo por compra</span><input className="input mt-1" type="number" min="1" value={selected.maxPerOrder} onChange={e => patch(selected.id, { maxPerOrder: Number(e.target.value) })}/></label><label><span className="label">Inicio venta</span><input className="input mt-1" type="datetime-local" value={selected.saleStart} onChange={e => patch(selected.id, { saleStart: e.target.value })}/></label><label><span className="label">Fin venta</span><input className="input mt-1" type="datetime-local" value={selected.saleEnd} onChange={e => patch(selected.id, { saleEnd: e.target.value })}/></label></div><button onClick={() => persist(selected)} className="btn-primary mt-6"><Save size={18} className="mr-2"/>Guardar en Supabase</button></div><div className="card p-6"><div className="flex items-center gap-2"><Gift className="text-red-200"/><h2 className="text-xl font-black text-white">Enviar cortesías</h2></div><p className="mt-2 text-sm text-white/60">Podés emitir cortesía usando cualquier tipo de ticket existente.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="md:col-span-2"><span className="label">Tipo de ticket</span><select className="input mt-1" value={courtesy.ticketId} onChange={e => setCourtesy({ ...courtesy, ticketId: e.target.value })}>{eventTickets.map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.name} · {currency(ticket.price)}</option>)}</select></label><label><span className="label">Nombre destinatario</span><input className="input mt-1" value={courtesy.name} onChange={e => setCourtesy({ ...courtesy, name: e.target.value })}/></label><label><span className="label">Email destinatario</span><input className="input mt-1" type="email" value={courtesy.email} onChange={e => setCourtesy({ ...courtesy, email: e.target.value })}/></label><label><span className="label">Cantidad</span><input className="input mt-1" type="number" min="1" value={courtesy.quantity} onChange={e => setCourtesy({ ...courtesy, quantity: Number(e.target.value) })}/></label><label><span className="label">Nota interna</span><input className="input mt-1" value={courtesy.note} onChange={e => setCourtesy({ ...courtesy, note: e.target.value })}/></label></div><button onClick={sendCourtesy} className="btn-secondary mt-4"><Mail size={18} className="mr-2"/>Emitir cortesía real</button></div></div>}
    </div></section>;
}

export default function TicketsPage() { return <AuthGate allow={['super_admin','admin','producer']}><TicketsContent /></AuthGate>; }
