-- =====================================================================
-- DIAGNÓSTICO: ¿qué migraciones están aplicadas en ESTE proyecto?
-- Ejecútalo en Supabase → SQL Editor del proyecto utoubzjzagiodrvurxkr
-- (confirma el ref en la URL del dashboard antes de correrlo).
-- =====================================================================

-- 1) Funciones RPC que la app necesita. Debe decir OK en todas.
with esperadas(schema_name, func_name, args) as (
  values
    ('public', 'cancel_my_order',          'uuid'),
    ('public', 'place_order',              null),
    ('public', 'place_counter_order',      null),
    ('public', 'place_counter_sale',       null),
    ('public', 'sync_counter_order',       null),
    ('public', 'append_counter_items',     null),
    ('public', 'update_order_customer_name', null),
    ('public', 'set_product_sold_out',     'uuid, boolean'),
    ('public', 'reset_daily_availability', null),
    ('public', 'adjust_product_stock',     null),
    ('public', 'admin_sales_summary',      null),
    ('public', 'claim_team_invite',        null)
)
select
  e.schema_name || '.' || e.func_name as funcion,
  case when p.proname is null then '❌ FALTA' else '✅ OK' end as estado,
  coalesce(string_agg(pg_get_function_identity_arguments(p.oid), ' | '), '') as firmas
from esperadas e
left join pg_proc p
  on p.proname = e.func_name
 and p.pronamespace = e.schema_name::regnamespace
group by e.schema_name, e.func_name, p.proname
order by estado desc, funcion;

-- 2) Columnas clave en la tabla orders.
select
  col,
  case when c.column_name is null then '❌ FALTA' else '✅ OK' end as estado
from (values
  ('order_number'), ('source'), ('created_by'),
  ('payment_proof_url'), ('payment_method')
) as esperadas(col)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'orders'
 and c.column_name = esperadas.col
order by estado desc, col;

-- 3) Columna sold_out en products.
select
  'products.sold_out' as col,
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='sold_out'
  ) then '✅ OK' else '❌ FALTA' end as estado;

-- 4) Historial de migraciones registradas (si usas supabase db push).
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 30;

-- 5) Fuerza la recarga del cache de la API (PostgREST).
notify pgrst, 'reload schema';
