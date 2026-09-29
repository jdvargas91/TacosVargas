-- ===== supabase\migrations\20260909000000_init.sql =====
-- Tacos Vargas schema: staff, products, orders, storage, place_order RPC

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('taco', 'drink')),
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  sold_out boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text,
  phone text not null,
  delivery_address jsonb not null,
  fulfillment text not null default 'pickup'
    check (fulfillment in ('pickup', 'delivery')),
  items jsonb not null,
  notes text,
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null default 'presencial' check (payment_method = 'presencial'),
  status text not null default 'recibido'
    check (status in ('recibido', 'en_preparacion', 'en_camino', 'entregado', 'cancelado')),
  created_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index products_sort_idx on public.products (sort_order);

alter table public.staff enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

create policy "staff_read_self"
  on public.staff
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "products_public_read"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "staff_insert_products"
  on public.products
  for insert
  to authenticated
  with check (exists (select 1 from public.staff s where s.user_id = auth.uid()));

create policy "staff_update_products"
  on public.products
  for update
  to authenticated
  using (exists (select 1 from public.staff s where s.user_id = auth.uid()))
  with check (exists (select 1 from public.staff s where s.user_id = auth.uid()));

create policy "staff_delete_products"
  on public.products
  for delete
  to authenticated
  using (exists (select 1 from public.staff s where s.user_id = auth.uid()));

create policy "users_insert_own_orders"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users_select_own_orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "staff_select_all_orders"
  on public.orders
  for select
  to authenticated
  using (exists (select 1 from public.staff s where s.user_id = auth.uid()));

create policy "staff_update_orders"
  on public.orders
  for update
  to authenticated
  using (exists (select 1 from public.staff s where s.user_id = auth.uid()))
  with check (exists (select 1 from public.staff s where s.user_id = auth.uid()));

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
    user_id, customer_name, phone, delivery_address, fulfillment, items, notes, total_cents, payment_method, status
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
    'recibido'
  )
  returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'total_cents', total,
    'items', built_items
  );
end;
$$;

create or replace function public.place_order(
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
  return private.place_order(p_customer_name, p_phone, p_delivery_address, p_items, p_notes, p_fulfillment);
end;
$$;

revoke all on function public.place_order(text, text, jsonb, jsonb, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, jsonb, text, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

create policy "staff_upload_product_images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.staff s where s.user_id = auth.uid())
  );

create policy "staff_update_product_images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.staff s where s.user_id = auth.uid())
  )
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.staff s where s.user_id = auth.uid())
  );

