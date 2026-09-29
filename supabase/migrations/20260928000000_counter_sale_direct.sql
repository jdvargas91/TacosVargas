-- Ventas de mostrador: solo productos, status entregado, sin datos de cliente/mensajería.

-- Historial: unificar ventas de mostrador previas como entregadas.
update public.orders
set status = 'entregado'
where source = 'mostrador'
  and status <> 'entregado'
  and status <> 'cancelado';

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

  -- Venta presencial directa: queda entregada. Los args de cliente/mensajería se ignoran.
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

-- Firma simplificada: solo items (la usada por el panel de mostrador).
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

-- Mantener firma antigua pero con la misma lógica (compatibilidad).
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
