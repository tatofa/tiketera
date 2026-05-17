export type EventStatus = 'draft' | 'published' | 'unpublished' | 'cancelled';
export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'refunded';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export type EventDate = {
  id: string;
  eventId: string;
  start: string;
  end?: string;
  status: 'active' | 'cancelled' | 'sold_out';
};

export type Sector = {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
};

export type TicketType = {
  id: string;
  eventId: string;
  sectorId: string;
  name: string;
  price: number;
  currency: string;
  saleStart: string;
  saleEnd: string;
  maxPerOrder: number;
  status: 'active' | 'paused';
};

export type Event = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  venue: string;
  status: EventStatus;
  capacity: number;
  dates: EventDate[];
  sectors: Sector[];
  ticketTypes: TicketType[];
  eventCode?: string;
  eventKey?: string;
  eventType?: string;
  category?: string;
  organizerName?: string;
  artistName?: string;
  summary?: string;
  purchaseMessage?: string;
  ageRestriction?: string;
  province?: string;
  locality?: string;
  address?: string;
  accessPolicy?: string;
  termsAndConditions?: string;
};

export type CartItem = {
  eventId: string;
  eventDateId: string;
  ticketTypeId: string;
  quantity: number;
};

export type Order = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: CartItem[];
  ticketIds: string[];
};

export type Ticket = {
  id: string;
  orderId: string;
  eventId: string;
  eventDateId: string;
  ticketTypeId: string;
  sectorId: string;
  qrToken: string;
  status: TicketStatus;
  holderName: string;
  holderEmail: string;
  usedAt?: string;
};
