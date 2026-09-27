-- Phase 2: CMS site settings, sections, site-media bucket

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.site_sections (
  id text primary key,
  kind text not null
    check (kind in ('hero', 'about', 'gallery', 'kitchen', 'footer_note')),
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "admin_write_site_settings" on public.site_settings;
create policy "admin_insert_site_settings"
  on public.site_settings for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_site_settings"
  on public.site_settings for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_site_settings"
  on public.site_settings for delete to authenticated
  using (private.is_admin());

drop policy if exists "site_sections_public_read" on public.site_sections;
create policy "site_sections_public_read"
  on public.site_sections for select to anon, authenticated
  using (is_published = true or private.is_admin());

create policy "admin_insert_site_sections"
  on public.site_sections for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_site_sections"
  on public.site_sections for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_site_sections"
  on public.site_sections for delete to authenticated
  using (private.is_admin());

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "site_media_public_read" on storage.objects;
create policy "site_media_public_read"
  on storage.objects for select to public
  using (bucket_id = 'site-media');

create policy "admin_upload_site_media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and private.is_admin());

create policy "admin_update_site_media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and private.is_admin())
  with check (bucket_id = 'site-media' and private.is_admin());

create policy "admin_delete_site_media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and private.is_admin());

-- Seed business settings from current static defaults
insert into public.site_settings (key, value) values
  ('business', '{
    "name": "Vargas Tacos",
    "legalName": "Tacos Vargas",
    "slogan": "Un rico sabor para un excelente día",
    "phone": "3141606339",
    "whatsapp": "5213141606339",
    "hours": {
      "label": "7:30 a.m. a 1:30 p.m.",
      "days": "Lunes a sábado",
      "opens": "07:30",
      "closes": "13:30",
      "weekdays": [1, 2, 3, 4, 5, 6]
    },
    "location": {
      "city": "Colima",
      "region": "Colima",
      "country": "México",
      "addressConfirmed": false,
      "street": "",
      "label": "3PQC+632, Manzanillo, Colima, México",
      "lat": 19.2433,
      "lng": -103.725
    },
    "payment": "Pago presencial al recoger o al entregar el pedido.",
    "socials": {
      "facebook": "https://www.facebook.com/",
      "instagram": "https://www.instagram.com/",
      "tiktok": "https://www.tiktok.com/"
    }
  }'::jsonb)
on conflict (key) do nothing;

insert into public.site_sections (id, kind, content, sort_order) values
  ('hero', 'hero', '{
    "headline": "Vargas Tacos",
    "imageDesktop": "/hero.webp",
    "imageMobile": "/hero_cel.webp",
    "imageAlt": "Tacos recién hechos sobre plancha, vapor y limón"
  }'::jsonb, 1),
  ('about', 'about', '{
    "headline": "Cómo nació Vargas Tacos",
    "paragraphs": [
      "Vargas nace en las mañanas de Colima: una plancha, tortillas que echan humo y el ritmo de un mostrador de barrio, no de restaurante con mesas. Abrimos temprano, cerramos a la 1:30 p.m. y nos quedamos en lo que sabemos hacer.",
      "La especialidad de la casa es el camarón capeado. Junto a él, arrachera, adobada, barbacoa y aguas frescas que se piden por el nombre. El menú impreso es la verdad del local.",
      "No somos un comedor de reserva. Eres vecino, de paso o con antojo. Encargas, pasas o te lo llevamos, y pagas en persona."
    ],
    "values": [
      {"title": "Sabor de plancha", "body": "Camarón capeado, pescado, arrachera y los clásicos de cerdo. Cada taco se arma al momento."},
      {"title": "Horario de mañana", "body": "De 7:30 a.m. a 1:30 p.m., lunes a sábado. El antojo es de desayuno y comida, no de madrugada."},
      {"title": "Trato de barrio", "body": "Pedidos por WhatsApp, pago presencial y seguimiento claro. Sin filas digitales ni cobros en línea."}
    ],
    "image": "/about.jpg"
  }'::jsonb, 2),
  ('kitchen', 'kitchen', '{
    "headline": "Manos en la plancha",
    "lede": "Tres elaboradoras, tres estaciones. El mismo vapor de las 7:30 y el taco que sale todavía caliente.",
    "people": [
      {"name": "Marisol Cuevas", "role": "Elaboradora de mariscos", "station": "Camarón capeado y pescado empanizado. La especialidad de la casa sale de su estación.", "image": "/products/camaron.jpg", "imageAlt": "Taco de camarón capeado, estación de mariscos"},
      {"name": "Itzel Navarro", "role": "Elaboradora de carnes", "station": "Arrachera, barbacoa, adobada y carnitas. El taco que se pide con hambre de verdad.", "image": "/gallery/plancha.jpg", "imageAlt": "Plancha con tacos de carne"},
      {"name": "Paola Mendoza", "role": "Elaboradora de la mañana", "station": "Huevo a la mexicana y chicharrón prensado. El primer taco del día.", "image": "/products/huevo.jpg", "imageAlt": "Taco de huevo a la mexicana, estación de mañana"}
    ]
  }'::jsonb, 3),
  ('gallery', 'gallery', '{
    "headline": "El primer bocado",
    "bandImage": "/about.jpg",
    "shots": [
      {"src": "/gallery/plancha.jpg", "alt": "Tacos en la plancha, fotografía de referencia", "className": "md:col-start-1 md:row-start-1 md:row-span-2"},
      {"src": "/products/camaron.jpg", "alt": "Taco de camarón capeado", "className": "md:col-start-2 md:col-span-2 md:row-start-1"},
      {"src": "/products/barbacoa.jpg", "alt": "Taco de barbacoa", "className": "md:col-start-2 md:row-start-2"},
      {"src": "/products/bistec.jpg", "alt": "Taco de bistec de arrachera", "className": "md:col-start-3 md:row-start-2"},
      {"src": "/products/adobada.jpg", "alt": "Taco de adobada de cerdo", "className": "md:col-start-1 md:row-start-3"},
      {"src": "/about.jpg", "alt": "Tacos al vapor, fotografía de referencia", "className": "md:col-start-2 md:col-span-2 md:row-start-3"}
    ]
  }'::jsonb, 4)
on conflict (id) do nothing;
