-- Folio legible ORD-0001 + cancelación de pedidos por el cliente

-- 1) Número consecutivo de pedido
alter table public.orders
  add column if not exists order_number bigint;

create sequence if not exists public.orders_order_number_seq;

-- Backfill pedidos existentes en orden cronológico
do $$
declare
  r record;
  n bigint := 0;
begin
  if exists (
    select 1 from public.orders where order_number is null
  ) then
    for r in
      select id from public.orders order by created_at asc, id asc
    loop
      n := n + 1;
      update public.orders set order_number = n where id = r.id;
    end loop;
    perform setval('public.orders_order_number_seq', greatest(n, 1), true);
  else
    perform setval(
      'public.orders_order_number_seq',
      greatest(coalesce((select max(order_number) from public.orders), 0), 1),
      true
    );
  end if;
end $$;

alter table public.orders
  alter column order_number set default nextval('public.orders_order_number_seq');

alter table public.orders
  alter column order_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_order_number_key'
  ) then
    alter table public.orders add constraint orders_order_number_key unique (order_number);
  end if;
end $$;

alter sequence public.orders_order_number_seq owned by public.orders.order_number;

create index if not exists orders_order_number_idx on public.orders (order_number desc);

-- 2) place_order (web) — incluye order_number en la respuesta
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
  new_number bigint;
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
      and coalesce(archived, false) = false
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
  returning id, order_number into new_id, new_number;

  return jsonb_build_object(
    'id', new_id,
    'order_number', new_number,
    'total_cents', total,
    'items', built_items
  );
end;
$$;

-- 3) place_counter_order — venta de mostrador entregada + order_number
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
  new_number bigint;
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
  returning id, order_number into new_id, new_number;

  return jsonb_build_object(
    'id', new_id,
    'order_number', new_number,
    'total_cents', total,
    'items', built_items,
    'status', 'entregado',
    'source', 'mostrador'
  );
end;
$$;

-- 4) Cliente cancela su propio pedido (solo si aún está "Nuevo" / recibido)
create or replace function public.cancel_my_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  ord public.orders%rowtype;
  line jsonb;
  qty integer;
  prod_id uuid;
  new_number bigint;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select * into ord
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'No encontramos ese pedido';
  end if;

  if ord.user_id is distinct from uid then
    raise exception 'Solo puedes cancelar tus propios pedidos';
  end if;

  if ord.status = 'cancelado' then
    raise exception 'Este pedido ya está cancelado';
  end if;

  if ord.status <> 'recibido' then
    raise exception 'Ya no puedes cancelarlo: la cocina ya lo está atendiendo. Habla con el local por WhatsApp.';
  end if;

  -- Devolver existencias
  for line in select * from jsonb_array_elements(ord.items)
  loop
    qty := coalesce((line->>'qty')::integer, 0);
    if qty < 1 then
      continue;
    end if;
    begin
      prod_id := (line->>'id')::uuid;
    exception when others then
      continue;
    end;

    update public.products
    set
      stock = stock + qty,
      sold_out = false,
      updated_at = now()
    where id = prod_id;
  end loop;

  update public.orders
  set status = 'cancelado'
  where id = ord.id
  returning order_number into new_number;

  return jsonb_build_object(
    'id', ord.id,
    'order_number', new_number,
    'status', 'cancelado'
  );
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public;
grant execute on function public.cancel_my_order(uuid) to authenticated;
