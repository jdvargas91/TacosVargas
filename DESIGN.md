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

Header transparente sobre el hero; al hacer scroll (o fuera de `/`) toma `paper`. Logo recortado al wordmark, `object-contain` y `mix-blend-screen`.

Hero: “Un rico sabor” en una línea; “para un excelente día” como apoyo. Un CTA chile y Ver menú en ghost. Galería: “El primer bocado” (solo tacos). Tacos y bebidas en carrusel con flechas.

## Superficies

- `/` pública
- `/producto/:id` ficha
- `/pedido` pedido (vaciar en un clic)
- `/mis-pedidos` seguimiento
- `/admin` mostrador

## Finish

Ajustes de Home: titular de marketing, Fugaz One, iconos, MXN, hover de imagen, CTA y reseñas.
