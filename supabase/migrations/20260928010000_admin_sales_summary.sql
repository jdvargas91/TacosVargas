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
