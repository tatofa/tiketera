-- Ticketera - roles acumulables y con alcance
-- Modelo: todo usuario arranca como comprador. Luego se le suman roles operativos.
-- super_admin/admin siguen siendo roles manuales y no se generan desde la web.

create table if not exists user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role user_role not null,
  producer_id uuid references producers(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  active boolean not null default true,
  assigned_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique(profile_id, role, producer_id, event_id)
);

create index if not exists idx_user_role_assignments_profile on user_role_assignments(profile_id);
create index if not exists idx_user_role_assignments_role on user_role_assignments(role);
create index if not exists idx_user_role_assignments_producer on user_role_assignments(producer_id);
create index if not exists idx_user_role_assignments_event on user_role_assignments(event_id);

alter table user_role_assignments enable row level security;

create or replace function public.has_role(target_role user_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and active = true
      and role = target_role
  ) or exists(
    select 1 from user_role_assignments
    where profile_id = auth.uid()
      and role = target_role
      and active = true
  );
$$;

create or replace function public.has_producer_role(target_producer uuid, target_role user_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and active = true
      and role in ('super_admin','admin')
  ) or exists(
    select 1 from user_role_assignments
    where profile_id = auth.uid()
      and role = target_role
      and active = true
      and (producer_id = target_producer or producer_id is null)
  ) or exists(
    select 1 from producer_members
    where profile_id = auth.uid()
      and producer_id = target_producer
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('super_admin','admin') and active = true)
    or exists(select 1 from user_role_assignments where profile_id = auth.uid() and role in ('super_admin','admin') and active = true);
$$;

create or replace function public.is_event_producer(target_event uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1
    from events e
    left join producer_members pm on pm.producer_id = e.producer_id and pm.profile_id = auth.uid()
    left join user_role_assignments ura on ura.producer_id = e.producer_id and ura.profile_id = auth.uid() and ura.role = 'producer' and ura.active = true
    where e.id = target_event
      and (pm.id is not null or ura.id is not null or public.is_admin())
  );
$$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_role_assignments' and policyname='user_roles_select_own_or_admin') then
    create policy user_roles_select_own_or_admin on user_role_assignments for select using (profile_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_role_assignments' and policyname='user_roles_admin_all') then
    create policy user_roles_admin_all on user_role_assignments for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- Backfill: asegura rol comprador para todos los perfiles existentes.
insert into user_role_assignments(profile_id, role, active)
select id, 'buyer', true from profiles
on conflict do nothing;

-- Backfill: replica perfiles existentes con rol operativo como asignación acumulable.
insert into user_role_assignments(profile_id, role, active)
select id, role, true from profiles
where role <> 'buyer'
on conflict do nothing;
