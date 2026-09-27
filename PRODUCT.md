# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript + Tailwind CSS, React Router, Supabase (Auth Google, Postgres, Storage, RLS). Deploy en Netlify.

## Users

- **Cliente:** visita el sitio público, pide con Google, gestiona `/mis-pedidos`.
- **Vendedor:** entra por `/login` (invitado por admin), ve pedidos y registra en mostrador en `/sistema`.
- **Administrador:** todo lo del vendedor más equipo, CMS del sitio, productos/stock y reseñas.

## Product Purpose

Sitio + panel operativo de Vargas Tacos: menú con stock real, pedidos web y de mostrador, contenido editable sin redeploy, roles con invitaciones.

## Positioning

Taquería de mañana con especialidad de camarón capeado. Pago solo presencial. Sin pasarela en línea.

## Operating Context

Horario, teléfonos, redes y textos se configuran en `site_settings` / `site_sections` (fallback en `src/data/*`).

## Capabilities and Constraints

- Página pública sin login.
- Pedido web: Google al confirmar → RPC `place_order` + WhatsApp.
- Pedido mostrador: staff → RPC `place_counter_order`.
- Roles en `profiles` (nunca en `user_metadata`).
- Admin invita equipo por email (`team_invites`).
- CMS: negocio, hero, about, cocina, galería.
- Catálogo: CRUD + ajustes de stock auditados + reseñas en Postgres.
- Sin Stripe / Mercado Pago / multi-sucursal / inventario de insumos.

## Brand Commitments

Nombre: Vargas Tacos. Tema claro: papel crema `#FFF8F0`, tinta `#1E1710`, acento `#F0734F` / CTA `#C4452A`. Fugaz One + Nunito Sans.

## Product Principles

- Contenido y catálogo viven en Supabase; el código solo aporta fallback.
- Cliente pide sin fricción; el equipo opera en `/sistema` por rol.
- Pedido dual: WhatsApp para el mostrador, base de datos para el seguimiento.
