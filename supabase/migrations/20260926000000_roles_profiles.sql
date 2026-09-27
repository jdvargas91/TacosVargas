-- Phase 1: profiles, roles, team invites, counter orders

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'cliente'
    check (role in ('cliente', 'vendedor', 'admin')),
  display_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('vendedor', 'admin')),
  invited_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists team_invites_pending_email_idx
  on public.team_invites (lower(email))
  where status = 'pending';

-- Migrate existing staff → admin profiles
insert into public.profiles (user_id, role, email, display_name)
select
  s.user_id,
  'admin',
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.email)
from public.staff s
join auth.users u on u.id = s.user_id
on conflict (user_id) do update
set
  role = 'admin',
  email = excluded.email,
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  updated_at = now();

-- Role helpers (private schema)
create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function private.has_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = any (allowed)
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_role(array['admin', 'vendedor']);
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_role(array['admin']);
$$;

-- Claim pending invite for current user (also used after login)
create or replace function public.claim_team_invite()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  invite public.team_invites%rowtype;
  profile public.profiles%rowtype;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  select lower(email) into user_email from auth.users where id = uid;
  if user_email is null then
    raise exception 'Usuario sin email';
  end if;

  select * into invite
  from public.team_invites
  where status = 'pending'
    and lower(email) = user_email
  order by created_at desc
  limit 1
  for update;

  insert into public.profiles (user_id, role, email, display_name)
  values (
    uid,
    coalesce(invite.role, 'cliente'),
    user_email,
    coalesce(
      (select raw_user_meta_data->>'full_name' from auth.users where id = uid),
      user_email
    )
  )
  on conflict (user_id) do update
  set
    role = case
      when invite.id is not null then invite.role
      else public.profiles.role
    end,
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now()
  returning * into profile;

  if invite.id is not null then
    update public.team_invites
    set status = 'accepted', accepted_at = now()
    where id = invite.id;
  end if;

  return profile;
end;
$$;

revoke all on function public.claim_team_invite() from public;
grant execute on function public.claim_team_invite() to authenticated;

-- Auto-create profile on signup
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.team_invites%rowtype;
  assigned text := 'cliente';
