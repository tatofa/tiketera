import { Event } from './types';

const now = new Date();
const plus = (days: number, hour = 21) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const demoEvents: Event[] = [
  {
    id: 'evt_rock_001',
    name: 'Noche Rock Buenos Aires',
    slug: 'noche-rock-buenos-aires',
    description: 'Festival indoor con bandas emergentes, foodtrucks y zona VIP.',
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1600&auto=format&fit=crop',
    venue: 'Arena Palermo',
    status: 'published',
    capacity: 1500,
    dates: [
      { id: 'date_rock_1', eventId: 'evt_rock_001', start: plus(21), status: 'active' },
      { id: 'date_rock_2', eventId: 'evt_rock_001', start: plus(22), status: 'active' }
    ],
    sectors: [
      { id: 'sec_general_rock', eventId: 'evt_rock_001', name: 'General', capacity: 1100 },
      { id: 'sec_vip_rock', eventId: 'evt_rock_001', name: 'VIP', capacity: 400 }
    ],
    ticketTypes: [
      { id: 'tt_rock_general', eventId: 'evt_rock_001', sectorId: 'sec_general_rock', name: 'General', price: 18000, currency: 'ARS', saleStart: now.toISOString(), saleEnd: plus(20), maxPerOrder: 6, status: 'active' },
      { id: 'tt_rock_vip', eventId: 'evt_rock_001', sectorId: 'sec_vip_rock', name: 'VIP', price: 42000, currency: 'ARS', saleStart: now.toISOString(), saleEnd: plus(20), maxPerOrder: 4, status: 'active' }
    ]
  },
  {
    id: 'evt_teatro_001',
    name: 'Comedia de Medianoche',
    slug: 'comedia-de-medianoche',
    description: 'Obra teatral con función única y plateas numeradas por sector.',
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=1600&auto=format&fit=crop',
    venue: 'Teatro Central',
    status: 'published',
    capacity: 650,
    dates: [{ id: 'date_teatro_1', eventId: 'evt_teatro_001', start: plus(12, 20), status: 'active' }],
    sectors: [
      { id: 'sec_platea_teatro', eventId: 'evt_teatro_001', name: 'Platea', capacity: 450 },
      { id: 'sec_pullman_teatro', eventId: 'evt_teatro_001', name: 'Pullman', capacity: 200 }
    ],
    ticketTypes: [
      { id: 'tt_teatro_platea', eventId: 'evt_teatro_001', sectorId: 'sec_platea_teatro', name: 'Platea', price: 28000, currency: 'ARS', saleStart: now.toISOString(), saleEnd: plus(11), maxPerOrder: 8, status: 'active' },
      { id: 'tt_teatro_pullman', eventId: 'evt_teatro_001', sectorId: 'sec_pullman_teatro', name: 'Pullman', price: 17000, currency: 'ARS', saleStart: now.toISOString(), saleEnd: plus(11), maxPerOrder: 8, status: 'active' }
    ]
  }
];
