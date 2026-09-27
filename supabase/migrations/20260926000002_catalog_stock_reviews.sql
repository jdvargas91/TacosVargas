-- Phase 3: product details, stock adjustments, reviews

alter table public.products
  add column if not exists long_description text not null default '',
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists allergens text[] not null default '{}',
  add column if not exists weight_grams integer,
  add column if not exists serving text,
  add column if not exists archived boolean not null default false;

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  delta integer not null,
  reason text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_adjustments_product_idx
  on public.stock_adjustments (product_id, created_at desc);

alter table public.stock_adjustments enable row level security;

create policy "admin_select_stock_adjustments"
  on public.stock_adjustments for select to authenticated
  using (private.is_admin());

create policy "admin_insert_stock_adjustments"
  on public.stock_adjustments for insert to authenticated
  with check (private.is_admin());

-- Adjust stock RPC with audit trail
create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text default null,
  p_sold_out boolean default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products%rowtype;
  new_stock integer;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Solo el administrador puede ajustar el almacén';
  end if;

  select * into prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  new_stock := greatest(0, prod.stock + coalesce(p_delta, 0));

  update public.products
  set
    stock = new_stock,
    sold_out = coalesce(p_sold_out, case when new_stock = 0 then true else sold_out end),
    updated_at = now()
  where id = p_product_id
  returning * into prod;

  if coalesce(p_delta, 0) <> 0 then
    insert into public.stock_adjustments (product_id, delta, reason, user_id)
    values (p_product_id, p_delta, nullif(trim(p_reason), ''), auth.uid());
  end if;

  return prod;
end;
$$;

revoke all on function public.adjust_product_stock(uuid, integer, text, boolean) from public;
grant execute on function public.adjust_product_stock(uuid, integer, text, boolean) to authenticated;

-- Hide archived products from public (staff/admin still see via admin flag — public read filters archived)
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select to anon, authenticated
  using (archived = false or private.is_admin());

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  published_at date not null default current_date,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "reviews_public_read_visible"
  on public.reviews for select to anon, authenticated
  using (visible = true or private.is_admin());

create policy "admin_insert_reviews"
  on public.reviews for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_reviews"
  on public.reviews for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_reviews"
  on public.reviews for delete to authenticated
  using (private.is_admin());

insert into public.reviews (id, author, rating, text, published_at, visible) values
  (
    'b1b1b1b1-0001-4000-8000-000000000001',
    'Mariana G.',
    5,
    'El camarón capeado se pide solo. Llegué a las 8 y todavía había cola, pero vale la espera.',
    '2026-08-12',
    true
  ),
  (
    'b1b1b1b1-0001-4000-8000-000000000002',
    'Luis R.',
    5,
    'Barbacoa de desayuno y agua de jamaica. Horario de mañana, justo lo que buscaba.',
    '2026-07-28',
    true
  ),
  (
    'b1b1b1b1-0001-4000-8000-000000000003',
    'Carla P.',
    4,
    'Buen bistec y el trato es de barrio. Falta que confirmen la dirección exacta en el mapa, pero el taco está.',
    '2026-06-03',
    true
  )
on conflict (id) do nothing;

-- Backfill product details from seed-like data for known IDs
update public.products set
  long_description = coalesce(nullif(long_description, ''), description),
  serving = coalesce(serving, case when kind = 'taco' then '1 taco' else '1 pieza' end)
where long_description = '' or serving is null;