begin
  select * into invite
  from public.team_invites
  where status = 'pending'
    and lower(email) = lower(new.email)
  order by created_at desc
  limit 1;

  if invite.id is not null then
    assigned := invite.role;
    update public.team_invites
    set status = 'accepted', accepted_at = now()
    where id = invite.id;
  end if;

  insert into public.profiles (user_id, role, email, display_name)
  values (
    new.id,
    assigned,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Ensure profiles for existing auth users without profile
insert into public.profiles (user_id, role, email, display_name)
select
  u.id,
  case when exists (select 1 from public.staff s where s.user_id = u.id) then 'admin' else 'cliente' end,
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
on conflict (user_id) do nothing;

-- Orders: counter support
alter table public.orders
  alter column user_id drop not null;

alter table public.orders
  add column if not exists source text not null default 'web'
    check (source in ('web', 'mostrador'));

alter table public.orders
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- RLS: profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
  on public.profiles for select to authenticated
  using (user_id = auth.uid() or private.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = (select role from public.profiles where user_id = auth.uid()));

drop policy if exists "admin_update_profiles" on public.profiles;
create policy "admin_update_profiles"
  on public.profiles for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- RLS: team_invites
alter table public.team_invites enable row level security;

drop policy if exists "admin_all_team_invites" on public.team_invites;
create policy "admin_select_team_invites"
  on public.team_invites for select to authenticated
  using (private.is_admin());

create policy "admin_insert_team_invites"
  on public.team_invites for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_team_invites"
  on public.team_invites for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_team_invites"
  on public.team_invites for delete to authenticated
  using (private.is_admin());

-- Replace staff-based product policies with admin-only write
drop policy if exists "staff_insert_products" on public.products;
drop policy if exists "staff_update_products" on public.products;
drop policy if exists "staff_delete_products" on public.products;

create policy "admin_insert_products"
  on public.products for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_products"
  on public.products for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_products"
  on public.products for delete to authenticated
  using (private.is_admin());

-- Orders policies: staff via profiles
drop policy if exists "users_insert_own_orders" on public.orders;
drop policy if exists "users_select_own_orders" on public.orders;
drop policy if exists "staff_select_all_orders" on public.orders;
drop policy if exists "staff_update_orders" on public.orders;

create policy "users_insert_own_orders"
  on public.orders for insert to authenticated
  with check (auth.uid() = user_id and coalesce(source, 'web') = 'web');

create policy "users_select_own_orders"
  on public.orders for select to authenticated
  using (auth.uid() = user_id or private.is_staff());

create policy "staff_update_orders"
  on public.orders for update to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- Storage: admin-only product images write
drop policy if exists "staff_upload_product_images" on storage.objects;
drop policy if exists "staff_update_product_images" on storage.objects;

create policy "admin_upload_product_images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and private.is_admin());

create policy "admin_update_product_images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and private.is_admin())
  with check (bucket_id = 'product-images' and private.is_admin());

create policy "admin_delete_product_images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and private.is_admin());

-- Update place_order to set source=web
create or replace function private.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_notes text,
  p_fulfillment text default 'pickup'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  line jsonb;
  qty integer;
  prod public.products%rowtype;
  built_items jsonb := '[]'::jsonb;
  total integer := 0;
  new_stock integer;
  new_id uuid;
  fulfillment text;
  address jsonb;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión para pedir';
  end if;

  if p_phone is null or length(trim(p_phone)) < 8 then
    raise exception 'El teléfono es obligatorio';
  end if;

  fulfillment := coalesce(nullif(trim(p_fulfillment), ''), 'pickup');
  if fulfillment not in ('pickup', 'delivery') then
    raise exception 'Elige recoger o mensajería';
  end if;

  if fulfillment = 'delivery' then
    if p_delivery_address is null
       or coalesce(p_delivery_address->>'street', '') = ''
       or coalesce(p_delivery_address->>'city', '') = '' then
      raise exception 'La dirección es obligatoria para mensajería';
    end if;
    address := p_delivery_address || jsonb_build_object('mode', 'delivery');
  else
    address := jsonb_build_object('mode', 'pickup');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  for line in select * from jsonb_array_elements(p_items)
  loop
    qty := coalesce((line->>'qty')::integer, 0);
    if qty < 1 then
      continue;
    end if;

    select * into prod
    from public.products
    where id = (line->>'id')::uuid
    for update;

    if not found then
      raise exception 'Un producto del pedido ya no existe';
    end if;

    if prod.sold_out or prod.stock < qty then
      raise exception '% no tiene suficientes porciones', prod.name;
    end if;

    new_stock := prod.stock - qty;
    update public.products
    set
      stock = new_stock,
      sold_out = case when new_stock = 0 then true else sold_out end,
      updated_at = now()
    where id = prod.id;

    total := total + (prod.price_cents * qty);
    built_items := built_items || jsonb_build_array(
      jsonb_build_object(
        'id', prod.id,
        'name', prod.name,
        'kind', prod.kind,
        'qty', qty,
        'unitPrice', prod.price_cents
      )
    );
  end loop;

  if total <= 0 or jsonb_array_length(built_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  insert into public.orders (
    user_id, customer_name, phone, delivery_address, fulfillment, items, notes,
    total_cents, payment_method, status, source, created_by
  )
  values (
    uid,
    coalesce(nullif(trim(p_customer_name), ''), (select raw_user_meta_data->>'full_name' from auth.users where id = uid)),
    trim(p_phone),
    address,
    fulfillment,
    built_items,
    nullif(trim(p_notes), ''),
    total,
    'presencial',
    'recibido',
    'web',
    null
  )
  returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'total_cents', total,
    'items', built_items
  );
end;
$$;

-- Counter order RPC (staff only)
create or replace function private.place_counter_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_notes text,
  p_fulfillment text default 'pickup'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  line jsonb;
  qty integer;
  prod public.products%rowtype;
  built_items jsonb := '[]'::jsonb;
  total integer := 0;
  new_stock integer;
  new_id uuid;
  fulfillment text;
  address jsonb;
begin
  uid := auth.uid();
  if uid is null or not private.is_staff() then
    raise exception 'Solo el equipo puede registrar pedidos de mostrador';
  end if;

  if p_phone is null or length(trim(p_phone)) < 8 then
    raise exception 'El teléfono es obligatorio';
  end if;

  fulfillment := coalesce(nullif(trim(p_fulfillment), ''), 'pickup');
  if fulfillment not in ('pickup', 'delivery') then
    raise exception 'Elige recoger o mensajería';
  end if;

  if fulfillment = 'delivery' then
    if p_delivery_address is null
       or coalesce(p_delivery_address->>'street', '') = ''
       or coalesce(p_delivery_address->>'city', '') = '' then
      raise exception 'La dirección es obligatoria para mensajería';
    end if;
    address := p_delivery_address || jsonb_build_object('mode', 'delivery');
  else
    address := jsonb_build_object('mode', 'pickup');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  for line in select * from jsonb_array_elements(p_items)
  loop
    qty := coalesce((line->>'qty')::integer, 0);
    if qty < 1 then
      continue;
    end if;

    select * into prod
    from public.products
    where id = (line->>'id')::uuid
    for update;

    if not found then
      raise exception 'Un producto del pedido ya no existe';
    end if;

    if prod.sold_out or prod.stock < qty then
      raise exception '% no tiene suficientes porciones', prod.name;
    end if;

    new_stock := prod.stock - qty;
    update public.products
    set
      stock = new_stock,
      sold_out = case when new_stock = 0 then true else sold_out end,
      updated_at = now()
    where id = prod.id;

    total := total + (prod.price_cents * qty);
    built_items := built_items || jsonb_build_array(
      jsonb_build_object(
        'id', prod.id,
        'name', prod.name,
        'kind', prod.kind,
        'qty', qty,
        'unitPrice', prod.price_cents
      )
    );
  end loop;

  if total <= 0 or jsonb_array_length(built_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  insert into public.orders (
    user_id, customer_name, phone, delivery_address, fulfillment, items, notes,
    total_cents, payment_method, status, source, created_by
  )
  values (
    null,
    coalesce(nullif(trim(p_customer_name), ''), 'Mostrador'),
    trim(p_phone),
    address,
    fulfillment,
    built_items,
    nullif(trim(p_notes), ''),
    total,
    'presencial',
    'recibido',
    'mostrador',
    uid
  )
  returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'total_cents', total,
    'items', built_items
  );
end;
$$;

create or replace function public.place_counter_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_notes text,
  p_fulfillment text default 'pickup'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  return private.place_counter_order(
    p_customer_name, p_phone, p_delivery_address, p_items, p_notes, p_fulfillment
  );
end;
$$;

revoke all on function public.place_counter_order(text, text, jsonb, jsonb, text, text) from public;
grant execute on function public.place_counter_order(text, text, jsonb, jsonb, text, text) to authenticated;

-- Drop staff table (roles live in profiles)
drop policy if exists "staff_read_self" on public.staff;
drop table if exists public.staff;
