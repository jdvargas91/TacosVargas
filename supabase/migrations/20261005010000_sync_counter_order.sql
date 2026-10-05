-- Validación de nombre de cliente en cualquier insert/update de orders
create or replace function private.assert_person_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  cust text := nullif(btrim(p_name), '');
begin
  if cust is null then
    raise exception 'Escribe el nombre del cliente';
  end if;
  if char_length(cust) < 2 then
    raise exception 'Escribe un nombre válido (al menos 2 letras)';
  end if;
  if cust ~ '[0-9]' then
    raise exception 'El nombre solo puede tener letras, no números';
  end if;
  if cust !~* '[a-záéíóúüñ]' then
    raise exception 'Escribe un nombre válido';
  end if;
  return cust;
end;
$$;

create or replace function private.orders_customer_name_guard()
returns trigger
language plpgsql
as $$
begin
  if NEW.customer_name is not null then
    NEW.customer_name := private.assert_person_name(NEW.customer_name);
  end if;
  return NEW;
end;
$$;

drop trigger if exists orders_customer_name_guard on public.orders;
create trigger orders_customer_name_guard
  before insert or update of customer_name on public.orders
  for each row
  execute function private.orders_customer_name_guard();

-- Sincroniza el ticket de un pedido de mostrador abierto (reemplaza ítems y ajusta stock).

create or replace function public.sync_counter_order(
  p_order_id uuid,
  p_items jsonb,
  p_customer_name text
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
  prod_id uuid;
  prod public.products%rowtype;
  old_qty integer;
  new_qty integer;
  delta integer;
  built_items jsonb := '[]'::jsonb;
  total integer := 0;
  cust text;
  tortillas integer;
  old_map jsonb := '{}'::jsonb;
  new_map jsonb := '{}'::jsonb;
  key text;
begin
  uid := auth.uid();
  if uid is null or not private.is_staff() then
    raise exception 'Solo el equipo puede editar pedidos de mostrador';
  end if;

  cust := private.assert_person_name(p_customer_name);

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

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  -- Mapa viejo: product_id -> qty
  for line in select * from jsonb_array_elements(coalesce(ord.items, '[]'::jsonb))
  loop
    begin
      prod_id := (line->>'id')::uuid;
    exception when others then
      continue;
    end;
    qty := coalesce((line->>'qty')::integer, 0);
    if qty < 1 then
      continue;
    end if;
    old_map := jsonb_set(
      old_map,
      array[prod_id::text],
      to_jsonb(coalesce((old_map->>prod_id::text)::integer, 0) + qty)
    );
  end loop;

  -- Construir ítems nuevos y mapa nuevo
  for line in select * from jsonb_array_elements(p_items)
  loop
    qty := coalesce((line->>'qty')::integer, 0);
    if qty < 1 then
      continue;
    end if;

    begin
      prod_id := (line->>'id')::uuid;
    exception when others then
      raise exception 'Producto inválido en el ticket';
    end;

    select * into prod
    from public.products
    where id = prod_id
      and coalesce(archived, false) = false
    for update;

    if not found then
      raise exception 'Un producto ya no existe';
    end if;

    new_map := jsonb_set(
      new_map,
      array[prod_id::text],
      to_jsonb(coalesce((new_map->>prod_id::text)::integer, 0) + qty)
    );

    tortillas := case
      when prod.kind = 'taco' then
        case when coalesce((line->>'tortillas')::integer, 2) = 1 then 1 else 2 end
      else null
    end;

    total := total + (prod.price_cents * qty);
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
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  -- Ajustar stock por diferencia (nuevo - viejo)
  for key in
    select distinct k from (
      select jsonb_object_keys(old_map) as k
      union
      select jsonb_object_keys(new_map) as k
    ) keys
  loop
    old_qty := coalesce((old_map->>key)::integer, 0);
    new_qty := coalesce((new_map->>key)::integer, 0);
    delta := new_qty - old_qty;
    if delta = 0 then
      continue;
    end if;

    select * into prod from public.products where id = key::uuid for update;
    if not found then
      continue;
    end if;

    if delta > 0 then
      if prod.sold_out or prod.stock < delta then
        raise exception '% no tiene suficientes porciones', prod.name;
      end if;
      update public.products
      set
        stock = stock - delta,
        sold_out = case when stock - delta = 0 then true else sold_out end,
        updated_at = now()
      where id = prod.id;
    else
      update public.products
      set
        stock = stock + abs(delta),
        sold_out = false,
        updated_at = now()
      where id = prod.id;
    end if;
  end loop;

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

revoke all on function public.sync_counter_order(uuid, jsonb, text) from public;
grant execute on function public.sync_counter_order(uuid, jsonb, text) to authenticated;

-- Validar nombre también en place_counter / append / update name
create or replace function public.update_order_customer_name(
  p_order_id uuid,
  p_customer_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cust text;
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Solo el equipo puede editar el nombre';
  end if;
  cust := private.assert_person_name(p_customer_name);
  update public.orders
  set customer_name = cust
  where id = p_order_id;
end;
$$;

revoke all on function public.update_order_customer_name(uuid, text) from public;
grant execute on function public.update_order_customer_name(uuid, text) to authenticated;
