# Requisitos SEO — Vargas Tacos

> **Documento de especificación** elaborado por el Consejo de Expertos en SEO.
> Define lo que **cada página debe cumplir** (títulos, metadatos, encabezados, datos estructurados y elementos técnicos) para que el sitio sea profesional y Google pueda encontrarlo, entenderlo y posicionarlo.
>
> **Estado:** Borrador para revisión en una sesión posterior.
> **Alcance:** Requisitos (el "qué" y el "por qué"). La implementación (el "cómo") se abordará después.
> **Última actualización:** 2026-10-17

> ### 🎯 Alcance del trabajo SEO: SOLO la página pública
>
> El esfuerzo de SEO se aplica **únicamente a la parte pública del sitio** — la que queremos que Google, los clientes y los asistentes de IA encuentren con facilidad:
>
> - ✅ **Dentro de alcance:** Inicio (`/`), páginas de producto (`/producto/:id`) y las legales (`/terminos`, `/privacidad`).
> - ❌ **Fuera de alcance:** el **sistema de administración** (`/sistema`, `/admin`) y el **perfil / área del cliente** (`/cuenta`, `/mis-pedidos`, `/login`, `/pedido`). Estas páginas **no se optimizan para búsqueda**; solo deben estar **bloqueadas** (`noindex` + `Disallow`) para que nunca aparezcan en Google. Ver sección 4.5.
>
> ### 📍 Naturaleza del negocio: 100% local, sin sucursales ni envíos
>
> Vargas Tacos **existe solo de forma local** en Manzanillo, Colima: **no tiene sucursales** y **no vende ni envía a otras regiones**. Toda la estrategia se enfoca en que lo encuentre quien está **en Manzanillo o cerca** y puede **recoger en el local**. Esto condiciona palabras clave, contenido y datos estructurados (ver sección 10).

---

## 0. Cómo leer este documento

- Cada requisito tiene una prioridad:
  - **[P0]** Crítico — sin esto, la página no indexa bien o pierde posicionamiento.
  - **[P1]** Importante — impacto directo en ranking, CTR o experiencia.
  - **[P2]** Recomendado — pulido profesional y mejora incremental.
- Los requisitos marcados con **(⚠ gap actual)** señalan algo que hoy **no se cumple** en el código revisado y debe corregirse.
- Los textos de ejemplo (títulos, descripciones) son **propuestas base**; se afinarán en la revisión.

---

## 1. El Consejo de Expertos

Este documento reúne el criterio de cinco perfiles. Cada sección lleva la voz del especialista responsable.

| Rol | Responsable de |
| --- | --- |
| **SEO Técnico** | Indexación, rendering (SPA), canonical, sitemap, robots, rastreo, Core Web Vitals. |
| **SEO On-Page / Contenido** | Títulos, meta descriptions, encabezados (H1–H3), copy, palabras clave, enlazado interno. |
| **SEO Local** | NAP, Google Business Profile, datos estructurados locales, reseñas, geolocalización. |
| **Datos Estructurados (Schema.org)** | JSON-LD de negocio, menú, productos, breadcrumbs, FAQ. |
| **Accesibilidad & UX** | Semántica HTML, imágenes, foco, contraste, señales de calidad que Google valora. |

---

## 2. Contexto del negocio (fuente de verdad del NAP)

Todo el SEO local depende de que estos datos sean **idénticos** en el sitio, en Google Business Profile y en cualquier directorio.

- **Nombre comercial:** Vargas Tacos
- **Nombre alternativo / legal:** Tacos Vargas
- **Giro:** Taquería / desayunos — tacos de camarón capeado, arrachera, barbacoa, adobada y aguas frescas.
- **Eslogan:** "Un rico sabor para un excelente día"
- **Teléfono / WhatsApp:** +52 1 314 160 6339
- **Dirección:** México 98, Planta Peletizadora de Pemex, 28219 Manzanillo, Colima, México
- **Referencia:** Próximo a Crucero de Mina GOCSA
- **Coordenadas:** 19.0880892, -104.2798119
- **Horario:** Lunes a sábado, 7:30 a.m. a 1:30 p.m.
- **Idioma / locale:** `es-MX`
- **Modelo:** Pedido por WhatsApp, recoge en local, pago por transferencia.

