-- Permite que el equipo (vendedores y admin) marque un producto como agotado/disponible
-- desde el mostrador, sin exigir permisos de administrador.

create or replace function public.set_product_sold_out(
  p_product_id uuid,
  p_sold_out boolean
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products%rowtype;
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Solo el equipo puede cambiar la disponibilidad';
  end if;

  update public.products
  set sold_out = coalesce(p_sold_out, false),
      updated_at = now()
  where id = p_product_id
  returning * into prod;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  return prod;
end;
$$;

revoke all on function public.set_product_sold_out(uuid, boolean) from public;
grant execute on function public.set_product_sold_out(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
