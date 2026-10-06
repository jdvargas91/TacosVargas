-- Corrige: "Could not find the function public.cancel_my_order(p_order_id) in the schema cache"
-- La función no estaba aplicada en la base. Ejecuta este archivo UNA VEZ en Supabase → SQL Editor.

-- Cliente cancela su propio pedido (solo si aún está "Nuevo" / recibido).
create or replace function public.cancel_my_order(p_order_id uuid)
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
  new_number bigint;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select * into ord
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'No encontramos ese pedido';
  end if;

  if ord.user_id is distinct from uid then
    raise exception 'Solo puedes cancelar tus propios pedidos';
  end if;

  if ord.status = 'cancelado' then
    raise exception 'Este pedido ya está cancelado';
  end if;

  if ord.status <> 'recibido' then
    raise exception 'Ya no puedes cancelarlo: la cocina ya lo está atendiendo. Habla con el local por WhatsApp.';
  end if;

  -- Devolver existencias
  for line in select * from jsonb_array_elements(ord.items)
  loop
    qty := coalesce((line->>'qty')::integer, 0);
    if qty < 1 then
      continue;
    end if;
    begin
      prod_id := (line->>'id')::uuid;
    exception when others then
      continue;
    end;

    update public.products
    set
      stock = stock + qty,
      sold_out = false,
      updated_at = now()
    where id = prod_id;
  end loop;

  update public.orders
  set status = 'cancelado'
  where id = ord.id
  returning order_number into new_number;

  return jsonb_build_object(
    'id', ord.id,
    'order_number', new_number,
    'status', 'cancelado'
  );
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- Recarga el cache de PostgREST para que la API encuentre la función de inmediato.
notify pgrst, 'reload schema';