> **[P0] Acción previa:** Definir y fijar el **dominio canónico de producción** (p. ej. `https://www.vargastacos.com`). Todo lo demás (canonical, sitemap, Open Graph, JSON-LD) depende de esta URL absoluta. **Hoy no está definido (⚠ gap actual).**

---

## 3. Requisitos globales (aplican a todo el sitio)

### 3.1 Rendering e indexación — SEO Técnico

- **[P0] (⚠ gap actual)** El sitio es una **SPA renderizada en el cliente** (Vite + React). Google puede renderizar JS, pero el contenido y los metadatos por ruta llegan tarde y de forma inconsistente. **Requisito:** servir HTML con contenido y metadatos ya presentes mediante **prerender/SSR** (p. ej. prerender estático de rutas públicas o SSR). Sin esto, los `<title>`/`description` por página y el JSON-LD pueden no ser vistos de forma fiable.
- **[P0]** Cada ruta pública debe devolver **HTTP 200**; la ruta 404 debe devolver **estado 404 real** (no 200 "soft 404").
- **[P1]** Una sola versión canónica del sitio: redirigir `http→https` y unificar `www`/no-`www` con **301**.

### 3.2 Metadatos obligatorios por página — On-Page

Cada página indexable debe declarar:

- **[P0] `<title>` único** — 50–60 caracteres, con marca al final: `Tema principal · Vargas Tacos`.
- **[P0] `<meta name="description">`** — 140–160 caracteres, con propuesta de valor y llamada a la acción; única por página.
- **[P0] `<link rel="canonical">`** con **URL absoluta** de la propia página. **Hoy el componente `Seo` no emite canonical (⚠ gap actual).**
- **[P0] `<meta name="robots">`** correcto: `index,follow` en páginas públicas; `noindex,nofollow` en privadas/operativas.
- **[P1] Open Graph completo:** `og:title`, `og:description`, `og:type`, `og:url` (⚠ falta hoy), `og:image` (absoluta, ≥1200×630), `og:site_name` (⚠ falta), `og:locale = es_MX` (⚠ falta).
- **[P1] Twitter Card:** `twitter:card = summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- **[P2] `<html lang="es-MX">`** (ya presente ✅).

### 3.3 Estructura semántica — On-Page / Accesibilidad

- **[P0]** Exactamente **un `<h1>` por página**, descriptivo y con la palabra clave principal.
- **[P1]** Jerarquía correcta de encabezados (`h1 → h2 → h3`), sin saltos.
- **[P1]** Un único `<main>` con landmark (ya se usa `id="contenido"` ✅); usar `<header>`, `<nav>`, `<section>`, `<footer>`.
- **[P1]** Enlace interno con texto descriptivo (no "clic aquí"); evitar enlaces solo-ícono sin `aria-label`.

### 3.4 Imágenes — On-Page / Accesibilidad / Rendimiento

- **[P0]** Toda imagen de contenido con **`alt` descriptivo** (los productos deben describir el platillo).
- **[P1]** Formatos modernos (WebP, ya en uso ✅), con `width`/`height` para evitar CLS.
- **[P1]** `loading="lazy"` en imágenes bajo el pliegue; la imagen del hero como **LCP** debe precargarse (`fetchpriority="high"`), no lazy.

### 3.5 Rendimiento (Core Web Vitals) — Técnico

- **[P1]** Objetivos en móvil: **LCP < 2.5 s**, **INP < 200 ms**, **CLS < 0.1**.
- **[P1]** Precargar fuentes críticas y usar `font-display: swap` (ya en uso ✅).
- **[P2]** Comprimir y dimensionar imágenes a su tamaño real de render; servir responsive (`srcset`).

### 3.6 Rastreo: robots.txt y sitemap.xml — Técnico

- **[P0] (⚠ gap actual)** `robots.txt` y `sitemap.xml` usan **rutas relativas**. **Requisito:** usar **URLs absolutas** con el dominio de producción.
  - `Sitemap:` debe apuntar a la URL absoluta (`https://dominio/sitemap.xml`).
  - Cada `<loc>` del sitemap debe ser una URL absoluta.
