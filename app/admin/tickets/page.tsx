'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Gift, Mail, Plus, Save, Ticket, Wand2 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Store } from '@/lib/store';
import type { Event } from '@/lib/types';

type TicketStatus = 'active' | 'paused' | 'sold_out' | 'hidden';
type PromoMode = '1x1' | '2x1' | '3x1' | '4x1';
type TicketKind = 'sale' | 'courtesy';

type ManagedTicket = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  body: string;
  status: TicketStatus;
  kind: TicketKind;
  price: number;
  quantity: number;
  available: number;
  maxPerOrder: number;
  promoMode: PromoMode;
  saleStart: string;
  saleEnd: string;
  entryStart: string;
  entryEnd: string;
  showSchedule: boolean;
  requiresAuthorization: boolean;
  authorizationCode: string;
  imageUrl: string;
};

const storageKey = 'ticketera.managedTickets.v1';
const today = new Date().toISOString().slice(0, 16);
const defaultStock = 100;

function seed(events: Event[]): ManagedTicket[] {
  return events.flatMap((event) => event.ticketTypes.map((ticket) => ({
    id: `${event.id}_${ticket.id}`,
    eventId: event.id,
    name: ticket.name,
    description: '',
    body: '',
    status: ticket.status === 'paused' ? 'paused' as TicketStatus : 'active' as TicketStatus,
    kind: 'sale' as TicketKind,
    price: ticket.price,
    quantity: defaultStock,
    available: defaultStock,
    maxPerOrder: ticket.maxPerOrder || 4,
    promoMode: '1x1' as PromoMode,
    saleStart: ticket.saleStart?.slice(0, 16) || today,
    saleEnd: ticket.saleEnd?.slice(0, 16) || event.dates[0]?.start?.slice(0, 16) || today,
    entryStart: event.dates[0]?.start?.slice(0, 16) || today,
    entryEnd: event.dates[0]?.end?.slice(0, 16) || event.dates[0]?.start?.slice(0, 16) || today,
    showSchedule: false,
    requiresAuthorization: false,
    authorizationCode: '',
    imageUrl: '',
  })));
}

function currency(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
}

function TicketsContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<ManagedTicket[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quick, setQuick] = useState({ prefix: 'Promo', count: 3, price: 10000, quantity: 100, promoMode: '1x1' as PromoMode });
  const [courtesy, setCourtesy] = useState({ email: '', name: '', quantity: 1, note: '' });

  useEffect(() => {
    const loadedEvents = Store.events();
    setEvents(loadedEvents);
    setSelectedEvent(loadedEvents[0]?.id ?? '');
    const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    const initial = saved ? JSON.parse(saved) as ManagedTicket[] : seed(loadedEvents);
    const normalized = initial.map((ticket) => ({ ...ticket, kind: ticket.kind ?? 'sale' as TicketKind }));
    setTickets(normalized);
    setSelectedId(normalized[0]?.id ?? '');
  }, []);

  useEffect(() => {
    if (tickets.length) localStorage.setItem(storageKey, JSON.stringify(tickets));
  }, [tickets]);

  const eventTickets = tickets.filter((ticket) => ticket.eventId === selectedEvent);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? eventTickets[0];
  const selectedEventData = events.find((event) => event.id === selectedEvent);
  const totalCapacity = eventTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const activeTickets = eventTickets.filter((ticket) => ticket.status === 'active').length;
  const promoTickets = eventTickets.filter((ticket) => ticket.promoMode !== '1x1').length;
  const courtesyTickets = eventTickets.filter((ticket) => ticket.kind === 'courtesy').length;

  function patch(id: string, changes: Partial<ManagedTicket>) {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, ...changes } : ticket));
  }

  function addTicket(kind: TicketKind = 'sale') {
    if (!selectedEvent) return;
    const newTicket: ManagedTicket = {
      id: `ticket_${Date.now()}`,
      eventId: selectedEvent,
      name: kind === 'courtesy' ? 'Cortesía' : 'Nuevo ticket',
      description: '',
      body: '',
      status: kind === 'courtesy' ? 'hidden' : 'active',
      kind,
      price: 0,
      quantity: 100,
      available: 100,
      maxPerOrder: 4,
      promoMode: '1x1',
      saleStart: today,
      saleEnd: selectedEventData?.dates[0]?.start?.slice(0, 16) ?? today,
      entryStart: selectedEventData?.dates[0]?.start?.slice(0, 16) ?? today,
      entryEnd: selectedEventData?.dates[0]?.end?.slice(0, 16) ?? selectedEventData?.dates[0]?.start?.slice(0, 16) ?? today,
      showSchedule: false,
      requiresAuthorization: false,
      authorizationCode: '',
      imageUrl: '',
    };
    setTickets((current) => [newTicket, ...current]);
    setSelectedId(newTicket.id);
    toast.success(kind === 'courtesy' ? 'Ticket de cortesía agregado.' : 'Ticket agregado.');
  }

  function quickGenerate() {
    if (!selectedEvent) return;
    const generated = Array.from({ length: quick.count }).map((_, index) => ({
      id: `quick_${Date.now()}_${index}`,
      eventId: selectedEvent,
      name: `${quick.prefix} ${index + 1}`,
      description: 'Carga rápida de ticket',
      body: '',
      status: 'active' as TicketStatus,
      kind: 'sale' as TicketKind,
      price: quick.price,
      quantity: quick.quantity,
      available: quick.quantity,
      maxPerOrder: 4,
      promoMode: quick.promoMode,
      saleStart: today,
      saleEnd: selectedEventData?.dates[0]?.start?.slice(0, 16) ?? today,
      entryStart: selectedEventData?.dates[0]?.start?.slice(0, 16) ?? today,
      entryEnd: selectedEventData?.dates[0]?.end?.slice(0, 16) ?? selectedEventData?.dates[0]?.start?.slice(0, 16) ?? today,
      showSchedule: false,
      requiresAuthorization: false,
      authorizationCode: '',
      imageUrl: '',
    }));
    setTickets((current) => [...generated, ...current]);
    setSelectedId(generated[0]?.id ?? selectedId);
    toast.success(`${generated.length} tickets generados.`);
  }

  function sendCourtesy() {
    if (!courtesy.email || !selected) {
      toast.error('Completá email y seleccioná un ticket.');
      return;
    }
    toast.success(`Cortesía preparada para ${courtesy.email}. Cuando conectemos email transaccional se envía automáticamente.`);
    setCourtesy({ email: '', name: '', quantity: 1, note: '' });
  }

  return <section className="container-page py-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-semibold text-red-300">Tickets</p>
        <h1 className="text-4xl font-black text-white">Tipos de entrada</h1>
        <p className="mt-2 max-w-3xl text-white/65">Creá tickets de venta y cortesía, promos 2x1/3x1/4x1, stock, horarios, estados y envíos por email. Los RRPP usan el mismo cargo de servicio global.</p>
      </div>
      <div className="flex flex-wrap gap-2"><button onClick={() => addTicket('courtesy')} className="btn-secondary"><Gift size={18} className="mr-2"/>Agregar cortesía</button><button onClick={() => addTicket('sale')} className="btn-primary"><Plus size={18} className="mr-2"/>Agregar ticket</button></div>
    </div>

    <div className="mt-8 grid gap-4 md:grid-cols-5"><div className="card p-5"><p className="text-sm text-white/55">Tickets del evento</p><p className="mt-2 text-3xl font-black text-white">{eventTickets.length}</p></div><div className="card p-5"><p className="text-sm text-white/55">Activos</p><p className="mt-2 text-3xl font-black text-white">{activeTickets}</p></div><div className="card p-5"><p className="text-sm text-white/55">Stock total</p><p className="mt-2 text-3xl font-black text-white">{totalCapacity}</p></div><div className="card p-5"><p className="text-sm text-white/55">Promos</p><p className="mt-2 text-3xl font-black text-white">{promoTickets}</p></div><div className="card p-5"><p className="text-sm text-white/55">Cortesías</p><p className="mt-2 text-3xl font-black text-white">{courtesyTickets}</p></div></div>

    <div className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-6">
        <div className="card p-6"><h2 className="text-xl font-black text-white">Evento</h2><select className="input mt-4" value={selectedEvent} onChange={(event) => { setSelectedEvent(event.target.value); setSelectedId(tickets.find((ticket) => ticket.eventId === event.target.value)?.id ?? ''); }}>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></div>
        <div className="card p-6"><div className="flex items-center gap-2"><Wand2 className="text-red-200"/><h2 className="text-xl font-black text-white">Carga rápida</h2></div><p className="mt-2 text-sm text-white/60">Generá varios tickets con pocos parámetros y después editá cada uno en detalle.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Prefijo" value={quick.prefix} onChange={(e) => setQuick({ ...quick, prefix: e.target.value })}/><input className="input" type="number" min="1" placeholder="Cantidad de tipos" value={quick.count} onChange={(e) => setQuick({ ...quick, count: Number(e.target.value) })}/><input className="input" type="number" min="0" placeholder="Precio" value={quick.price} onChange={(e) => setQuick({ ...quick, price: Number(e.target.value) })}/><input className="input" type="number" min="0" placeholder="Stock" value={quick.quantity} onChange={(e) => setQuick({ ...quick, quantity: Number(e.target.value) })}/><select className="input sm:col-span-2" value={quick.promoMode} onChange={(e) => setQuick({ ...quick, promoMode: e.target.value as PromoMode })}><option value="1x1">Sin promo</option><option value="2x1">Promo 2x1</option><option value="3x1">Promo 3x1</option><option value="4x1">Promo 4x1</option></select></div><button onClick={quickGenerate} className="btn-secondary mt-4 w-full">Generar rápido</button></div>
        <div className="card p-6"><h2 className="text-xl font-black text-white">Tickets creados</h2><div className="mt-4 space-y-2">{eventTickets.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected?.id === ticket.id ? 'border-red-300 bg-red-950/35' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{ticket.name}</p><p className="text-sm text-white/55">{ticket.kind === 'courtesy' ? 'Cortesía' : currency(ticket.price)} · stock {ticket.available}/{ticket.quantity}</p></div><span className="badge">{ticket.kind === 'courtesy' ? 'cortesía' : ticket.promoMode}</span></div></button>)}</div></div>
      </div>

      {selected && <div className="space-y-6"><div className="card p-6"><div className="flex items-center gap-2"><Ticket className="text-red-200"/><h2 className="text-xl font-black text-white">Editar ticket</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="label">Nombre del ticket</span><input className="input mt-1" value={selected.name} onChange={(e) => patch(selected.id, { name: e.target.value })}/></label><label><span className="label">Tipo</span><select className="input mt-1" value={selected.kind} onChange={(e) => patch(selected.id, { kind: e.target.value as TicketKind, price: e.target.value === 'courtesy' ? 0 : selected.price, status: e.target.value === 'courtesy' ? 'hidden' : selected.status })}><option value="sale">Venta</option><option value="courtesy">Cortesía</option></select></label><label><span className="label">Estado</span><select className="input mt-1" value={selected.status} onChange={(e) => patch(selected.id, { status: e.target.value as TicketStatus })}><option value="active">Activo</option><option value="paused">Pausado</option><option value="sold_out">Agotado</option><option value="hidden">Oculto</option></select></label><label><span className="label">Promo de ticket</span><select className="input mt-1" value={selected.promoMode} onChange={(e) => patch(selected.id, { promoMode: e.target.value as PromoMode })}><option value="1x1">Sin promo</option><option value="2x1">2x1</option><option value="3x1">3x1</option><option value="4x1">4x1</option></select></label><label className="md:col-span-2"><span className="label">Descripción</span><textarea className="input mt-1 min-h-20" value={selected.description} onChange={(e) => patch(selected.id, { description: e.target.value })}/></label><label className="md:col-span-2"><span className="label">Texto en entrada</span><textarea className="input mt-1 min-h-28" value={selected.body} onChange={(e) => patch(selected.id, { body: e.target.value })}/></label><label><span className="label">Precio</span><input className="input mt-1" type="number" min="0" disabled={selected.kind === 'courtesy'} value={selected.kind === 'courtesy' ? 0 : selected.price} onChange={(e) => patch(selected.id, { price: Number(e.target.value) })}/></label><label><span className="label">Cantidad disponible</span><input className="input mt-1" type="number" min="0" value={selected.available} onChange={(e) => patch(selected.id, { available: Number(e.target.value) })}/></label><label><span className="label">Cantidad total</span><input className="input mt-1" type="number" min="0" value={selected.quantity} onChange={(e) => patch(selected.id, { quantity: Number(e.target.value) })}/></label><label><span className="label">Máximo por compra</span><input className="input mt-1" type="number" min="1" value={selected.maxPerOrder} onChange={(e) => patch(selected.id, { maxPerOrder: Number(e.target.value) })}/></label><label className="md:col-span-2"><span className="label">Imagen del ticket</span><input className="input mt-1" value={selected.imageUrl} onChange={(e) => patch(selected.id, { imageUrl: e.target.value })} placeholder="URL de imagen"/></label></div><div className="mt-6 grid gap-4 md:grid-cols-2"><label><span className="label">Inicio venta</span><input className="input mt-1" type="datetime-local" value={selected.saleStart} onChange={(e) => patch(selected.id, { saleStart: e.target.value })}/></label><label><span className="label">Fin venta / vencimiento promo</span><input className="input mt-1" type="datetime-local" value={selected.saleEnd} onChange={(e) => patch(selected.id, { saleEnd: e.target.value })}/></label><label><span className="label">Hora inicio ingreso</span><input className="input mt-1" type="datetime-local" value={selected.entryStart} onChange={(e) => patch(selected.id, { entryStart: e.target.value })}/></label><label><span className="label">Hora fin ingreso</span><input className="input mt-1" type="datetime-local" value={selected.entryEnd} onChange={(e) => patch(selected.id, { entryEnd: e.target.value })}/></label></div><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="flex items-center gap-2 rounded-2xl bg-white/5 p-4 text-sm font-bold text-white"><input type="checkbox" checked={selected.showSchedule} onChange={(e) => patch(selected.id, { showSchedule: e.target.checked })}/> Mostrar fechas y horas de venta</label><label className="flex items-center gap-2 rounded-2xl bg-white/5 p-4 text-sm font-bold text-white"><input type="checkbox" checked={selected.requiresAuthorization} onChange={(e) => patch(selected.id, { requiresAuthorization: e.target.checked })}/> Requiere código de autorización</label></div>{selected.requiresAuthorization && <label className="mt-4 block"><span className="label">Código de autorización</span><input className="input mt-1" value={selected.authorizationCode} onChange={(e) => patch(selected.id, { authorizationCode: e.target.value })}/></label>}<button onClick={() => toast.success('Ticket guardado localmente.')} className="btn-primary mt-6"><Save size={18} className="mr-2"/>Guardar ticket</button></div><div className="card p-6"><div className="flex items-center gap-2"><Gift className="text-red-200"/><h2 className="text-xl font-black text-white">Enviar cortesías</h2></div><p className="mt-2 text-sm text-white/60">Elegí un ticket de tipo cortesía u oculto, cargá destinatario y enviá por email.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><input className="input" placeholder="Nombre destinatario" value={courtesy.name} onChange={(e) => setCourtesy({ ...courtesy, name: e.target.value })}/><input className="input" type="email" placeholder="Email destinatario" value={courtesy.email} onChange={(e) => setCourtesy({ ...courtesy, email: e.target.value })}/><input className="input" type="number" min="1" placeholder="Cantidad" value={courtesy.quantity} onChange={(e) => setCourtesy({ ...courtesy, quantity: Number(e.target.value) })}/><input className="input" placeholder="Nota interna" value={courtesy.note} onChange={(e) => setCourtesy({ ...courtesy, note: e.target.value })}/></div><button onClick={sendCourtesy} className="btn-secondary mt-4"><Mail size={18} className="mr-2"/>Enviar cortesía</button></div></div>}
    </div>
  </section>;
}

export default function TicketsPage() { return <AuthGate allow={['super_admin','admin','producer']}><TicketsContent /></AuthGate>; }
