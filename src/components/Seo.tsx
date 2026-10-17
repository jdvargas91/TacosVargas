import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "@/context/SiteContentContext";
import { SITE_LOCALE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

type SeoProps = {
  title: string;
  description: string;
  /** Marca la página como no indexable (páginas privadas/operativas). */
  noindex?: boolean;
  /** Ruta canónica. Si se omite, se usa la ruta actual. */
  path?: string;
  /** Imagen para Open Graph / Twitter (ruta o URL). Si se omite, usa el hero. */
  image?: string;
  /** Tipo de Open Graph (website | article | product…). */
  type?: string;
  /** Nodos extra de datos estructurados (JSON-LD) a añadir, p. ej. Product o BreadcrumbList. */
  structuredData?: Array<Record<string, unknown>>;
};

export function Seo({
  title,
  description,
  noindex = false,
  path,
  image,
  type = "website",
  structuredData = [],
}: SeoProps) {
  const { business, hero } = useSiteContent();
  const location = useLocation();

  const canonicalPath = path ?? location.pathname;
  const canonicalUrl = absoluteUrl(canonicalPath);
  const imageUrl = absoluteUrl(image || hero.imageDesktop || "/hero.webp");
  const postalCode = business.location.label.match(/\b\d{5}\b/)?.[0] ?? "28219";

  // Solo incluimos redes sociales con un perfil real (no la URL raíz placeholder).
  const sameAs = [business.socials.facebook, business.socials.instagram, business.socials.tiktok].filter(
    (url) => {
      if (!url) return false;
      try {
        return new URL(url).pathname.replace(/\/+$/, "").length > 0;
      } catch {
        return false;
      }
    },
  );

  // Datos estructurados del negocio (solo en páginas indexables).
  const restaurantLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: business.name,
    description,
    url: SITE_URL,
    image: imageUrl,
    telephone: `+${business.whatsapp}`,
    priceRange: "$",
    servesCuisine: ["Mexicana", "Tacos", "Mariscos", "Desayunos"],
    acceptsReservations: false,
    hasMenu: `${SITE_URL}/#menu`,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.location.street,
      addressLocality: business.location.city,
      addressRegion: business.location.region,
      postalCode,
      addressCountry: "MX",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.location.lat,
      longitude: business.location.lng,
    },
    hasMap: business.location.mapsUrl,
    areaServed: {
      "@type": "City",
      name: business.location.city,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: business.hours.opens,
        closes: business.hours.closes,
      },
    ],
    sameAs,
  };

  const jsonLdNodes = noindex ? structuredData : [restaurantLd, ...structuredData];

  return (
    <Helmet>
      <html lang="es-MX" />
      <title>{title}</title>
      <meta name="description" content={description} />
      {!noindex ? <link rel="canonical" href={canonicalUrl} /> : null}
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : <meta name="robots" content="index,follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={SITE_LOCALE} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLdNodes.map((node, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(node)}
        </script>
      ))}
    </Helmet>
  );
}
