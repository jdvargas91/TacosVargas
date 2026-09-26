# Design

Portada promocional de Vargas Tacos sobre papel crema. Titulares Fugaz One (cartel, no serif de revista). Cuerpo Nunito Sans. Acento `#F0734F` en barras; botones chile `#C4452A` con letra crema para contraste. Oro para la especialidad.

## Tokens

- paper `#FFF8F0`
- ink `#1E1710`
- clay `#5C3A32`
- terracotta `#F0734F`
- ember `#B5442C`
- btn `#C4452A`
- gold `#FFC72C`
- smoke `#FFFFFF`

## Type

Fugaz One en H1 y títulos de sección. Nombres de producto y precios en Nunito Sans. Precios: `$26 MXN`.

## Motion

Ken Burns en el hero. Paralaje real en la banda de galería (capa de foto más alta que el recorte, `will-change`, overlay en degradado; mosaico estático). Zoom 1.06 en foto de tarjeta al hover. Botón principal: elevación y escala. `prefers-reduced-motion` apaga el movimiento.

Header transparente sobre el hero; al hacer scroll (o fuera de `/`) toma `paper`. En el top de `/` el logo del header se oculta para no duplicar el wordmark del hero; reaparece al hacer scroll o al abrir el menú. En teléfono el menú es un panel de 85% de ancho y alto completo; el 15% visible de la página queda con blur. Logo recortado al wordmark, `object-contain`.

Hero: wordmark dentro de la foto. En teléfono se usa `hero_cel.webp` a pantalla completa; en escritorio `hero.webp`. H1 solo para lectores de pantalla. Un CTA chile y Ver menú en ghost. Cocina: estaciones en bandas editoriales alternadas sobre carbon, no tarjetas de producto. Galería: “El primer bocado” (solo tacos). Tacos y bebidas en carrusel con flechas siempre bajo el título, a la derecha. Botón fijo para volver arriba con scroll easing.

## Superficies

- `/` pública
- `/producto/:id` ficha
- `/pedido` pedido (vaciar en un clic)
- `/mis-pedidos` seguimiento
- `/admin` mostrador

## Finish

Ajustes de Home: titular de marketing, Fugaz One, iconos, MXN, hover de imagen, CTA y reseñas.
