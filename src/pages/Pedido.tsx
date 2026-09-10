import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OrderBuilder } from "@/components/OrderBuilder";
import { Seo } from "@/components/Seo";
import { business } from "@/data/business";

export function Pedido() {
  return (
    <>
      <Seo
        title={`Pedido · ${business.name}`}
        description="Revisa tu pedido de tacos y bebidas Vargas. Recoge en el local o pide mensajería."
        noindex
      />
      <Header />
      <main id="contenido" className="pt-16">
        <OrderBuilder />
      </main>
      <Footer />
    </>
  );
}
