-- Fix product text mojibake + fill long_description / ingredients / allergens / serving / weight

update public.products set
  name = 'Camarón capeado',
  description = 'Especialidad de la casa. Camarón capeado crujiente, salsa y limón.',
  long_description = 'El taco de la casa: camarón fresco capeado hasta quedar crocante, sobre tortilla de maíz caliente. Se sirve con salsa y limón. Pídelo de mañana, cuando la plancha está a tope.',
  ingredients = array['Tortilla de maíz','Camarón','Harina para capear','Aceite','Salsa de la casa','Limón','Cilantro'],
  allergens = array['Maíz','Puede contener rastros de soya'],
  serving = '1 taco',
  weight_grams = 110,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000001';

update public.products set
  name = 'Pescado empanizado',
  description = 'Filete empanizado, crujiente por fuera, con salsa y limón.',
  long_description = 'Filete empanizado al momento, crujiente por fuera y suave por dentro. Va en tortilla de maíz con salsa y un toque de limón. Buen compañero de un agua fresca.',
  ingredients = array['Tortilla de maíz','Filete de pescado','Empanizado','Aceite','Salsa','Limón'],
  allergens = array['Pescado','Gluten (empanizado)','Maíz'],
  serving = '1 taco',
  weight_grams = 115,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000002';

update public.products set
  name = 'Bistec de arrachera',
  description = 'Arrachera a la plancha, jugosa, con cilantro y cebolla.',
  long_description = 'Arrachera a la plancha, cortada para taco, con su jugo. Cilantro y cebolla al gusto. Es el taco de carne que se pide cuando hay hambre de verdad.',
  ingredients = array['Tortilla de maíz','Arrachera','Cilantro','Cebolla','Salsa','Limón'],
  allergens = array['Maíz','Puede contener rastros de soya'],
  serving = '1 taco',
  weight_grams = 120,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000003';

update public.products set
  name = 'Adobada de cerdo',
  description = 'Cerdo adobado, marinada roja y el picor que pide un agua fresca.',
  long_description = 'Cerdo en adobo rojo, marinada con chile y especias, a la plancha. El picor pide agua de jamaica o limón. Un clásico de mostrador.',
  ingredients = array['Tortilla de maíz','Cerdo','Adobo de chiles','Especias','Salsa'],
  allergens = array['Maíz','Puede contener rastros de soya'],
  serving = '1 taco',
  weight_grams = 105,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000004';

update public.products set
  name = 'Barbacoa',
  description = 'Barbacoa suave, para desayunar con salsa y un limón aplastado.',
  long_description = 'Barbacoa suave, de esas que se deshacen. Desayuno de lunes a sábado: salsa, cilantro y limón. Ideal con un café o un agua chica.',
  ingredients = array['Tortilla de maíz','Barbacoa de res','Cilantro','Cebolla','Salsa','Limón'],
  allergens = array['Maíz','Puede contener rastros de soya'],
  serving = '1 taco',
  weight_grams = 108,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000005';

update public.products set
  name = 'Chicharrón prensado',
  description = 'Chicharrón prensado, de los que se piden sin pensarlo dos veces.',
  long_description = 'Chicharrón prensado, con su grasa y su textura. Va en tortilla caliente. Si te gusta intenso, pide salsa roja.',
  ingredients = array['Tortilla de maíz','Chicharrón prensado','Salsa','Cilantro'],
  allergens = array['Maíz','Puede contener rastros de soya'],
  serving = '1 taco',
  weight_grams = 100,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000006';

update public.products set
  name = 'Carnitas de puerco',
  description = 'Carnitas doradas, con su grasa justa y salsa verde o roja.',
  long_description = 'Carnitas doradas, suaves por dentro. Un taco de confianza para la hora de la comida. Salsa verde o roja, como guste.',
  ingredients = array['Tortilla de maíz','Carnitas de puerco','Salsa','Cilantro','Cebolla'],
  allergens = array['Maíz','Puede contener rastros de soya'],
  serving = '1 taco',
  weight_grams = 112,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000007';

update public.products set
  name = 'Huevo a la mexicana',
  description = 'Huevo con jitomate, cebolla y chile. El taco de mañana por excelencia.',
  long_description = 'Huevo revuelto a la mexicana: jitomate, cebolla y chile. El taco con el que se abre el día en Vargas. Pide dos si vienes con hambre.',
  ingredients = array['Tortilla de maíz','Huevo','Jitomate','Cebolla','Chile','Salsa'],
  allergens = array['Huevo','Maíz'],
  serving = '1 taco',
  weight_grams = 95,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000008';

update public.products set
  name = 'Agua fresca chica',
  description = 'Jamaica, limón o piña. Escribe el sabor en las notas del pedido.',
  long_description = 'Agua fresca del día en tamaño chico: jamaica, limón o piña. Indica el sabor en las notas del pedido o por WhatsApp. Se sirve fría.',
  ingredients = array['Agua','Fruta o flor del día (jamaica, limón o piña)','Azúcar'],
  allergens = array['Puede contener azúcar'],
  serving = 'Vaso chico ~350 ml',
  weight_grams = 350,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000010';

update public.products set
  name = 'Agua fresca grande',
  description = 'La misma jarra de jamaica, limón o piña, en tamaño grande.',
  long_description = 'La misma agua fresca, en grande. Para acompañar varios tacos o para el calor. Elige jamaica, limón o piña en las notas.',
  ingredients = array['Agua','Fruta o flor del día (jamaica, limón o piña)','Azúcar'],
  allergens = array['Puede contener azúcar'],
  serving = 'Vaso grande ~600 ml',
  weight_grams = 600,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000011';

update public.products set
  name = 'Coca-Cola 500 ml',
  description = 'Envase de vidrio. Helada, para cortar el picor.',
  long_description = 'Coca-Cola en envase de vidrio de 500 ml. Helada. El clásico para cortar el picor de la adobada o el camarón.',
  ingredients = array['Refresco de cola'],
  allergens = array[]::text[],
  serving = 'Botella de vidrio 500 ml',
  weight_grams = 500,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000012';

update public.products set
  name = 'Coca-Cola 600 ml',
  description = 'Envase desechable de 600 ml.',
  long_description = 'Coca-Cola en envase desechable de 600 ml. Para llevar o para la mesa. Mismo sabor, un poco más de vaso.',
  ingredients = array['Refresco de cola'],
  allergens = array[]::text[],
  serving = 'Botella 600 ml',
  weight_grams = 600,
  updated_at = now()
where id = 'a1a1a1a1-0001-4000-8000-000000000013';
