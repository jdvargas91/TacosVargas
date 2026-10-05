-- Folio PEDIDO-N (solo front), pago tarjeta + comprobante, mostrador editable,
-- reset diario de agotados, tortillas en items.

-- 1) Pago y comprobante
alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  alter column payment_method set default 'tarjeta';

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('tarjeta', 'presencial'));

alter table public.orders
  add column if not exists payment_proof_url text;

-- 2) Bucket comprobantes (lectura staff / dueño del pedido)
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "users_upload_own_payment_proofs" on storage.objects;
create policy "users_upload_own_payment_proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users_read_own_payment_proofs" on storage.objects;
create policy "users_read_own_payment_proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.is_staff()
    )
  );

-- 3) Reset diario: quitar marca agotado (stock se mantiene)
create or replace function public.reset_daily_availability()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.products
  set sold_out = false, updated_at = now()
  where coalesce(archived, false) = false
    and sold_out = true;
  get diagnostics n = row_count;
  return jsonb_build_object('cleared', n, 'at', now());
end;
$$;

revoke all on function public.reset_daily_availability() from public;
grant execute on function public.reset_daily_availability() to service_role;

-- 4) place_order: solo pickup + tarjeta + comprobante + tortillas en items
create or replace function private.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_notes text,
  p_fulfillment text default 'pickup',
  p_payment_proof_url text default null
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
  tortillas integer;
  prod public.products%rowtype;
  built_items jsonb := '[]'::jsonb;
  total integer := 0;
  new_stock integer;
  new_id uuid;
  new_number bigint;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión para pedir';
  end if;

  if p_phone is null or length(trim(p_phone)) < 8 then
    raise exception 'El teléfono es obligatorio';
  end if;

  if nullif(trim(p_customer_name), '') is null then
    raise exception 'El nombre es obligatorio';
  end if;

  if p_payment_proof_url is null or length(trim(p_payment_proof_url)) < 8 then
    raise exception 'Sube el comprobante de la transferencia para registrar el pedido';
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

    tortillas := case
      when prod.kind = 'taco' then
        case when coalesce((line->>'tortillas')::integer, 2) = 1 then 1 else 2 end
      else null
    end;

    built_items := built_items || jsonb_build_array(
      jsonb_build_object(
        'id', prod.id,
        'name', prod.name,
        'kind', prod.kind,
        'qty', qty,
        'unitPrice', prod.price_cents,
        'tortillas', tortillas
      )
    );
  end loop;

  if total <= 0 or jsonb_array_length(built_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  insert into public.orders (
    user_id, customer_name, phone, delivery_address, fulfillment, items, notes,
    total_cents, payment_method, payment_proof_url, status, source, created_by
  )
  values (
    uid,
    trim(p_customer_name),
    trim(p_phone),
    jsonb_build_object('mode', 'pickup'),
    'pickup',
    built_items,
    nullif(trim(p_notes), ''),
    total,
    'tarjeta',
    trim(p_payment_proof_url),
    'recibido',
    'web',
    null
  )
  returning id, order_number into new_id, new_number;

  return jsonb_build_object(
    'id', new_id,
    'order_number', new_number,
    'total_cents', total,
    'items', built_items,
    'status', 'recibido'
  );
end;
$$;

create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_notes text,
  p_fulfillment text default 'pickup',
  p_payment_proof_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  return private.place_order(
    p_customer_name, p_phone, p_delivery_address, p_items, p_notes, p_fulfillment, p_payment_proof_url
  );
end;
$$;

revoke all on function public.place_order(text, text, jsonb, jsonb, text, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, jsonb, text, text, text) to authenticated;

-- Compat: firma antigua sin proof (falla pidiendo comprobante)
drop function if exists public.place_order(text, text, jsonb, jsonb, text, text);

-- 5) Mostrador: nombre requerido, queda abierto (recibido) para poder agregar
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
  tortillas integer;
  prod public.products%rowtype;
  built_items jsonb := '[]'::jsonb;
  total integer := 0;
  new_stock integer;
  new_id uuid;
  new_number bigint;
  cust text;
