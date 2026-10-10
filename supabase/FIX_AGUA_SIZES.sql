-- Aguas frescas por sabor + tamaños chica/grande (precios en products.sizes).

alter table public.products
  add column if not exists sizes jsonb;

-- Jamaica (antes Agua fresca chica)
update public.products set
  name = 'Jamaica',
  description = 'Roja, ácida y bien fría. La que pide el taco de adobada.',
  long_description = 'Flor de jamaica macerada hasta quedar profunda y con ese ácido que limpia el paladar. Ideal entre tacos picantes o cuando el calor de Manzanillo ya aprieta. Elige vaso chico o grande.',
  ingredients = '{}',
  allergens = '{}',
  serving = 'Agua fresca',
  weight_grams = null,
  price_cents = 2200,
  image_url = '/products/jamaica.webp',
  sizes = '[{"id":"chica","label":"Chica","priceCents":2200},{"id":"grande","label":"Grande","priceCents":3800}]'::jsonb,
  sort_order = 10,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000010';

-- Piña (antes Agua fresca grande)
update public.products set
  name = 'Piña',
  description = 'Dulce tropical, jugosa, para acompañar camarón o pescado.',
  long_description = 'Piña madura licuada, con cuerpo y un dulzor natural que no se siente empalagoso. Combina de maravilla con los tacos capeados. Elige vaso chico o grande.',
  ingredients = '{}',
  allergens = '{}',
  serving = 'Agua fresca',
  weight_grams = null,
  price_cents = 2200,
  image_url = '/products/pina.webp',
  sizes = '[{"id":"chica","label":"Chica","priceCents":2200},{"id":"grande","label":"Grande","priceCents":3800}]'::jsonb,
  sort_order = 11,
  archived = false,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000011';

-- Coca-Cola de vidrio
update public.products set
  name = 'Coca-Cola de vidrio',
  description = 'Envase de vidrio. Helada, para cortar el picor.',
  long_description = 'Coca-Cola en envase de vidrio. Helada. El clásico para cortar el picor de la adobada o el camarón.',
  ingredients = '{}',
  allergens = '{}',
  serving = 'Botella de vidrio',
  image_url = '/products/coca_cola_vidrio.webp',
  sizes = null,
  sort_order = 20,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000012';

-- Coca-Cola
update public.products set
  name = 'Coca-Cola',
  description = 'Envase desechable. Para la mesa o para llevar.',
  long_description = 'Coca-Cola en envase desechable. Para llevar o para la mesa. Mismo sabor de siempre, lista para acompañar el pedido.',
  ingredients = '{}',
  allergens = '{}',
  serving = 'Botella',
  image_url = '/products/coca_cola.webp',
  sizes = null,
  sort_order = 21,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000013';

-- Nuevos sabores
insert into public.products (
  id, kind, name, description, long_description, ingredients, allergens, serving,
  price_cents, image_url, stock, sold_out, is_featured, sort_order, archived, sizes
) values
(
  'a1a1a1a1-0001-4000-8000-000000000014',
  'drink',
  'Limón con chía',
  'Cítrica, ligera y con la semilla que refresca de verdad.',
  'Limón recién exprimido con chía hidratada: ácida, limpia y con textura. Es el vaso que se pide cuando quieres algo más vivo que un refresco. Elige tamaño chico o grande.',
  array['Chía'],
  '{}',
  'Agua fresca',
  2200,
  '/products/limon_chia.webp',
  50, false, false, 12, false,
  '[{"id":"chica","label":"Chica","priceCents":2200},{"id":"grande","label":"Grande","priceCents":3800}]'::jsonb
),
(
  'a1a1a1a1-0001-4000-8000-000000000015',
  'drink',
  'Pepino limón',
  'Verde, fresca y con un toque cítrico que quita la sed.',
  'Pepino con limón: suave, aromática y muy fría. Perfecta a media mañana, entre un taco de arrachera y el siguiente. Elige vaso chico o grande.',
  '{}',
  '{}',
  'Agua fresca',
  2200,
  '/products/pepino_limon.webp',
  50, false, false, 13, false,
  '[{"id":"chica","label":"Chica","priceCents":2200},{"id":"grande","label":"Grande","priceCents":3800}]'::jsonb
),
(
  'a1a1a1a1-0001-4000-8000-000000000016',
  'drink',
  'Carambola limón',
  'Exótica, ligeramente ácida, con el toque del limón local.',
  'Carambola (fruta estrella) con limón: un sabor distinto al de siempre, fresco y un poco floral. Para quien quiere cambiar de la jamaica sin irse al refresco. Elige chica o grande.',
  '{}',
  '{}',
  'Agua fresca',
  2200,
  '/products/carambola_limon.webp',
  50, false, false, 14, false,
  '[{"id":"chica","label":"Chica","priceCents":2200},{"id":"grande","label":"Grande","priceCents":3800}]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  long_description = excluded.long_description,
  ingredients = excluded.ingredients,
  allergens = excluded.allergens,
  serving = excluded.serving,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  sizes = excluded.sizes,
  sort_order = excluded.sort_order,
  archived = false,
  updated_at = now();

-- place_order: respeta size y toma el precio de products.sizes
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
  prod public.products%rowtype;
  built_items jsonb := '[]'::jsonb;
  total integer := 0;
  new_stock integer;
  new_id uuid;
  new_number bigint;
  pm text;
  proof text;
  tortillas integer;
  size_id text;
  unit_price integer;
  size_label text;
  display_name text;
  size_row jsonb;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión para pedir';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'El nombre es obligatorio';
  end if;

  pm := lower(trim(coalesce(p_payment_method, 'presencial')));
  if pm in ('tarjeta', 'transferencia', 'transfer') then
    pm := 'tarjeta';
  else
    pm := 'presencial';
  end if;

  proof := nullif(trim(coalesce(p_payment_proof_url, '')), '');
  if pm = 'tarjeta' and proof is null then
    raise exception 'Sube el comprobante de transferencia';
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

    size_id := nullif(trim(coalesce(line->>'size', '')), '');
    unit_price := prod.price_cents;
    size_label := null;
    display_name := prod.name;

    if size_id is not null and prod.sizes is not null and jsonb_typeof(prod.sizes) = 'array' then
      select s into size_row
      from jsonb_array_elements(prod.sizes) as s
      where s->>'id' = size_id
      limit 1;
      if size_row is not null then
        unit_price := coalesce((size_row->>'priceCents')::integer, (size_row->>'price_cents')::integer, prod.price_cents);
        size_label := coalesce(size_row->>'label', size_id);
        display_name := prod.name || ' · ' || size_label;
      end if;
    end if;

    total := total + (unit_price * qty);

    tortillas := case
      when prod.kind = 'taco' then
        case when coalesce((line->>'tortillas')::integer, 2) = 1 then 1 else 2 end
      else null
    end;

    built_items := built_items || jsonb_build_array(
      jsonb_build_object(
        'id', prod.id,
        'name', display_name,
        'kind', prod.kind,
        'qty', qty,
        'unitPrice', unit_price,
        'tortillas', tortillas,
        'size', size_id
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
language sql
security definer
set search_path = public
as $$
  select private.place_order(
    p_customer_name,
    p_phone,
    p_delivery_address,
    p_items,
    p_notes,
    p_fulfillment,
    p_payment_proof_url,
    p_payment_method
  );
$$;

revoke all on function public.place_order(text, text, jsonb, jsonb, text, text, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, jsonb, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
