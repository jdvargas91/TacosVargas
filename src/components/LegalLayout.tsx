import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { useSiteContent } from "@/context/SiteContentContext";

export function LegalLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { business } = useSiteContent();

  return (
    <>
      <Seo title={`${title} · ${business.name}`} description={description} />
      <Header />
      <main id="contenido" className="mx-auto max-w-3xl px-4 pb-24 pt-28 md:px-6">
        <h1 className="font-display text-4xl text-ink md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-[68ch] text-sm text-clay">Vigente desde el 14 de octubre de 2026.</p>
        <div className="mt-10 max-w-[68ch] space-y-10 text-base leading-relaxed text-clay">{children}</div>
        <nav aria-label="Documentos relacionados" className="mt-12 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link to="/terminos" className="cursor-pointer text-ember hover:underline">
            Términos y condiciones
          </Link>
          <Link to="/privacidad" className="cursor-pointer text-ember hover:underline">
            Política de privacidad
          </Link>
        </nav>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {children}
    </section>
  );
}