begin
  uid := auth.uid();
  if uid is null or not private.is_staff() then
    raise exception 'Solo el equipo puede registrar ventas de mostrador';
  end if;

  cust := nullif(trim(p_customer_name), '');
  if cust is null then
    raise exception 'Escribe el nombre del cliente';
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
    tortillas := case
      when prod.kind = 'taco' then
        case when coalesce((line->>'tortillas')::integer, 2) = 1 then 1 else 2 end
      else null
    end;

    built_items := built_items || jsonb_build_array(
      jsonb_build_object(
        'id', prod.id,
        'name', prod.name,
        'kind', prod.kind,
        'qty', qty,
        'unitPrice', prod.price_cents,
        'tortillas', tortillas
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
    cust,
    coalesce(nullif(trim(p_phone), ''), '—'),
    jsonb_build_object('mode', 'pickup'),
    'pickup',
    built_items,
    nullif(trim(p_notes), ''),
    total,
    'presencial',
    'recibido',
    'mostrador',
    uid
  )
  returning id, order_number into new_id, new_number;

  return jsonb_build_object(
    'id', new_id,
    'order_number', new_number,
    'total_cents', total,
    'items', built_items,
    'status', 'recibido',
    'source', 'mostrador',
    'customer_name', cust
  );
end;
$$;

drop function if exists public.place_counter_sale(jsonb);
drop function if exists public.place_counter_sale(jsonb, text);

create or replace function public.place_counter_sale(
  p_items jsonb,
  p_customer_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  return private.place_counter_order(
    p_customer_name,
    '—',
    jsonb_build_object('mode', 'pickup'),
    p_items,
    null,
    'pickup'
  );
end;
$$;

revoke all on function public.place_counter_sale(jsonb, text) from public;
grant execute on function public.place_counter_sale(jsonb, text) to authenticated;

-- 6) Agregar productos a pedido de mostrador abierto + renombrar cliente
create or replace function public.append_counter_items(
  p_order_id uuid,
  p_items jsonb,
  p_customer_name text default null
)
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
  tortillas integer;
  prod public.products%rowtype;
  built_items jsonb;
  total integer;
  new_stock integer;
  cust text;
begin
  uid := auth.uid();
  if uid is null or not private.is_staff() then
    raise exception 'Solo el equipo puede editar pedidos de mostrador';
  end if;

  select * into ord from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'No encontramos ese pedido';
  end if;
  if ord.source is distinct from 'mostrador' then
    raise exception 'Solo se pueden editar pedidos de mostrador';
  end if;
  if ord.status in ('entregado', 'cancelado') then
    raise exception 'Este pedido ya está cerrado';
  end if;

  if p_customer_name is not null and nullif(trim(p_customer_name), '') is not null then
    cust := trim(p_customer_name);
  else
    cust := ord.customer_name;
  end if;

  if nullif(trim(cust), '') is null then
    raise exception 'Escribe el nombre del cliente';
  end if;

  built_items := coalesce(ord.items, '[]'::jsonb);
  total := ord.total_cents;

  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
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
        raise exception 'Un producto ya no existe';
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
      tortillas := case
        when prod.kind = 'taco' then
          case when coalesce((line->>'tortillas')::integer, 2) = 1 then 1 else 2 end
        else null
      end;

      built_items := built_items || jsonb_build_array(
        jsonb_build_object(
          'id', prod.id,
          'name', prod.name,
          'kind', prod.kind,
          'qty', qty,
          'unitPrice', prod.price_cents,
          'tortillas', tortillas
        )
      );
    end loop;
  end if;

  update public.orders
  set
    customer_name = cust,
    items = built_items,
    total_cents = total
  where id = ord.id;

  return jsonb_build_object(
    'id', ord.id,
    'order_number', ord.order_number,
    'customer_name', cust,
    'total_cents', total,
    'items', built_items,
    'status', ord.status
  );
end;
$$;

revoke all on function public.append_counter_items(uuid, jsonb, text) from public;
grant execute on function public.append_counter_items(uuid, jsonb, text) to authenticated;

-- Staff puede actualizar nombre de cliente en pedidos
create or replace function public.update_order_customer_name(
  p_order_id uuid,
  p_customer_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Solo el equipo puede editar el nombre';
  end if;
  if nullif(trim(p_customer_name), '') is null then
    raise exception 'El nombre es obligatorio';
  end if;
  update public.orders
  set customer_name = trim(p_customer_name)
  where id = p_order_id;
end;
$$;

revoke all on function public.update_order_customer_name(uuid, text) from public;
grant execute on function public.update_order_customer_name(uuid, text) to authenticated;