- **[P0] (⚠ gap actual)** El sitemap **no incluye las páginas de producto** (`/producto/:id`). **Requisito:** incluir todas las URLs indexables, incluidas las de producto activas.
- **[P1]** Mantener en `robots.txt` el `Disallow` de rutas privadas (`/pedido`, `/mis-pedidos`, `/sistema`, `/admin`, `/login`, `/cuenta`).
- **[P1]** Cada URL del sitemap con `<lastmod>` fiable; `changefreq`/`priority` coherentes.

### 3.7 Datos estructurados (JSON-LD) — Schema.org

- **[P0]** JSON-LD global de **`Restaurant`/`FoodEstablishment`** con: `name`, `url`, `image` (absoluta), `telephone`, `address` **completa** (incluir `streetAddress` y `postalCode` — ⚠ hoy faltan), `geo` (lat/lng), `openingHoursSpecification`, `servesCuisine`, `priceRange`, `acceptsReservations`, `hasMenu`.
- **[P1]** `BreadcrumbList` en páginas internas (producto, legales).
- **[P1]** `Product`/`MenuItem` con `Offer` (precio, moneda `MXN`, disponibilidad) en páginas de producto.
- **[P2]** `AggregateRating`/`Review` solo si las reseñas son reales y verificables.
- **[P0]** Validar todo con **Rich Results Test** / Search Console sin errores.

### 3.8 Google Business Profile y SEO local — SEO Local

- **[P0]** Crear/reclamar la ficha de **Google Business Profile** con NAP idéntico al sitio.
- **[P1]** Categoría principal "Taquería" / "Restaurante de desayunos"; fotos reales, horario, enlace al sitio y a WhatsApp.
- **[P1]** Coherencia NAP en cualquier directorio (citations).
- **[P2]** Estrategia de reseñas reales de clientes.

---

## 4. Requisitos por página

> Leyenda de indexación: **PÚBLICA** (index,follow) · **PRIVADA** (noindex,nofollow).

### 4.1 Home — `/` · **PÚBLICA** · [P0]

| Elemento | Requisito |
| --- | --- |
| **Título** | `Vargas Tacos · Tacos y aguas frescas en Manzanillo, Colima` (≤60 car.). Debe incluir ciudad. |
| **Description** | Propuesta de valor + especialidad + horario + CTA. Ej.: `Taquería en Manzanillo: camarón capeado, arrachera, barbacoa y aguas frescas. Pide por WhatsApp. Lun–Sáb 7:30 a.m.–1:30 p.m.` |
| **H1** | Uno solo, con marca + intención local (p. ej. "Vargas Tacos — tacos de camarón capeado en Manzanillo"). Revisar que el Hero aporte un H1 real de texto. |
| **H2/H3** | Secciones: Nosotros, Menú, Equipo, Galería, Reseñas, Ubicación — cada una con su encabezado. |
| **Canonical** | URL raíz absoluta. |
| **OG/Twitter** | `og:image` del hero en absoluto, ≥1200×630. |
| **JSON-LD** | `Restaurant` completo (sección 3.7) + `hasMenu`. |
| **Local** | Dirección, horario, mapa y teléfono visibles y en texto (no solo imagen). |
| **Rendimiento** | Hero = LCP: precargar, no lazy. Menú y mapa bajo demanda (ya lazy ✅). |

### 4.2 Detalle de producto — `/producto/:id` · **PÚBLICA** · [P0]

| Elemento | Requisito |
| --- | --- |
| **Título** | `{Nombre del producto} · Vargas Tacos` (ej.: `Taco de camarón capeado · Vargas Tacos`). |
| **Description** | Descripción del producto única (usar `product.description`), con antojo + ciudad si cabe. |
| **H1** | El nombre del producto. |
| **Canonical** | URL absoluta del producto; una sola URL por producto (evitar duplicados por parámetros). |
| **OG image** | La imagen del producto (absoluta). |
| **JSON-LD** | `Product`/`MenuItem` + `Offer` (`price`, `priceCurrency: MXN`, `availability` según `soldOut`/`stock`). |
| **Breadcrumb** | `Inicio › Menú › {Producto}` con `BreadcrumbList`. |
| **Imagen** | `alt` descriptivo del platillo; `width`/`height`. |
| **Producto inexistente** | Si el id no existe: `noindex` (ya ✅) y, de preferencia, estado 404. |
| **Sitemap** | Incluir todas las URLs de producto activas (⚠ hoy ausentes). |

