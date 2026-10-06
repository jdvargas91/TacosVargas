-- place_order admite método de pago: 'presencial' (pago al recoger, sin comprobante)
-- o 'tarjeta' (transferencia, requiere comprobante). El teléfono deja de ser obligatorio.

drop function if exists public.place_order(text, text, jsonb, jsonb, text, text, text);
drop function if exists private.place_order(text, text, jsonb, jsonb, text, text, text);

create or replace function private.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_notes text,
  p_fulfillment text default 'pickup',
  p_payment_proof_url text default null,
  p_payment_method text default 'presencial'
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
  pm text;
  proof text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión para pedir';
  end if;

  if nullif(trim(p_customer_name), '') is null then
    raise exception 'El nombre es obligatorio';
  end if;

  pm := case
    when lower(coalesce(p_payment_method, 'presencial')) in ('tarjeta', 'transferencia', 'transfer') then 'tarjeta'
    else 'presencial'
  end;

  proof := nullif(trim(p_payment_proof_url), '');

  if pm = 'tarjeta' and (proof is null or length(proof) < 8) then
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
    coalesce(nullif(trim(p_phone), ''), '—'),
    jsonb_build_object('mode', 'pickup'),
    'pickup',
    built_items,
    nullif(trim(p_notes), ''),
    total,
    pm,
    case when pm = 'tarjeta' then proof else null end,
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
  p_payment_proof_url text default null,
  p_payment_method text default 'presencial'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  return private.place_order(
    p_customer_name, p_phone, p_delivery_address, p_items, p_notes,
    p_fulfillment, p_payment_proof_url, p_payment_method
  );
end;
$$;

revoke all on function public.place_order(text, text, jsonb, jsonb, text, text, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, jsonb, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
