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
