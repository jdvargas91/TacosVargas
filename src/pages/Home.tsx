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
import { Seo } from "@/components/Seo";
import { useProducts } from "@/context/ProductsContext";
import { business } from "@/data/business";

const LocationMap = lazy(() =>
  import("@/components/LocationMap").then((module) => ({ default: module.LocationMap })),
);

export function Home() {
  const { products } = useProducts();
  const tacos = products.filter((product) => product.kind === "taco");
  const drinks = products.filter((product) => product.kind === "drink");

  return (
    <>
      <Seo
        title={`${business.name} · tacos y aguas en Colima`}
        description="Tacos Vargas: camarón capeado, arrachera, barbacoa y aguas frescas. Pedidos por WhatsApp, pago presencial. Lunes a sábado de 7:30 a.m. a 1:30 p.m."
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
    </>
  );
}