### 4.3 Términos — `/terminos` · **PÚBLICA** · [P1]

| Elemento | Requisito |
| --- | --- |
| **Título** | `Términos y condiciones · Vargas Tacos`. |
| **Description** | Breve y única (ej.: "Términos y condiciones de uso y pedidos de Vargas Tacos."). |
| **H1** | "Términos y condiciones". |
| **Canonical** | URL absoluta. |
| **Robots** | `index,follow`. |
| **Sitemap** | Incluida (ya ✅). Usar `<loc>` absoluta. |

### 4.4 Privacidad — `/privacidad` · **PÚBLICA** · [P1]

| Elemento | Requisito |
| --- | --- |
| **Título** | `Aviso de privacidad · Vargas Tacos`. |
| **Description** | Breve y única. |
| **H1** | "Aviso de privacidad". |
| **Canonical** | URL absoluta. |
| **Robots** | `index,follow`. |
| **Sitemap** | Incluida (ya ✅). Usar `<loc>` absoluta. |

### 4.5 Páginas FUERA de alcance SEO (administración y cliente) · [P0]

Estas rutas **no se optimizan** para búsqueda porque son operativas o privadas. El **único** requisito SEO es **asegurar que Google nunca las indexe**:

| Ruta | Qué es | Requisito |
| --- | --- | --- |
| `/pedido`, `/pedir` | Flujo de pedido | `noindex,nofollow` (ya ✅) + `Disallow` (ya ✅). `/pedir → /pedido` con 301 en servidor. |
| `/mis-pedidos` | Pedidos del cliente | `noindex,nofollow` (ya ✅) + `Disallow` (ya ✅). Contenido personal: nunca indexar. |
| `/cuenta` | Perfil del cliente | `noindex,nofollow` (ya ✅) + añadir `Disallow` (⚠ hoy falta). |
| `/login` | Acceso | `noindex,nofollow` (ya ✅) + añadir `Disallow` (⚠ hoy falta). |
| `/sistema`, `/sistema/:seccion`, `/admin` | Panel de administración | `noindex,nofollow` (ya ✅) + añadir `Disallow` de `/sistema` (⚠ hoy solo `/admin`). `/admin → /sistema` 301 en servidor. |

> No se les define título optimizado, description de marketing, canonical para ranking, datos estructurados ni entran al sitemap. Solo deben quedar **invisibles** para buscadores y asistentes de IA.

### 4.6 Página no encontrada — `*` (404) · [P0]

| Elemento | Requisito |
| --- | --- |
| **Robots** | `noindex,nofollow` (ya ✅). |
| **Estado HTTP** | **404 real** (⚠ hoy una SPA suele devolver 200 "soft 404"). |
| **UX** | H1 claro + enlace de regreso a Inicio y al Menú (enlazado interno de recuperación). |

---

## 5. Matriz resumen de indexación

| Ruta | Indexar | En sitemap | En robots Disallow |
| --- | --- | --- | --- |
| `/` | ✅ index | ✅ | — |
| `/producto/:id` | ✅ index | ✅ (⚠ añadir) | — |
| `/terminos` | ✅ index | ✅ | — |
| `/privacidad` | ✅ index | ✅ | — |
| `/pedido`, `/pedir` | ❌ noindex | ❌ | ✅ |
| `/mis-pedidos` | ❌ noindex | ❌ | ✅ |
| `/cuenta` | ❌ noindex | ❌ | ✅ (⚠ añadir) |
| `/login` | ❌ noindex | ❌ | ✅ (⚠ añadir) |
| `/sistema`, `/sistema/:seccion`, `/admin` | ❌ noindex | ❌ | ✅ (⚠ añadir `/sistema`) |
| `*` (404) | ❌ noindex | ❌ | — |