insert into public.products (
  id, kind, name, description, price_cents, image_url, stock, sold_out, is_featured, sort_order
) values
  (
    'a1a1a1a1-0001-4000-8000-000000000001',
    'taco',
    'Camarón capeado',
    'Especialidad de la casa. Camarón capeado crujiente sobre tortilla caliente, con salsa y limón.',
    2600,
    '/products/camaron.jpg',
    50,
    false,
    true,
    1
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000002',
    'taco',
    'Pescado empanizado',
    'Filete empanizado, crujiente por fuera, con salsa y un toque de limón.',
    2600,
    '/products/pescado.jpg',
    50,
    false,
    false,
    2
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000003',
    'taco',
    'Bistec de arrachera',
    'Arrachera a la plancha, jugosa, con cilantro y cebolla.',
    2600,
    '/products/bistec.jpg',
    50,
    false,
    false,
    3
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000004',
    'taco',
    'Adobada de cerdo',
    'Cerdo adobado, marinada roja y el picor que pide una agua fresca.',
    2200,
    '/products/adobada.jpg',
    50,
    false,
    false,
    4
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000005',
    'taco',
    'Barbacoa',
    'Barbacoa suave, para desayunar con salsa y un limón aplastado.',
    2200,
    '/products/barbacoa.jpg',
    50,
    false,
    false,
    5
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000006',
    'taco',
    'Chicharrón prensado',
    'Chicharrón prensado, de los que se piden sin pensarlo dos veces.',
    2200,
    '/products/chicharron.jpg',
    50,
    false,
    false,
    6
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000007',
    'taco',
    'Carnitas de puerco',
    'Carnitas doradas, con su grasa justa y salsa verde o roja.',
    2200,
    '/products/carnitas.jpg',
    50,
    false,
    false,
    7
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000008',
    'taco',
    'Huevo a la mexicana',
    'Huevo con jitomate, cebolla y chile. El taco de mañana por excelencia.',
    2200,
    '/products/huevo.jpg',
    50,
    false,
    false,
    8
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000010',
    'drink',
    'Agua fresca chica',
    'Jamaica, limón o piña. Escribe el sabor en las notas del pedido.',
    2200,
    '/products/agua-chica.jpg',
    50,
    false,
    false,
    10
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000011',
    'drink',
    'Agua fresca grande',
    'La misma jarra de jamaica, limón o piña, en tamaño grande.',
    3800,
    '/products/agua-grande.jpg',
    50,
    false,
    false,
    11
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000012',
    'drink',
    'Coca-Cola 500 ml',
    'Envase de vidrio. Helada, para cortar el picor.',
    2700,
    '/products/coca-500.jpg',
    50,
    false,
    false,
    12
  ),
  (
    'a1a1a1a1-0001-4000-8000-000000000013',
    'drink',
    'Coca-Cola 600 ml',
    'Envase desechable de 600 ml.',
    3300,
    '/products/coca-600.jpg',
    50,
    false,
    false,
    13
  )
on conflict (id) do nothing;


-- ===== supabase\migrations\20260910000000_fulfillment.sql =====
-- Recoger vs mensajería

alter table public.orders
  add column if not exists fulfillment text not null default 'pickup';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_fulfillment_check'
  ) then
    alter table public.orders
      add constraint orders_fulfillment_check
      check (fulfillment in ('pickup', 'delivery'));
  end if;
end $$;

drop function if exists public.place_order(text, text, jsonb, jsonb, text);
drop function if exists private.place_order(text, text, jsonb, jsonb, text);

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
    user_id, customer_name, phone, delivery_address, fulfillment, items, notes, total_cents, payment_method, status
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
    'recibido'
  )
  returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'total_cents', total,
    'items', built_items
  );
end;
$$;

create or replace function public.place_order(
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
  return private.place_order(p_customer_name, p_phone, p_delivery_address, p_items, p_notes, p_fulfillment);
end;
$$;

revoke all on function public.place_order(text, text, jsonb, jsonb, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, jsonb, text, text) to authenticated;


-- ===== supabase\migrations\20260926000000_roles_profiles.sql =====
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

-- Counter order RPC (staff only) — venta directa entregada
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
begin
  uid := auth.uid();
  if uid is null or not private.is_staff() then
    raise exception 'Solo el equipo puede registrar ventas de mostrador';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
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
      and coalesce(archived, false) = false
    for update;

    if not found then
      raise exception 'Un producto de la venta ya no existe';
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
    raise exception 'La venta no tiene productos';
  end if;

  insert into public.orders (
    user_id, customer_name, phone, delivery_address, fulfillment, items, notes,
    total_cents, payment_method, status, source, created_by
  )
  values (
    null,
    'Mostrador',
    '—',
    jsonb_build_object('mode', 'pickup'),
    'pickup',
    built_items,
    null,
    total,
    'presencial',
    'entregado',
    'mostrador',
    uid
  )
  returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'total_cents', total,
    'items', built_items,
    'status', 'entregado',
    'source', 'mostrador'
  );
end;
$$;

