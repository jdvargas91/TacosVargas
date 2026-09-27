-- Fix mojibake in site CMS seeds (UTF-8 misread as Latin-1 when APPLY_ALL was generated)

update public.site_sections
set
  content = '{
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
  }'::jsonb,
  updated_at = now()
where id = 'about';

update public.site_sections
set
  content = '{
    "headline": "Manos en la plancha",
    "lede": "Tres elaboradoras, tres estaciones. El mismo vapor de las 7:30 y el taco que sale todavía caliente.",
    "people": [
      {"name": "Marisol Cuevas", "role": "Elaboradora de mariscos", "station": "Camarón capeado y pescado empanizado. La especialidad de la casa sale de su estación.", "image": "/products/camaron.jpg", "imageAlt": "Taco de camarón capeado, estación de mariscos"},
      {"name": "Itzel Navarro", "role": "Elaboradora de carnes", "station": "Arrachera, barbacoa, adobada y carnitas. El taco que se pide con hambre de verdad.", "image": "/gallery/plancha.jpg", "imageAlt": "Plancha con tacos de carne"},
      {"name": "Paola Mendoza", "role": "Elaboradora de la mañana", "station": "Huevo a la mexicana y chicharrón prensado. El primer taco del día.", "image": "/products/huevo.jpg", "imageAlt": "Taco de huevo a la mexicana, estación de mañana"}
    ]
  }'::jsonb,
  updated_at = now()
where id = 'kitchen';

update public.site_sections
set
  content = jsonb_set(
    content,
    '{imageAlt}',
    '"Tacos recién hechos sobre plancha, vapor y limón"'::jsonb
  ),
  updated_at = now()
where id = 'hero';

update public.site_settings
set
  value = jsonb_set(
    jsonb_set(
      value,
      '{slogan}',
      '"Un rico sabor para un excelente día"'::jsonb
    ),
    '{payment}',
    '"Pago presencial al recoger o al entregar el pedido."'::jsonb
  ),
  updated_at = now()
where key = 'business';
