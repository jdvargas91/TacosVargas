import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { KitchenCrew } from "@/components/KitchenCrew";
import { MenuSection } from "@/components/MenuSection";
import { Gallery } from "@/components/Gallery";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { MarqueeBand } from "@/components/MarqueeBand";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { useProducts } from "@/context/ProductsContext";
import { useSiteContent } from "@/context/SiteContentContext";

const LocationMap = lazy(() =>
  import("@/components/LocationMap").then((module) => ({ default: module.LocationMap })),
);

function WhenNear({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const hold = useRef<HTMLElement>(null);
  const [show, setShow] = useState(() =>
    typeof window !== "undefined" ? window.location.hash === `#${id}` : false,
  );

  useEffect(() => {
    if (show) return;
    const node = hold.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShow(true);
        observer.disconnect();
      },
      { rootMargin: "360px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [show]);

  if (show) return children;
  return <section ref={hold} id={id} className="h-[520px]" aria-label={label} />;
}

export function Home() {
  const { products } = useProducts();
  const { business } = useSiteContent();
  const tacos = products.filter((product) => product.kind === "taco");
  const drinks = products.filter((product) => product.kind === "drink");

  return (
    <>
      <Seo
        title={`${business.name} · Tacos de camarón y desayunos en ${business.location.city}`}
        description={`Taquería en ${business.location.city}, ${business.location.region}: camarón capeado, arrachera, barbacoa y aguas frescas. Recoge en el local. ${business.hours.days} de ${business.hours.label}.`}
        path="/"
      />
      <Header />
      <main id="contenido">
        <Hero />
        <Reveal>
          <MarqueeBand items={products.map((product) => product.name)} />
        </Reveal>
        <About />
        <MenuSection tacos={tacos} drinks={drinks} />
        <KitchenCrew />
        <Gallery />
        <ReviewsSection />
        <WhenNear id="ubicacion" label="Cargando mapa">
          <Suspense fallback={<section id="ubicacion" className="h-[520px]" aria-label="Cargando mapa" />}>
            <LocationMap />
          </Suspense>
        </WhenNear>
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
