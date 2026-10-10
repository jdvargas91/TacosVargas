import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/data/seedProducts";
import { productPath } from "@/data/seedProducts";
import { ProductMedia } from "@/components/ProductMedia";
import { productPriceLabel } from "@/lib/productPricing";

export function CompanionPicks({ current, items }: { current: Product; items: Product[] }) {
  const pairingDrinks = current.kind === "taco";
  const [emblaRef, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });

  if (items.length === 0) return null;

  return (
    <section className="mt-20" aria-labelledby="acompanar-titulo">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="acompanar-titulo" className="font-display text-3xl text-ink">
            {pairingDrinks ? "Y de tomar" : "Tacos para acompañar"}
          </h2>
          <p className="mt-3 max-w-[65ch] text-clay">
            {pairingDrinks
              ? "Aguas y refrescos para armar el pedido aquí, sin volver al inicio."
              : "Tacos para completar el pedido desde esta ficha."}
          </p>
        </div>
        {items.length > 1 ? (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Productos anteriores"
              onClick={() => embla?.scrollPrev()}
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Productos siguientes"
              onClick={() => embla?.scrollNext()}
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <div className="-mx-1 overflow-hidden px-2 pb-6 pt-1 sm:px-3 sm:pb-8" ref={emblaRef}>
          <ul className="flex gap-5">
            {items.map((item) => (
              <li key={item.id} className="min-w-0 flex-[0_0_78%] sm:flex-[0_0_46%] lg:flex-[0_0_31%]">
                <Link to={productPath(item.id)} className="card-shadow group block overflow-hidden rounded-2xl bg-smoke">
                  <ProductMedia src={item.imageUrl} alt={item.name} tone="card" />
                  <div className="p-4">
                    <p className="font-semibold text-ink group-hover:text-ember">{item.name}</p>
                    <p className="mt-1 text-sm text-ink">{productPriceLabel(item)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