---

## 6. Brechas detectadas hoy (para corregir en la sesión de implementación)

Priorizadas para la revisión posterior:

1. **[P0]** Definir **dominio de producción** y hacer absolutas todas las URLs (canonical, OG, sitemap, JSON-LD).
2. **[P0]** SPA sin prerender/SSR: los metadatos por ruta y el JSON-LD no se sirven en el HTML inicial. Evaluar **prerender de rutas públicas**.
3. **[P0]** El componente `Seo` **no emite `<link rel="canonical">`** ni `og:url`, `og:site_name`, `og:locale`.
4. **[P0]** `sitemap.xml` con `<loc>` **relativos** y **sin páginas de producto**.
5. **[P0]** `robots.txt` con `Sitemap:` **relativo** y sin `Disallow` de `/sistema`, `/login`, `/cuenta`.
6. **[P0]** **JSON-LD incompleto**: faltan `streetAddress`, `postalCode`, `geo`, `openingHoursSpecification`, `url`, `image` absoluta, `priceRange`, `hasMenu`.
7. **[P0]** 404 probablemente **soft 404** (devuelve 200).
8. **[P1]** `og:image` relativa; debe ser absoluta y ≥1200×630.
9. **[P1]** Confirmar **un solo `<h1>`** real de texto por página (revisar Hero).
10. **[P1]** Datos estructurados de **producto** (`Product`/`Offer`) y **breadcrumbs** inexistentes.
11. **[P1]** Crear/verificar **Google Business Profile** con NAP idéntico.

---

## 7. Checklist de aceptación (para auditoría final)

### Global
- [ ] Dominio canónico definido; 301 http→https y www unificado.
- [ ] Prerender/SSR sirviendo contenido + metadatos en el HTML inicial.
- [ ] `robots.txt` con Sitemap absoluto y todos los Disallow privados.
- [ ] `sitemap.xml` con `<loc>` absolutos, incluyendo productos, con `<lastmod>`.
- [ ] JSON-LD `Restaurant` completo validado sin errores.
- [ ] Core Web Vitals en verde (móvil): LCP, INP, CLS.
- [ ] Google Business Profile publicado con NAP consistente.
- [ ] Search Console configurado y sitemap enviado.

### Por página pública (`/`, `/producto/:id`, `/terminos`, `/privacidad`)
- [ ] `<title>` único (50–60 car.) con marca.
- [ ] `description` única (140–160 car.).
- [ ] `canonical` absoluto correcto.
- [ ] `robots = index,follow`.
- [ ] Un solo `<h1>` descriptivo; jerarquía H2/H3 correcta.
- [ ] OG completo (`url`, `image` absoluta ≥1200×630, `site_name`, `locale`) + Twitter Card.
- [ ] Imágenes con `alt`, `width`/`height`, lazy salvo LCP.
- [ ] JSON-LD correspondiente (Restaurant / Product+Offer / Breadcrumb).

### Por página privada
- [ ] `robots = noindex,nofollow`.
- [ ] Incluida en `Disallow` del robots.txt.
- [ ] No presente en el sitemap.

---

## 8. Investigación de palabras clave: cómo busca la gente una taquería

> Objetivo: descubrir las **frases reales** que escribe (o dice) una persona en Manzanillo cuando quiere tacos, para usarlas en títulos, descripciones, encabezados y contenido. No inventamos palabras: observamos cómo busca la gente.
>
> 📄 **Entregable ya preparado:** la hoja de palabras clave vive en [`SEO-PALABRAS-CLAVE.md`](./SEO-PALABRAS-CLAVE.md).

### 8.1 Tipos de búsqueda a cubrir

Una persona que busca tacos suele escribir de 4 formas. Debemos cubrir las cuatro:

1. **Por antojo + lugar:** "tacos de camarón en Manzanillo", "tacos cerca de mí", "desayunos en Manzanillo".
2. **Por "mejor" / recomendación:** "mejor taquería de Manzanillo", "dónde comer tacos en Manzanillo", "tacos buenos cerca".
3. **Por producto específico:** "taco de camarón capeado", "tacos de arrachera", "aguas frescas Manzanillo".
4. **Por intención práctica:** "taquería abierta ahora", "taquería que abra temprano", "desayunos para llevar Manzanillo".

