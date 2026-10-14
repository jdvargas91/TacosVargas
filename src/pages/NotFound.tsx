import { Link } from "react-router-dom";
import { Home, UtensilsCrossed } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { useSiteContent } from "@/context/SiteContentContext";

export function NotFound() {
  const { business } = useSiteContent();

  return (
    <>
      <Seo
        title={`Página no encontrada · ${business.name}`}
        description="Esta dirección no existe en Vargas Tacos."
        noindex
      />
      <Header />
      <main id="contenido" className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-4 pb-20 pt-28">
        <h1 className="font-display text-4xl text-ink md:text-6xl">Esta página no existe</h1>
        <p className="mt-4 max-w-prose text-clay">
          El enlace está mal o esa dirección ya no forma parte del sitio. El menú y el pedido siguen en su lugar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn-accent">
            <Home size={18} aria-hidden />
            Volver al inicio
          </Link>
          <Link to="/#menu" className="btn-secondary h-12 px-5">
            <UtensilsCrossed size={18} aria-hidden />
            Ver menú
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
