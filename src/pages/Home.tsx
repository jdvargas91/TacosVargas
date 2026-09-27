import { lazy, Suspense } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { KitchenCrew } from "@/components/KitchenCrew";
import { MenuSection } from "@/components/MenuSection";
import { Gallery } from "@/components/Gallery";
import { ReviewsSection } from "@/components/ReviewsSection";
import { PaymentNote } from "@/components/PaymentNote";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Seo } from "@/components/Seo";
import { useProducts } from "@/context/ProductsContext";
import { useSiteContent } from "@/context/SiteContentContext";

const LocationMap = lazy(() =>
  import("@/components/LocationMap").then((module) => ({ default: module.LocationMap })),
);

export function Home() {
  const { products } = useProducts();
  const { business } = useSiteContent();
  const tacos = products.filter((product) => product.kind === "taco");
  const drinks = products.filter((product) => product.kind === "drink");

  return (
    <>
      <Seo
        title={`${business.name} · tacos y aguas en ${business.location.city}`}
        description={`${business.name}: camarón capeado, arrachera, barbacoa y aguas frescas. Pedidos por WhatsApp, pago presencial. ${business.hours.days} de ${business.hours.label}.`}
      />
      <Header />
      <main id="contenido">
        <Hero />
        <About />
        <KitchenCrew />
        <MenuSection tacos={tacos} drinks={drinks} />
        <Gallery />
        <ReviewsSection />
        <PaymentNote />
        <Suspense fallback={<section id="ubicacion" className="h-[520px]" aria-label="Cargando mapa" />}>
          <LocationMap />
        </Suspense>
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
