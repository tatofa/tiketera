-- Ticketera - esquema productivo inicial para Supabase/PostgreSQL
-- Pegar y ejecutar en Supabase SQL Editor, o correr con Supabase CLI.
-- Incluye: roles, productores, RRPP, links de venta, cargos de servicio, eventos,
-- órdenes, tickets, QR/token, acreditación, reportes base y RLS.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Tipos base
do $$ begin
  create type event_status as enum ('draft','published','unpublished','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('valid','used','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending','paid','failed','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('super_admin','admin','producer','rrpp','accreditor','buyer');
exception when duplicate_object then null; end $$;

alter type user_role add value if not exists 'super_admin';
alter type user_role add value if not exists 'admin';
alter type user_role add value if not exists 'producer';
alter type user_role add value if not exists 'rrpp';
alter type user_role add value if not exists 'accreditor';
alter type user_role add value if not exists 'buyer';

-- Usuarios / perfiles conectados a auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'buyer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists producers (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id),
  name text not null,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active','paused','blocked')),
  created_at timestamptz not null default now()
);

create table if not exists producer_members (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references producers(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'manager',
  created_at timestamptz not null default now(),
  unique(producer_id, profile_id)
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  country text default 'AR',
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references producers(id),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  venue_id uuid references venues(id),
  status event_status not null default 'draft',
  capacity integer not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_dates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  status text not null default 'active' check (status in ('active','cancelled','sold_out'))
);

create table if not exists sectors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  capacity integer not null check (capacity >= 0)
);

create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  sector_id uuid not null references sectors(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'ARS',
  sale_start timestamptz not null,
  sale_end timestamptz not null,
  max_per_order integer not null default 6,
  status text not null default 'active' check (status in ('active','paused','sold_out'))
);

-- Cargos de servicio configurables desde admin general
create table if not exists service_fee_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'web' check (channel in ('web','rrpp','door','box_office')),
  buyer_pays_fee boolean not null default true,
  percentage numeric(6,3) not null default 0,
  fixed_amount numeric(12,2) not null default 0,
  min_fee numeric(12,2) not null default 0,
  max_fee numeric(12,2),
  currency text not null default 'ARS',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RRPP / promotores y links propios
create table if not exists promoter_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  producer_id uuid references producers(id),
  event_id uuid references events(id) on delete cascade,
  code text not null unique,
  name text not null,
  commission_type text not null default 'percent' check (commission_type in ('percent','fixed')),
  commission_value numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','converted')),
  created_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  event_id uuid not null references events(id),
  event_date_id uuid not null references event_dates(id),
  ticket_type_id uuid not null references ticket_types(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  producer_id uuid references producers(id),
  promoter_link_id uuid references promoter_links(id),
  buyer_name text not null,
  buyer_email text not null,
  status order_status not null default 'pending',
  subtotal_amount numeric(12,2) not null default 0,
  service_fee_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  channel text not null default 'web' check (channel in ('web','rrpp','door','box_office')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id),
  event_date_id uuid not null references event_dates(id),
  ticket_type_id uuid not null references ticket_types(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  service_fee_unit numeric(12,2) not null default 0
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id),
  event_date_id uuid not null references event_dates(id),
  ticket_type_id uuid not null references ticket_types(id),
  sector_id uuid not null references sectors(id),
  qr_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  short_token text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  status ticket_status not null default 'valid',
  holder_name text not null,
  holder_email text not null,
  used_at timestamptz,
  used_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists promocodes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true
);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id),
  event_id uuid references events(id),
  validator_id uuid references profiles(id),
  token_input text,
  result text not null check (result in ('ok','not_found','already_used','invalid_status','wrong_event')),
  message text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_events_status on events(status);
create index if not exists idx_events_producer on events(producer_id);
create index if not exists idx_ticket_types_event on ticket_types(event_id);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_promoter on orders(promoter_link_id);
create index if not exists idx_tickets_qr_token on tickets(qr_token);
create index if not exists idx_tickets_short_token on tickets(short_token);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_checkins_event on checkins(event_id);

-- Helpers de seguridad
create or replace function public.current_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('super_admin','admin') and active = true);
$$;

create or replace function public.is_event_producer(target_event uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1
    from events e
    join producer_members pm on pm.producer_id = e.producer_id
    where e.id = target_event and pm.profile_id = auth.uid()
  );
$$;

