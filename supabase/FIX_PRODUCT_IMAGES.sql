-- Actualiza las URLs de imagen de los tacos a los nuevos .webp.
-- Ejecuta UNA VEZ en Supabase → SQL Editor (proyecto de producción).

update public.products set image_url = '/products/camaron_capeado.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000001';

update public.products set image_url = '/products/pescado_empanizado.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000002';

update public.products set image_url = '/products/arrachera.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000003';

update public.products set image_url = '/products/adobada.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000004';

update public.products set image_url = '/products/barbacoa.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000005';

update public.products set image_url = '/products/chicharron_prensado.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000006';

update public.products set image_url = '/products/carne_de_cerdo.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000007';

update public.products set image_url = '/products/huevos_mexicana.webp', updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000008';

-- Galería del sitio (si aún apunta a los .jpg viejos).
update public.site_sections
set content = jsonb_set(
  content,
  '{shots}',
  (
    select jsonb_agg(
      case
        when shot->>'src' = '/products/camaron.jpg' then jsonb_set(shot, '{src}', '"/products/camaron_capeado.webp"')
        when shot->>'src' = '/products/adobada.jpg' then jsonb_set(shot, '{src}', '"/products/adobada.webp"')
        when shot->>'src' = '/products/barbacoa.jpg' then jsonb_set(shot, '{src}', '"/products/barbacoa.webp"')
        when shot->>'src' = '/products/bistec.jpg' then jsonb_set(shot, '{src}', '"/products/arrachera.webp"')
        else shot
      end
    )
    from jsonb_array_elements(content->'shots') as shot
  ),
  true
),
updated_at = now()
where id = 'gallery'
  and content ? 'shots';
