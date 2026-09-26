import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { Product } from "@/data/seedProducts";
import { productPath } from "@/data/seedProducts";
import { formatMxn, isProductAvailable } from "@/lib/format";
import { Reveal } from "@/components/Reveal";

export function ProductCard({ product }: { product: Product }) {
  const available = isProductAvailable(product.soldOut, product.stock);

  return (
    <article className="group card-shadow relative flex h-full min-w-0 flex-col rounded-2xl bg-smoke">
      <Link to={productPath(product.id)} className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06] ${available ? "" : "grayscale-[0.4]"}`}
        />
        {product.isFeatured ? (
          <span className="absolute left-3 top-3 rounded-sm bg-gold px-2 py-1 text-xs font-bold text-ink">
            Especialidad de la casa
          </span>
        ) : null}
        {!available ? (
          <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-2xl text-tortilla">
            Agotado
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold leading-snug text-ink">
            <Link to={productPath(product.id)} className="hover:text-ember">
              {product.name}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatMxn(product.priceCents)}</p>
        </div>
        <p className="flex-1 text-sm text-clay">{product.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-sm text-clay">{available ? "Disponible" : "Agotado"}</span>
          <Link to={productPath(product.id)} className="btn-accent h-11 px-4 text-sm">
            <Eye size={16} aria-hidden />
            Ver detalles
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProductCarousel({
  products,
  heading,
  prevLabel,
  nextLabel,
}: {
  products: Product[];
  heading: ReactNode;
  prevLabel: string;
  nextLabel: string;
}) {
  const [emblaRef, embla] = useEmblaCarousel({ align: "start", skipSnaps: false });

  return (
    <>
      {heading}
      <div className="mt-4 flex justify-end gap-2 md:mt-5">
        <button
          type="button"
          aria-label={prevLabel}
          onClick={() => embla?.scrollPrev()}
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() => embla?.scrollNext()}
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mt-3 md:mt-4">
        <div className="-mx-2 overflow-hidden px-3 pb-6 pt-1 sm:-mx-3 sm:px-5 sm:pb-8 sm:pt-2" ref={emblaRef}>
          <div className="flex gap-5">
            {products.map((product) => (
              <div key={product.id} className="min-w-0 flex-[0_0_86%] sm:flex-[0_0_46%] lg:flex-[0_0_32%]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function MenuSection({ tacos, drinks }: { tacos: Product[]; drinks: Product[] }) {
  return (
    <section id="menu" className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <ProductCarousel
            products={tacos}
            prevLabel="Tacos anteriores"
            nextLabel="Tacos siguientes"
            heading={
              <div>
                <h2 className="font-display text-4xl text-ink md:text-5xl">Tacos que se piden de memoria</h2>
                <span className="mark" aria-hidden />
              </div>
            }
          />
        </Reveal>

        <Reveal className="mt-20">
          <ProductCarousel
            products={drinks}
            prevLabel="Bebidas anteriores"
            nextLabel="Bebidas siguientes"
            heading={
              <div>
                <h3 className="font-display text-3xl text-ink md:text-4xl">Aguas y refrescos</h3>
                <span className="mark" aria-hidden />
              </div>
            }
          />
        </Reveal>
      </div>
    </section>
  );
}