### 8.2 Métodos gratuitos para investigar (recomendado empezar aquí)

- **Autocompletar de Google:** escribe "tacos manzanillo", "tacos de camaron…", "mejor taqueria…" y anota todas las sugerencias que aparecen. Son búsquedas reales y frecuentes.
- **"Búsquedas relacionadas"** (pie de la página de resultados) y el bloque **"Las personas también preguntan"** → de ahí salen preguntas para FAQ.
- **Google Maps:** busca "taquería Manzanillo" y observa cómo se nombran los competidores, qué categorías usan y qué dicen las reseñas (palabras que repiten los clientes = palabras que debemos usar).
- **Reseñas de competidores:** las frases que la gente escribe en reseñas ("los mejores tacos de camarón", "buen desayuno") son oro para el contenido.
- **TikTok / Instagram / Facebook:** busca hashtags y texto como "tacos manzanillo"; mira qué términos usan los locales.
- **Google Trends** (comparar términos y ver estacionalidad en la región de Colima).

### 8.3 Herramientas (opcionales, para profundizar)

- Gratuitas/freemium: **Google Keyword Planner** (requiere cuenta de Google Ads), **Ubersuggest**, **AnswerThePublic**, **Keyword Surfer** (extensión).
- De pago: Semrush, Ahrefs (útiles para ver volumen y competencia, pero no imprescindibles para empezar).

### 8.4 Qué hacer con las frases encontradas (entregable)

Construir una **hoja de palabras clave** sencilla con estas columnas:

| Frase | Tipo (antojo/mejor/producto/práctica) | ¿Local? | Dónde la usamos |
| --- | --- | --- | --- |
| tacos de camarón en Manzanillo | antojo+lugar | sí | Home title/H1 |
| mejor taquería de Manzanillo | mejor | sí | Home description + contenido |
| taco de camarón capeado | producto | sí | Página de producto |
| desayunos en Manzanillo | práctica | sí | Home H2 / contenido |

> **[P1] Regla de oro local:** casi todas las frases deben llevar o implicar **"Manzanillo"** (o colonias/zonas cercanas). No perseguimos "tacos" a secas (nacional e imposible), sino "tacos en Manzanillo" (local y ganable).

### 8.5 Mantenimiento (seguimiento mensual)

El SEO local no es una sola vez. Como indica la estrategia, requiere **investigación periódica y seguimiento mensual**:

- Revisar **una vez al mes** posiciones frente a competidores de la zona.
- Actualizar contenido y la ficha con términos nuevos que surjan.
- Vigilar reseñas nuevas (propias y de competencia) por vocabulario emergente.

---

## 9. Optimización para IA generativa (ChatGPT, Gemini, etc.)

> Objetivo: que cuando alguien le pida a ChatGPT o Gemini *"tacos de camarón en Manzanillo"* o *"la mejor taquería de Manzanillo"*, el asistente **pueda mencionar y recomendar Vargas Tacos**. Esto se conoce como **GEO/AEO** (optimización para motores generativos y para respuestas). No se compra ni se garantiza: se **gana** siendo una fuente clara, consistente y citable.

### 9.1 Cómo "ven" los asistentes a un negocio

Los asistentes de IA responden combinando (a) lo que aprendieron de la web y (b) búsquedas en vivo. Recomiendan negocios cuando encuentran **información consistente y bien estructurada en varias fuentes confiables**. Por eso, la mejor forma de aparecer es tener una **presencia local sólida y coherente**.

### 9.2 Requisitos para ser recomendado por IA

