-- Pedidos de mostrador arrancan en preparación.
-- En camino deja de usarse: no hay servicio de entrega.

update public.orders
set status = 'en_preparacion'
where status = 'en_camino'
   or (source = 'mostrador' and status = 'recibido');

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
    'en_preparacion',
    'mostrador',
    uid
  )
  returning id, order_number into new_id, new_number;

  return jsonb_build_object(
    'id', new_id,
    'order_number', new_number,
    'total_cents', total,
    'items', built_items,
    'status', 'en_preparacion',
    'source', 'mostrador',
    'customer_name', cust
  );
end;
$$;
