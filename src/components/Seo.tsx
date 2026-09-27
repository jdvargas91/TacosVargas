import { Helmet } from "react-helmet-async";
import { useSiteContent } from "@/context/SiteContentContext";

export function Seo({
  title,
  description,
  noindex = false,
}: {
  title: string;
  description: string;
  noindex?: boolean;
}) {
  const { business, hero } = useSiteContent();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: business.name,
    description,
    telephone: `+${business.whatsapp}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: business.location.city,
      addressRegion: business.location.region,
      addressCountry: "MX",
    },
    openingHours: `Mo-Sa ${business.hours.opens}-${business.hours.closes}`,
    servesCuisine: "Mexican",
    acceptsReservations: "False",
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={hero.imageDesktop} />
      <meta name="twitter:card" content="summary_large_image" />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
