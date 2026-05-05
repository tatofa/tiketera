'use client';

import { v4 as uuid } from 'uuid';
import { demoEvents } from './demo-data';
import type { CartItem, Event, Order, Ticket } from './types';

const K_EVENTS = 'ticketera.events';
const K_CART = 'ticketera.cart';
const K_ORDERS = 'ticketera.orders';
const K_TICKETS = 'ticketera.tickets';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new globalThis.Event('ticketera-storage'));
}

export function seedDemo() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(K_EVENTS)) write(K_EVENTS, demoEvents);
  if (!localStorage.getItem(K_CART)) write(K_CART, [] as CartItem[]);
  if (!localStorage.getItem(K_ORDERS)) write(K_ORDERS, [] as Order[]);
  if (!localStorage.getItem(K_TICKETS)) write(K_TICKETS, [] as Ticket[]);
}

export function resetDemo() {
  write(K_EVENTS, demoEvents);
  write(K_CART, [] as CartItem[]);
  write(K_ORDERS, [] as Order[]);
  write(K_TICKETS, [] as Ticket[]);
}

export const Store = {
  events: () => read<Event[]>(K_EVENTS, demoEvents),
  saveEvents: (events: Event[]) => write(K_EVENTS, events),
  cart: () => read<CartItem[]>(K_CART, []),
  saveCart: (cart: CartItem[]) => write(K_CART, cart),
  orders: () => read<Order[]>(K_ORDERS, []),
  saveOrders: (orders: Order[]) => write(K_ORDERS, orders),
  tickets: () => read<Ticket[]>(K_TICKETS, []),
  saveTickets: (tickets: Ticket[]) => write(K_TICKETS, tickets)
};

export function addToCart(item: CartItem) {
  const cart = Store.cart();
  const existing = cart.find((x) => x.eventId === item.eventId && x.eventDateId === item.eventDateId && x.ticketTypeId === item.ticketTypeId);
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  Store.saveCart(cart);
}

export function clearCart() { Store.saveCart([]); }

export function createPaidOrder(input: { buyerName: string; buyerEmail: string; items: CartItem[] }) {
  const events = Store.events();
  const tickets = Store.tickets();
  const totalAmount = input.items.reduce((sum, item) => {
    const event = events.find((e) => e.id === item.eventId);
    const type = event?.ticketTypes.find((t) => t.id === item.ticketTypeId);
    return sum + (type?.price ?? 0) * item.quantity;
  }, 0);
  const orderId = `ord_${uuid()}`;
  const generated: Ticket[] = input.items.flatMap((item) => {
    const event = events.find((e) => e.id === item.eventId)!;
    const type = event.ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    return Array.from({ length: item.quantity }).map(() => ({
      id: `tkt_${uuid()}`,
      orderId,
      eventId: item.eventId,
      eventDateId: item.eventDateId,
      ticketTypeId: item.ticketTypeId,
      sectorId: type.sectorId,
      qrToken: `TICKETERA:${uuid()}`,
      status: 'valid' as const,
      holderName: input.buyerName,
      holderEmail: input.buyerEmail
    }));
  });
  const order: Order = {
    id: orderId,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    status: 'paid',
    totalAmount,
    currency: 'ARS',
    createdAt: new Date().toISOString(),
    items: input.items,
    ticketIds: generated.map((t) => t.id)
  };
  Store.saveTickets([...tickets, ...generated]);
  Store.saveOrders([order, ...Store.orders()]);
  Store.saveCart([]);
  return order;
}

export function validateTicket(qrToken: string) {
  const tickets = Store.tickets();
  const ticket = tickets.find((t) => t.qrToken === qrToken || t.id === qrToken || `TICKETERA:${t.id}` === qrToken);
  if (!ticket) return { ok: false, message: 'Entrada inexistente', ticket: null as Ticket | null };
  if (ticket.status === 'used') return { ok: false, message: `Entrada ya utilizada el ${new Date(ticket.usedAt || '').toLocaleString('es-AR')}`, ticket };
  if (ticket.status !== 'valid') return { ok: false, message: `Entrada no válida: ${ticket.status}`, ticket };
  const updated = tickets.map((t) => t.id === ticket.id ? { ...t, status: 'used' as const, usedAt: new Date().toISOString() } : t);
  Store.saveTickets(updated);
  return { ok: true, message: 'Entrada validada correctamente', ticket: { ...ticket, status: 'used' as const, usedAt: new Date().toISOString() } };
}