- **[P0] Presencia verificable y consistente (NAP):** mismo Nombre, Dirección y Teléfono en el sitio, **Google Business Profile**, Facebook/Instagram y directorios. La IA confía en lo que se repite igual en varios lados.
- **[P0] Google Business Profile completo y activo:** categoría correcta, horario, fotos, atributos ("para llevar", "desayunos"), reseñas respondidas. Es la fuente local más usada por sistemas de IA y mapas.
- **[P0] Datos estructurados (JSON-LD) en el sitio:** `Restaurant` + `Menu`/`MenuItem` + `geo` + horario. Dan a la IA datos legibles por máquina (qué vendes, dónde, cuándo abres, a qué precio).
- **[P1] Contenido que responde preguntas en lenguaje natural:** una sección o FAQ que conteste de forma directa:
  - "¿Dónde comer tacos de camarón en Manzanillo?"
  - "¿Cuál es la especialidad de Vargas Tacos?"
  - "¿A qué hora abre / dónde está?"
  - Respuestas cortas y claras = fáciles de citar por un asistente.
- **[P1] Texto real, no solo imágenes:** precios, platillos, dirección y horario deben estar en **texto** (no incrustados en una foto). La IA no lee bien lo que está dentro de una imagen.
- **[P1] Menciones y reseñas externas:** aparecer en Google Maps, TripAdvisor local, directorios de Manzanillo, y que clientes hablen del negocio. Cuantas más fuentes coherentes, más probable que la IA lo recomiende.
- **[P2] Permitir el rastreo de bots de IA:** no bloquear en `robots.txt` a los rastreadores de IA (p. ej. `GPTBot`, `Google-Extended`, `OAI-SearchBot`, `PerplexityBot`) **para las páginas públicas**, si se desea ser citable. Mantener bloqueadas solo las privadas.
- **[P2] FAQ con datos estructurados (`FAQPage`)** para reforzar las preguntas/respuestas anteriores.

### 9.3 Qué NO hace que te recomiende la IA

- Rellenar la página de palabras clave repetidas (penaliza y resta claridad).
- Información inconsistente entre el sitio y Google Business Profile (genera desconfianza).
- Poner los datos clave solo en imágenes o PDFs.

> **Resumen:** la receta para que ChatGPT/Gemini te sugieran es la **misma** que para el SEO local bien hecho — NAP consistente + Google Business Profile fuerte + datos estructurados + contenido claro en texto + buenas reseñas. Si eso está sólido, eres "citable".

---

## 10. Implicaciones de ser un negocio 100% local (sin sucursales ni envíos)

> Vargas Tacos solo existe en su local de Manzanillo. Esto **simplifica** y **enfoca** toda la estrategia.

### 10.1 Qué SÍ hacemos

- **[P0] Geolocalizar todo:** títulos, descripciones y contenido orientados a **Manzanillo, Colima** y zonas cercanas (colonias, referencia del Crucero de Mina GOCSA / Planta Peletizadora de Pemex).
- **[P0] Dejar clarísimo el modelo:** "**Recoges en el local**", pago por transferencia, horario de desayuno. Que nadie espere envío.
- **[P0] Datos estructurados locales:** `Restaurant` con **una sola** dirección (`address`), `geo` y `areaServed = Manzanillo`. **No** declarar múltiples ubicaciones.
- **[P1] Google Business Profile como pilar #1:** para un negocio solo local, la ficha pesa tanto o más que la web.
- **[P1] Contenido geolocalizado:** mencionar puntos de referencia, la zona y el contexto local ayuda a Google a asociarte a ese territorio.

### 10.2 Qué NO hacemos (evitar confusión y esfuerzo inútil)

- ❌ **No** perseguir palabras clave nacionales o de otras ciudades ("tacos en México", "tacos CDMX"): no aportan clientes reales y diluyen el enfoque.
- ❌ **No** crear páginas por ciudad/sucursal (no existen).
- ❌ **No** prometer ni mencionar "envío a domicilio" / "enviamos a toda la república": el modelo es **recoger en el local**.
- ❌ **No** declarar varias direcciones ni `areaServed` amplio en los datos estructurados.

### 10.3 Ventaja competitiva de ser local

- La competencia por "tacos en Manzanillo" es **mucho menor** que a nivel nacional → es **realista llegar al top** local.
- El coste/esfuerzo es **moderado y manejable**: no se necesita un equipo grande, pero sí dedicar tiempo a **actualizar contenido** y **monitorizar mensualmente** la posición frente a otros negocios de la zona (seguimiento recurrente, no una sola vez).

---

*Fin del documento. Pendiente de revisión y aprobación en la siguiente sesión.*
