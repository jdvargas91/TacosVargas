-- Fix review text mojibake

update public.reviews
set
  text = 'El camarón capeado se pide solo. Llegué a las 8 y todavía había cola, pero vale la espera.',
  updated_at = now()
where id = 'b1b1b1b1-0001-4000-8000-000000000001';

update public.reviews
set
  text = 'Barbacoa de desayuno y agua de jamaica. Horario de mañana, justo lo que buscaba.',
  updated_at = now()
where id = 'b1b1b1b1-0001-4000-8000-000000000002';

update public.reviews
set
  text = 'Buen bistec y el trato es de barrio. Falta que confirmen la dirección exacta en el mapa, pero el taco está.',
  updated_at = now()
where id = 'b1b1b1b1-0001-4000-8000-000000000003';
