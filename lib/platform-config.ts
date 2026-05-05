export type PlatformRole = 'super_admin' | 'admin' | 'producer' | 'rrpp' | 'accreditor' | 'buyer';

export type Permission =
  | 'events.manage_all'
  | 'events.manage_own'
  | 'sales.view_all'
  | 'sales.view_own'
  | 'sales.view_rrpp'
  | 'service_fees.manage'
  | 'users.manage'
  | 'tickets.validate'
  | 'reports.export'
  | 'links.manage_own';

export const roleLabels: Record<PlatformRole, string> = {
  super_admin: 'Admin general',
  admin: 'Administrador',
  producer: 'Productor',
  rrpp: 'RRPP / Promotor',
  accreditor: 'Acreditador',
  buyer: 'Usuario comprador'
};

export const rolePermissions: Record<PlatformRole, Permission[]> = {
  super_admin: ['events.manage_all', 'sales.view_all', 'service_fees.manage', 'users.manage', 'tickets.validate', 'reports.export', 'links.manage_own'],
  admin: ['events.manage_all', 'sales.view_all', 'users.manage', 'tickets.validate', 'reports.export', 'links.manage_own'],
  producer: ['events.manage_own', 'sales.view_own', 'reports.export', 'links.manage_own'],
  rrpp: ['sales.view_rrpp', 'links.manage_own'],
  accreditor: ['tickets.validate'],
  buyer: []
};

export const demoUsers = [
  { id: 'usr_super', name: 'Admin General', email: 'admin@ticketera.demo', role: 'super_admin' as PlatformRole },
  { id: 'usr_prod_1', name: 'Productora Sur', email: 'productor@ticketera.demo', role: 'producer' as PlatformRole },
  { id: 'usr_rrpp_1', name: 'Tato RRPP', email: 'rrpp@ticketera.demo', role: 'rrpp' as PlatformRole },
  { id: 'usr_acc_1', name: 'Ingreso Puerta 1', email: 'acreditador@ticketera.demo', role: 'accreditor' as PlatformRole },
  { id: 'usr_buyer_1', name: 'Comprador Demo', email: 'usuario@ticketera.demo', role: 'buyer' as PlatformRole }
];

export const serviceFeeConfig = {
  buyerPaysFee: true,
  defaultPercentage: 12,
  defaultFixedAmount: 450,
  minFee: 700,
  maxFee: 6500,
  currency: 'ARS',
  rules: [
    { id: 'fee_general', name: 'General online', channel: 'web', percentage: 12, fixedAmount: 450 },
    { id: 'fee_rrpp', name: 'Venta RRPP', channel: 'rrpp', percentage: 10, fixedAmount: 350 },
    { id: 'fee_door', name: 'Puerta / acreditación', channel: 'door', percentage: 0, fixedAmount: 0 }
  ]
};

export const promoterLinks = [
  { id: 'pl_tato', code: 'tato', name: 'Tato RRPP', userId: 'usr_rrpp_1', eventId: 'evt_rock_001', url: '/p/tato', commissionType: 'percent', commissionValue: 8, active: true },
  { id: 'pl_sofi', code: 'sofi', name: 'Sofi Influencer', userId: 'usr_rrpp_2', eventId: 'evt_rock_001', url: '/p/sofi', commissionType: 'fixed', commissionValue: 1200, active: true },
  { id: 'pl_teatro', code: 'teatrovip', name: 'Teatro VIP', userId: 'usr_rrpp_3', eventId: 'evt_teatro_001', url: '/p/teatrovip', commissionType: 'percent', commissionValue: 6, active: true }
];

export const salesRows = [
  { id: 'sale_001', eventId: 'evt_rock_001', eventName: 'Noche Rock Buenos Aires', channel: 'web', rrppCode: null, tickets: 86, gross: 1806000, serviceFees: 238800, net: 1567200, date: '2026-05-01' },
  { id: 'sale_002', eventId: 'evt_rock_001', eventName: 'Noche Rock Buenos Aires', channel: 'rrpp', rrppCode: 'tato', tickets: 44, gross: 924000, serviceFees: 112200, net: 811800, date: '2026-05-02' },
  { id: 'sale_003', eventId: 'evt_rock_001', eventName: 'Noche Rock Buenos Aires', channel: 'rrpp', rrppCode: 'sofi', tickets: 31, gross: 651000, serviceFees: 82150, net: 568850, date: '2026-05-02' },
  { id: 'sale_004', eventId: 'evt_teatro_001', eventName: 'Comedia de Medianoche', channel: 'web', rrppCode: null, tickets: 59, gross: 1377000, serviceFees: 170400, net: 1206600, date: '2026-05-03' },
  { id: 'sale_005', eventId: 'evt_teatro_001', eventName: 'Comedia de Medianoche', channel: 'rrpp', rrppCode: 'teatrovip', tickets: 18, gross: 504000, serviceFees: 54000, net: 450000, date: '2026-05-03' }
];

export const accreditationStats = [
  { eventId: 'evt_rock_001', eventName: 'Noche Rock Buenos Aires', gate: 'Puerta 1', valid: 317, rejected: 9, duplicated: 4, capacity: 1500 },
  { eventId: 'evt_teatro_001', eventName: 'Comedia de Medianoche', gate: 'Hall principal', valid: 96, rejected: 2, duplicated: 1, capacity: 650 }
];

export function formatMoney(amount: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function getRolePermissions(role: PlatformRole) {
  return rolePermissions[role] ?? [];
}

export function can(role: PlatformRole, permission: Permission) {
  return getRolePermissions(role).includes(permission);
}

export function getTotals(rows = salesRows) {
  return rows.reduce(
    (acc, row) => ({
      tickets: acc.tickets + row.tickets,
      gross: acc.gross + row.gross,
      serviceFees: acc.serviceFees + row.serviceFees,
      net: acc.net + row.net
    }),
    { tickets: 0, gross: 0, serviceFees: 0, net: 0 }
  );
}

export function getSalesByRrpp() {
  const map = new Map<string, { code: string; tickets: number; gross: number; serviceFees: number; net: number }>();
  salesRows.filter((row) => row.rrppCode).forEach((row) => {
    const current = map.get(row.rrppCode!) ?? { code: row.rrppCode!, tickets: 0, gross: 0, serviceFees: 0, net: 0 };
    current.tickets += row.tickets;
    current.gross += row.gross;
    current.serviceFees += row.serviceFees;
    current.net += row.net;
    map.set(row.rrppCode!, current);
  });
  return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
}

export function getPromoterByCode(code: string) {
  return promoterLinks.find((link) => link.code.toLowerCase() === code.toLowerCase());
}
