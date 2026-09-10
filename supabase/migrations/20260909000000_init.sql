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