-- Validación atómica por QR o token breve
create or replace function public.validate_ticket(token text, validator uuid default auth.uid())
returns table(ok boolean, result text, message text, ticket_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare found_ticket tickets%rowtype;
begin
  select * into found_ticket
  from tickets
  where qr_token = token or short_token = upper(token)
  for update;

  if not found then
    insert into checkins(token_input, validator_id, result, message)
    values(token, validator, 'not_found', 'Entrada inexistente');
    return query select false, 'not_found', 'Entrada inexistente', null::uuid;
    return;
  end if;

  if found_ticket.status = 'used' then
    insert into checkins(ticket_id, event_id, token_input, validator_id, result, message)
    values(found_ticket.id, found_ticket.event_id, token, validator, 'already_used', 'Entrada ya utilizada');
    return query select false, 'already_used', 'Entrada ya utilizada', found_ticket.id;
    return;
  end if;

  if found_ticket.status <> 'valid' then
    insert into checkins(ticket_id, event_id, token_input, validator_id, result, message)
    values(found_ticket.id, found_ticket.event_id, token, validator, 'invalid_status', 'Entrada no válida');
    return query select false, 'invalid_status', 'Entrada no válida', found_ticket.id;
    return;
  end if;

  update tickets set status='used', used_at=now(), used_by=validator where id=found_ticket.id;
  insert into checkins(ticket_id, event_id, token_input, validator_id, result, message)
  values(found_ticket.id, found_ticket.event_id, token, validator, 'ok', 'Entrada validada correctamente');
  return query select true, 'ok', 'Entrada validada correctamente', found_ticket.id;
end;
$$;

-- Reporte base de ventas
create or replace view sales_report as
select
  o.id as order_id,
  o.created_at,
  o.status,
  o.channel,
  e.id as event_id,
  e.name as event_name,
  p.id as producer_id,
  p.name as producer_name,
  pl.code as rrpp_code,
  pl.name as rrpp_name,
  oi.quantity,
  oi.unit_price,
  o.subtotal_amount,
  o.service_fee_amount,
  o.discount_amount,
  o.total_amount,
  o.currency
from orders o
left join order_items oi on oi.order_id = o.id
left join events e on e.id = oi.event_id
left join producers p on p.id = o.producer_id
left join promoter_links pl on pl.id = o.promoter_link_id;

-- RLS
alter table profiles enable row level security;
alter table producers enable row level security;
alter table producer_members enable row level security;
alter table venues enable row level security;
alter table events enable row level security;
alter table event_dates enable row level security;
alter table sectors enable row level security;
alter table ticket_types enable row level security;
alter table service_fee_rules enable row level security;
alter table promoter_links enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tickets enable row level security;
alter table checkins enable row level security;
alter table refunds enable row level security;
alter table promocodes enable row level security;
alter table audit_logs enable row level security;

-- Policies básicas: se crean solo si no existen.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own_or_admin') then
    create policy profiles_select_own_or_admin on profiles for select using (id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_own') then
    create policy profiles_update_own on profiles for update using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_public_published') then
    create policy events_public_published on events for select using (status = 'published' or public.is_admin() or public.is_event_producer(id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_admin_all') then
    create policy events_admin_all on events for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_owner_or_admin') then
    create policy orders_owner_or_admin on orders for select using (user_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tickets' and policyname='tickets_owner_admin_validator') then
    create policy tickets_owner_admin_validator on tickets for select using (
      public.is_admin()
      or exists(select 1 from orders o where o.id = tickets.order_id and o.user_id = auth.uid())
      or exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'accreditor')
    );
  end if;
end $$;

-- Permisos para lectura pública de catálogo publicado.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_dates' and policyname='event_dates_public') then
    create policy event_dates_public on event_dates for select using (exists(select 1 from events e where e.id = event_dates.event_id and e.status='published') or public.is_admin() or public.is_event_producer(event_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sectors' and policyname='sectors_public') then
    create policy sectors_public on sectors for select using (exists(select 1 from events e where e.id = sectors.event_id and e.status='published') or public.is_admin() or public.is_event_producer(event_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ticket_types' and policyname='ticket_types_public') then
    create policy ticket_types_public on ticket_types for select using (exists(select 1 from events e where e.id = ticket_types.event_id and e.status='published') or public.is_admin() or public.is_event_producer(event_id));
  end if;
end $$;

-- Seeds mínimos de configuración
insert into service_fee_rules (name, channel, buyer_pays_fee, percentage, fixed_amount, min_fee, max_fee, currency)
values
  ('General online', 'web', true, 12, 450, 700, 6500, 'ARS'),
  ('Venta RRPP', 'rrpp', true, 10, 350, 600, 6000, 'ARS'),
  ('Puerta', 'door', false, 0, 0, 0, null, 'ARS')
on conflict do nothing;

-- NOTA SOBRE USUARIOS:
-- Los usuarios reales se crean desde Supabase Auth. Luego se inserta/actualiza su profile
-- con el mismo UUID de auth.users y el rol correspondiente.
