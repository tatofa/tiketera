-- Esquema base Supabase/PostgreSQL para producción.
-- El MVP corre en modo demo con localStorage, pero esta migración deja la base preparada.

create extension if not exists "uuid-ossp";

create type event_status as enum ('draft','published','unpublished','cancelled');
create type ticket_status as enum ('valid','used','cancelled','refunded');
create type order_status as enum ('pending','paid','failed','cancelled','refunded');
create type user_role as enum ('admin','organizer','validator','buyer');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'buyer',
  created_at timestamptz not null default now()
);

create table venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  city text,
  country text default 'AR',
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default uuid_generate_v4(),
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

create table event_dates (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  status text not null default 'active'
);

create table sectors (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  capacity integer not null
);

create table ticket_types (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  sector_id uuid not null references sectors(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null,
  currency text not null default 'ARS',
  sale_start timestamptz not null,
  sale_end timestamptz not null,
  max_per_order integer not null default 6,
  status text not null default 'active'
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  buyer_name text not null,
  buyer_email text not null,
  status order_status not null default 'pending',
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id),
  event_date_id uuid not null references event_dates(id),
  ticket_type_id uuid not null references ticket_types(id),
  quantity integer not null,
  unit_price numeric(12,2) not null
);

create table tickets (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id),
  event_date_id uuid not null references event_dates(id),
  ticket_type_id uuid not null references ticket_types(id),
  sector_id uuid not null references sectors(id),
  qr_token text not null unique,
  status ticket_status not null default 'valid',
  holder_name text not null,
  holder_email text not null,
  used_at timestamptz,
  used_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table promocodes (
  id uuid primary key default uuid_generate_v4(),
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

create table refunds (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table checkins (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references tickets(id),
  validator_id uuid references profiles(id),
  result text not null,
  message text,
  created_at timestamptz not null default now()
);

-- Validación atómica recomendada en producción:
create or replace function mark_ticket_used(token text, validator uuid)
returns table(ok boolean, message text, ticket_id uuid)
language plpgsql
security definer
as $$
declare found_ticket tickets%rowtype;
begin
  select * into found_ticket from tickets where qr_token = token for update;
  if not found then
    return query select false, 'Entrada inexistente', null::uuid;
    return;
  end if;
  if found_ticket.status <> 'valid' then
    return query select false, 'Entrada no válida o ya utilizada', found_ticket.id;
    return;
  end if;
  update tickets set status='used', used_at=now(), used_by=validator where id=found_ticket.id;
  insert into checkins(ticket_id, validator_id, result, message) values(found_ticket.id, validator, 'ok', 'Entrada validada');
  return query select true, 'Entrada validada correctamente', found_ticket.id;
end;
$$;