create or replace function public.place_counter_sale(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  return private.place_counter_order(
    'Mostrador',
    '—',
    jsonb_build_object('mode', 'pickup'),
    p_items,
    null,
    'pickup'
  );
end;
$$;

revoke all on function public.place_counter_sale(jsonb) from public;
grant execute on function public.place_counter_sale(jsonb) to authenticated;

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


-- ===== supabase\migrations\20260926000001_site_cms.sql =====
-- Phase 2: CMS site settings, sections, site-media bucket

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.site_sections (
  id text primary key,
  kind text not null
    check (kind in ('hero', 'about', 'gallery', 'kitchen', 'footer_note')),
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "admin_write_site_settings" on public.site_settings;
create policy "admin_insert_site_settings"
  on public.site_settings for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_site_settings"
  on public.site_settings for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_site_settings"
  on public.site_settings for delete to authenticated
  using (private.is_admin());

drop policy if exists "site_sections_public_read" on public.site_sections;
create policy "site_sections_public_read"
  on public.site_sections for select to anon, authenticated
  using (is_published = true or private.is_admin());

create policy "admin_insert_site_sections"
  on public.site_sections for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_site_sections"
  on public.site_sections for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_site_sections"
  on public.site_sections for delete to authenticated
  using (private.is_admin());

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "site_media_public_read" on storage.objects;
create policy "site_media_public_read"
  on storage.objects for select to public
  using (bucket_id = 'site-media');

create policy "admin_upload_site_media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and private.is_admin());

create policy "admin_update_site_media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and private.is_admin())
  with check (bucket_id = 'site-media' and private.is_admin());

create policy "admin_delete_site_media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and private.is_admin());

-- Seed business settings from current static defaults
insert into public.site_settings (key, value) values
  ('business', '{
    "name": "Vargas Tacos",
    "legalName": "Tacos Vargas",
    "slogan": "Un rico sabor para un excelente día",
    "phone": "3141606339",
    "whatsapp": "5213141606339",
    "hours": {
      "label": "7:30 a.m. a 1:30 p.m.",
      "days": "Lunes a sábado",
      "opens": "07:30",
      "closes": "13:30",
      "weekdays": [1, 2, 3, 4, 5, 6]
    },
    "location": {
      "city": "Colima",
      "region": "Colima",
      "country": "México",
      "addressConfirmed": false,
      "street": "",
      "label": "3PQC+632, Manzanillo, Colima, México",
      "lat": 19.2433,
      "lng": -103.725
    },
    "payment": "Pago presencial al recoger o al entregar el pedido.",
    "socials": {
      "facebook": "https://www.facebook.com/",
      "instagram": "https://www.instagram.com/",
      "tiktok": "https://www.tiktok.com/"
    }
  }'::jsonb)
on conflict (key) do nothing;

insert into public.site_sections (id, kind, content, sort_order) values
  ('hero', 'hero', '{
    "headline": "Vargas Tacos",
    "imageDesktop": "/hero.webp",
    "imageMobile": "/hero_cel.webp",
    "imageAlt": "Tacos recién hechos sobre plancha, vapor y limón"
  }'::jsonb, 1),
  ('about', 'about', '{
    "headline": "Cómo nació Vargas Tacos",
    "paragraphs": [
      "Vargas nace en las mañanas de Colima: una plancha, tortillas que echan humo y el ritmo de un mostrador de barrio, no de restaurante con mesas. Abrimos temprano, cerramos a la 1:30 p.m. y nos quedamos en lo que sabemos hacer.",
      "La especialidad de la casa es el camarón capeado. Junto a él, arrachera, adobada, barbacoa y aguas frescas que se piden por el nombre. El menú impreso es la verdad del local.",
      "No somos un comedor de reserva. Eres vecino, de paso o con antojo. Encargas, pasas o te lo llevamos, y pagas en persona."
    ],
    "values": [
      {"title": "Sabor de plancha", "body": "Camarón capeado, pescado, arrachera y los clásicos de cerdo. Cada taco se arma al momento."},
      {"title": "Horario de mañana", "body": "De 7:30 a.m. a 1:30 p.m., lunes a sábado. El antojo es de desayuno y comida, no de madrugada."},
      {"title": "Trato de barrio", "body": "Pedidos por WhatsApp, pago presencial y seguimiento claro. Sin filas digitales ni cobros en línea."}
    ],
    "image": "/about.jpg"
  }'::jsonb, 2),
  ('kitchen', 'kitchen', '{
    "headline": "Manos en la plancha",
    "lede": "Tres elaboradoras, tres estaciones. El mismo vapor de las 7:30 y el taco que sale todavía caliente.",
    "people": [
      {"name": "Marisol Cuevas", "role": "Elaboradora de mariscos", "station": "Camarón capeado y pescado empanizado. La especialidad de la casa sale de su estación.", "image": "/products/camaron.jpg", "imageAlt": "Taco de camarón capeado, estación de mariscos"},
      {"name": "Itzel Navarro", "role": "Elaboradora de carnes", "station": "Arrachera, barbacoa, adobada y carnitas. El taco que se pide con hambre de verdad.", "image": "/gallery/plancha.jpg", "imageAlt": "Plancha con tacos de carne"},
      {"name": "Paola Mendoza", "role": "Elaboradora de la mañana", "station": "Huevo a la mexicana y chicharrón prensado. El primer taco del día.", "image": "/products/huevo.jpg", "imageAlt": "Taco de huevo a la mexicana, estación de mañana"}
    ]
  }'::jsonb, 3),
  ('gallery', 'gallery', '{
    "headline": "El primer bocado",
    "bandImage": "/about.jpg",
    "shots": [
      {"src": "/gallery/plancha.jpg", "alt": "Tacos en la plancha, fotografía de referencia", "className": "md:col-start-1 md:row-start-1 md:row-span-2"},
      {"src": "/products/camaron.jpg", "alt": "Taco de camarón capeado", "className": "md:col-start-2 md:col-span-2 md:row-start-1"},
      {"src": "/products/barbacoa.jpg", "alt": "Taco de barbacoa", "className": "md:col-start-2 md:row-start-2"},
      {"src": "/products/bistec.jpg", "alt": "Taco de bistec de arrachera", "className": "md:col-start-3 md:row-start-2"},
      {"src": "/products/adobada.jpg", "alt": "Taco de adobada de cerdo", "className": "md:col-start-1 md:row-start-3"},
      {"src": "/about.jpg", "alt": "Tacos al vapor, fotografía de referencia", "className": "md:col-start-2 md:col-span-2 md:row-start-3"}
    ]
  }'::jsonb, 4)
on conflict (id) do nothing;


-- ===== supabase\migrations\20260926000002_catalog_stock_reviews.sql =====
-- Phase 3: product details, stock adjustments, reviews

alter table public.products
  add column if not exists long_description text not null default '',
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists allergens text[] not null default '{}',
  add column if not exists weight_grams integer,
  add column if not exists serving text,
  add column if not exists archived boolean not null default false;

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  delta integer not null,
  reason text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_adjustments_product_idx
  on public.stock_adjustments (product_id, created_at desc);

alter table public.stock_adjustments enable row level security;

create policy "admin_select_stock_adjustments"
  on public.stock_adjustments for select to authenticated
  using (private.is_admin());

create policy "admin_insert_stock_adjustments"
  on public.stock_adjustments for insert to authenticated
  with check (private.is_admin());

-- Adjust stock RPC with audit trail
create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text default null,
  p_sold_out boolean default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products%rowtype;
  new_stock integer;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Solo el administrador puede ajustar el almacén';
  end if;

  select * into prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  new_stock := greatest(0, prod.stock + coalesce(p_delta, 0));

  update public.products
  set
    stock = new_stock,
    sold_out = coalesce(p_sold_out, case when new_stock = 0 then true else sold_out end),
    updated_at = now()
  where id = p_product_id
  returning * into prod;

  if coalesce(p_delta, 0) <> 0 then
    insert into public.stock_adjustments (product_id, delta, reason, user_id)
    values (p_product_id, p_delta, nullif(trim(p_reason), ''), auth.uid());
  end if;

  return prod;
end;
$$;

revoke all on function public.adjust_product_stock(uuid, integer, text, boolean) from public;
grant execute on function public.adjust_product_stock(uuid, integer, text, boolean) to authenticated;

-- Hide archived products from public (staff/admin still see via admin flag — public read filters archived)
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select to anon, authenticated
  using (archived = false or private.is_admin());

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  published_at date not null default current_date,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "reviews_public_read_visible"
  on public.reviews for select to anon, authenticated
  using (visible = true or private.is_admin());

create policy "admin_insert_reviews"
  on public.reviews for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_reviews"
  on public.reviews for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_reviews"
  on public.reviews for delete to authenticated
  using (private.is_admin());

insert into public.reviews (id, author, rating, text, published_at, visible) values
  (
    'b1b1b1b1-0001-4000-8000-000000000001',
    'Mariana G.',
    5,
    'El camarón capeado se pide solo. Llegué a las 8 y todavía había cola, pero vale la espera.',
    '2026-08-12',
    true
  ),
  (
    'b1b1b1b1-0001-4000-8000-000000000002',
    'Luis R.',
    5,
    'Barbacoa de desayuno y agua de jamaica. Horario de mañana, justo lo que buscaba.',
    '2026-07-28',
    true
  ),
  (
    'b1b1b1b1-0001-4000-8000-000000000003',
    'Carla P.',
    4,
    'Buen bistec y el trato es de barrio. Falta que confirmen la dirección exacta en el mapa, pero el taco está.',
    '2026-06-03',
    true
  )
on conflict (id) do nothing;

-- Backfill product details from seed-like data for known IDs
update public.products set
  long_description = coalesce(nullif(long_description, ''), description),
  serving = coalesce(serving, case when kind = 'taco' then '1 taco' else '1 pieza' end)
where long_description = '' or serving is null;


-- ===== supabase\migrations\20260927000000_fix_cms_encoding.sql =====
-- Fix mojibake in site CMS seeds (UTF-8 misread as Latin-1 when APPLY_ALL was generated)

update public.site_sections
set
  content = '{
    "headline": "Cómo nació Vargas Tacos",
    "paragraphs": [
      "Vargas nace en las mañanas de Colima: una plancha, tortillas que echan humo y el ritmo de un mostrador de barrio, no de restaurante con mesas. Abrimos temprano, cerramos a la 1:30 p.m. y nos quedamos en lo que sabemos hacer.",
      "La especialidad de la casa es el camarón capeado. Junto a él, arrachera, adobada, barbacoa y aguas frescas que se piden por el nombre. El menú impreso es la verdad del local.",
      "No somos un comedor de reserva. Eres vecino, de paso o con antojo. Encargas, pasas o te lo llevamos, y pagas en persona."
    ],
    "values": [
      {"title": "Sabor de plancha", "body": "Camarón capeado, pescado, arrachera y los clásicos de cerdo. Cada taco se arma al momento."},
      {"title": "Horario de mañana", "body": "De 7:30 a.m. a 1:30 p.m., lunes a sábado. El antojo es de desayuno y comida, no de madrugada."},
      {"title": "Trato de barrio", "body": "Pedidos por WhatsApp, pago presencial y seguimiento claro. Sin filas digitales ni cobros en línea."}
    ],
    "image": "/about.jpg"
  }'::jsonb,
  updated_at = now()
where id = 'about';

update public.site_sections
set
  content = '{
    "headline": "Manos en la plancha",
    "lede": "Tres elaboradoras, tres estaciones. El mismo vapor de las 7:30 y el taco que sale todavía caliente.",
    "people": [
      {"name": "Marisol Cuevas", "role": "Elaboradora de mariscos", "station": "Camarón capeado y pescado empanizado. La especialidad de la casa sale de su estación.", "image": "/products/camaron.jpg", "imageAlt": "Taco de camarón capeado, estación de mariscos"},
      {"name": "Itzel Navarro", "role": "Elaboradora de carnes", "station": "Arrachera, barbacoa, adobada y carnitas. El taco que se pide con hambre de verdad.", "image": "/gallery/plancha.jpg", "imageAlt": "Plancha con tacos de carne"},
      {"name": "Paola Mendoza", "role": "Elaboradora de la mañana", "station": "Huevo a la mexicana y chicharrón prensado. El primer taco del día.", "image": "/products/huevo.jpg", "imageAlt": "Taco de huevo a la mexicana, estación de mañana"}
    ]
  }'::jsonb,
  updated_at = now()
where id = 'kitchen';

update public.site_sections
set
  content = jsonb_set(
    content,
    '{imageAlt}',
    '"Tacos recién hechos sobre plancha, vapor y limón"'::jsonb
  ),
  updated_at = now()
where id = 'hero';

update public.site_settings
set
  value = jsonb_set(
    jsonb_set(
      value,
      '{slogan}',
      '"Un rico sabor para un excelente día"'::jsonb
    ),
    '{payment}',
    '"Pago presencial al recoger o al entregar el pedido."'::jsonb
  ),
  updated_at = now()
where key = 'business';


-- ===== supabase\migrations\20260928010000_admin_sales_summary.sql =====
-- Resumen de ventas para el administrador.
-- Agrupa en America/Mexico_City. No devuelve datos de clientes.

create index if not exists orders_created_at_idx on public.orders (created_at);

create or replace function public.admin_sales_summary(p_grain text, p_anchor date)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  tz constant text := 'America/Mexico_City';
  grain text := lower(btrim(coalesce(p_grain, '')));
  anchor date;
  range_start date;
  range_end date;
  period_start timestamptz;
  period_end timestamptz;
  prev_start timestamptz;
  prev_end timestamptz;
  sales_cents bigint := 0;
  orders_delivered bigint := 0;
  cancelled_count bigint := 0;
  cancelled_cents bigint := 0;
  open_count bigint := 0;
  open_cents bigint := 0;
  prev_sales bigint := 0;
  prev_orders bigint := 0;
  series jsonb := '[]'::jsonb;
  products jsonb := '[]'::jsonb;
  channels jsonb := '[]'::jsonb;
  by_fulfillment jsonb := '[]'::jsonb;
  period_label text;
  month_abbrs constant text[] := array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  month_names constant text[] := array[
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
  ];
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Solo el administrador puede ver el resumen';
  end if;

  if grain not in ('day', 'week', 'month') then
    raise exception 'Periodo no válido';
  end if;

  anchor := coalesce(p_anchor, (timezone(tz, now()))::date);

  if grain = 'day' then
    range_start := anchor;
    range_end := anchor;
    prev_start := ((anchor - 1)::timestamp) at time zone tz;
  elsif grain = 'week' then
    range_start := anchor - (extract(isodow from anchor)::int - 1);
    range_end := range_start + 6;
    prev_start := ((range_start - 7)::timestamp) at time zone tz;
  else
    range_start := date_trunc('month', anchor)::date;
    range_end := (range_start + interval '1 month')::date - 1;
    prev_start := ((range_start - interval '1 month')::date::timestamp) at time zone tz;
  end if;

  period_start := (range_start::timestamp) at time zone tz;
  period_end := ((range_end + 1)::timestamp) at time zone tz;
  prev_end := period_start;

  if grain = 'day' then
    period_label := extract(day from anchor)::int || ' ' || month_abbrs[extract(month from anchor)::int] || ' ' || extract(year from anchor)::int;
  elsif grain = 'week' then
    if extract(month from range_start) = extract(month from range_end)
       and extract(year from range_start) = extract(year from range_end) then
      period_label := extract(day from range_start)::int || '–' || extract(day from range_end)::int
        || ' ' || month_abbrs[extract(month from range_end)::int]
        || ' ' || extract(year from range_end)::int;
    elsif extract(year from range_start) = extract(year from range_end) then
      period_label := extract(day from range_start)::int || ' ' || month_abbrs[extract(month from range_start)::int]
        || ' – ' || extract(day from range_end)::int || ' ' || month_abbrs[extract(month from range_end)::int]
        || ' ' || extract(year from range_end)::int;
    else
      period_label := extract(day from range_start)::int || ' ' || month_abbrs[extract(month from range_start)::int]
        || ' ' || extract(year from range_start)::int
        || ' – ' || extract(day from range_end)::int || ' ' || month_abbrs[extract(month from range_end)::int]
        || ' ' || extract(year from range_end)::int;
    end if;
  else
    period_label := month_names[extract(month from range_start)::int] || ' ' || extract(year from range_start)::int;
  end if;

  select
    coalesce(sum(total_cents) filter (where status = 'entregado'), 0),
    coalesce(count(*) filter (where status = 'entregado'), 0),
    coalesce(count(*) filter (where status = 'cancelado'), 0),
    coalesce(sum(total_cents) filter (where status = 'cancelado'), 0),
    coalesce(count(*) filter (where status in ('recibido', 'en_preparacion', 'en_camino')), 0),
    coalesce(sum(total_cents) filter (where status in ('recibido', 'en_preparacion', 'en_camino')), 0)
  into sales_cents, orders_delivered, cancelled_count, cancelled_cents, open_count, open_cents
  from public.orders
  where created_at >= period_start
    and created_at < period_end;

  select
    coalesce(sum(total_cents), 0),
    coalesce(count(*), 0)
  into prev_sales, prev_orders
  from public.orders
  where status = 'entregado'
    and created_at >= prev_start
    and created_at < prev_end;

  if grain = 'day' then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'key', lpad(h.hour::text, 2, '0'),
        'label', lpad(h.hour::text, 2, '0') || ':00',
        'sales_cents', coalesce(s.sales_cents, 0),
        'orders', coalesce(s.orders, 0)
      )
      order by h.hour
    ), '[]'::jsonb)
    into series
    from (
      select gs.hour
      from generate_series(7, 14) as gs(hour)
      union
      select extract(hour from timezone(tz, o.created_at))::int
      from public.orders o
      where o.status = 'entregado'
        and o.created_at >= period_start
        and o.created_at < period_end
    ) h
    left join (
      select
        extract(hour from timezone(tz, created_at))::int as hour,
        coalesce(sum(total_cents), 0)::bigint as sales_cents,
        count(*)::bigint as orders
      from public.orders
      where status = 'entregado'
        and created_at >= period_start
        and created_at < period_end
      group by 1
    ) s on s.hour = h.hour;
  elsif grain = 'week' then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'key', to_char(d.day, 'YYYY-MM-DD'),
        'label', (array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'])[extract(isodow from d.day)::int] || ' ' || extract(day from d.day)::int,
        'sales_cents', coalesce(s.sales_cents, 0),
        'orders', coalesce(s.orders, 0)
      )
      order by d.day
    ), '[]'::jsonb)
    into series
    from (
      select gs.d::date as day
      from generate_series(range_start::timestamp, range_end::timestamp, interval '1 day') as gs(d)
    ) d
    left join (
      select
        (timezone(tz, created_at))::date as day,
        coalesce(sum(total_cents), 0)::bigint as sales_cents,
        count(*)::bigint as orders
      from public.orders
      where status = 'entregado'
        and created_at >= period_start
        and created_at < period_end
      group by 1
    ) s on s.day = d.day;
  else
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'key', to_char(d.day, 'YYYY-MM-DD'),
        'label', extract(day from d.day)::int::text,
        'sales_cents', coalesce(s.sales_cents, 0),
        'orders', coalesce(s.orders, 0)
      )
      order by d.day
    ), '[]'::jsonb)
    into series
    from (
      select gs.d::date as day
      from generate_series(range_start::timestamp, range_end::timestamp, interval '1 day') as gs(d)
    ) d
    left join (
      select
        (timezone(tz, created_at))::date as day,
        coalesce(sum(total_cents), 0)::bigint as sales_cents,
        count(*)::bigint as orders
      from public.orders
      where status = 'entregado'
        and created_at >= period_start
        and created_at < period_end
      group by 1
    ) s on s.day = d.day;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', g.name,
      'kind', g.kind,
      'qty', g.qty,
      'sales_cents', g.sales_cents
    )
    order by g.qty desc, g.sales_cents desc, g.name
  ), '[]'::jsonb)
  into products
  from (
    select
      max(line.name) as name,
      max(line.kind) as kind,
      sum(line.qty)::bigint as qty,
      sum(line.qty * line.unit_price)::bigint as sales_cents
    from (
      select
        coalesce(nullif(item->>'id', ''), nullif(item->>'name', ''), 'producto') as product_key,
        coalesce(nullif(btrim(item->>'name'), ''), 'Producto') as name,
        case when item->>'kind' = 'drink' then 'drink' else 'taco' end as kind,
        case
          when coalesce(item->>'qty', '') ~ '^[0-9]+$' then (item->>'qty')::integer
          else 0
        end as qty,
        case
          when coalesce(item->>'unitPrice', '') ~ '^[0-9]+$' then (item->>'unitPrice')::integer
          else 0
        end as unit_price
      from public.orders o
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end
      ) as item
      where o.status = 'entregado'
        and o.created_at >= period_start
        and o.created_at < period_end
    ) line
    where line.qty > 0
    group by line.product_key
  ) g;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'source', dims.src,
      'orders', coalesce(c.orders, 0),
      'sales_cents', coalesce(c.sales_cents, 0)
    )
    order by dims.ord
  ), '[]'::jsonb)
  into channels
  from (values ('web', 1), ('mostrador', 2)) as dims(src, ord)
  left join (
    select
      coalesce(o.source, 'web') as source,
      count(*)::bigint as orders,
      coalesce(sum(o.total_cents), 0)::bigint as sales_cents
    from public.orders o
    where o.status = 'entregado'
      and o.created_at >= period_start
      and o.created_at < period_end
    group by 1
  ) c on c.source = dims.src;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'fulfillment', dims.mode,
      'orders', coalesce(c.orders, 0),
      'sales_cents', coalesce(c.sales_cents, 0)
    )
    order by dims.ord
  ), '[]'::jsonb)
  into by_fulfillment
  from (values ('pickup', 1), ('delivery', 2)) as dims(mode, ord)
  left join (
    select
      coalesce(o.fulfillment, 'pickup') as mode,
      count(*)::bigint as orders,
      coalesce(sum(o.total_cents), 0)::bigint as sales_cents
    from public.orders o
    where o.status = 'entregado'
      and o.created_at >= period_start
      and o.created_at < period_end
    group by 1
  ) c on c.mode = dims.mode;

  return jsonb_build_object(
    'timezone', tz,
    'grain', grain,
    'from', to_char(range_start, 'YYYY-MM-DD'),
    'to', to_char(range_end, 'YYYY-MM-DD'),
    'label', period_label,
    'sales_cents', sales_cents,
    'orders_delivered', orders_delivered,
    'avg_ticket_cents', case
      when orders_delivered = 0 then 0
      else round(sales_cents::numeric / orders_delivered)::bigint
    end,
    'cancelled_count', cancelled_count,
    'cancelled_cents', cancelled_cents,
    'open_count', open_count,
    'open_cents', open_cents,
    'previous', jsonb_build_object(
      'sales_cents', prev_sales,
      'orders_delivered', prev_orders
    ),
    'series', series,
    'products', products,
    'channels', channels,
    'fulfillment', by_fulfillment
  );
end;
$$;

revoke all on function public.admin_sales_summary(text, date) from public;
revoke all on function public.admin_sales_summary(text, date) from anon;
grant execute on function public.admin_sales_summary(text, date) to authenticated;
