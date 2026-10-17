import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import type { Product } from "@/data/seedProducts";
import { productPath } from "@/data/seedProducts";
import { isProductAvailable } from "@/lib/format";
import { productPriceLabel } from "@/lib/productPricing";
import { CarouselControls } from "@/components/CarouselControls";
import { ProductMedia } from "@/components/ProductMedia";
import { Reveal } from "@/components/Reveal";

const PHONE_QUERY = "(max-width: 767px)";

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(PHONE_QUERY).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}

export function ProductCard({ product }: { product: Product }) {
  const available = isProductAvailable(product.soldOut, product.stock);

  return (
    <article className="menu-card relative flex h-full min-w-0 flex-col">
      <Link to={productPath(product.id)} className="flex h-full min-w-0 flex-col">
        <ProductMedia
          src={product.imageUrl}
          alt=""
          tone="card"
          muted={!available}
          className="rounded-[16px]"
        >
          {product.isFeatured ? (
            <span className="absolute left-3 top-3 rounded-sm bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">
              Especialidad de la casa
            </span>
          ) : null}
          {!available ? (
            <span className="absolute inset-x-0 top-0 bottom-12 grid place-items-center bg-ink/55 font-display text-xl text-paper md:text-2xl">
              Agotado
            </span>
          ) : null}
        </ProductMedia>
        <div className="relative z-10 -mt-8 flex flex-1 flex-col rounded-[16px] bg-smoke px-4 pb-4 pt-4 shadow-[0_8px_20px_rgb(30_23_16/0.06)]">
          <h3 className="text-lg font-semibold leading-snug text-ink">{product.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-clay">{product.description}</p>
          <div className="mt-auto flex items-baseline justify-between gap-3 pt-4">
            <p className="text-lg font-bold leading-none tabular-nums text-ink">{productPriceLabel(product)}</p>
            <span className="menu-card__more shrink-0 text-sm font-medium text-clay">Ver detalles</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function ProductGrid({
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
  const reduce = useReducedMotion();
  const isPhone = useIsPhone();
  const [emblaRef, embla] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        {isPhone && products.length > 1 ? (
          <CarouselControls
            onPrev={() => embla?.scrollPrev()}
            onNext={() => embla?.scrollNext()}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
          />
        ) : null}
      </div>
      {isPhone ? (
        <div className="mt-8 overflow-hidden pb-4" ref={emblaRef}>
          <ul className="flex">
            {products.map((product) => (
              <li key={product.id} className="mr-5 min-w-0 flex-[0_0_85%]">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mt-8 grid list-none grid-cols-2 gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {products.map((product, index) => (
            <Reveal key={product.id} as="li" delay={reduce ? 0 : Math.min(index * 0.04, 0.28)}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </ul>
      )}
    </>
  );
}

export function MenuSection({ tacos, drinks }: { tacos: Product[]; drinks: Product[] }) {
  return (
    <section id="menu" className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <ProductGrid
          products={tacos}
          heading={
            <Reveal>
              <h2 className="font-display text-4xl text-ink md:text-5xl">Tacos que se piden de memoria</h2>
              <span className="mark" aria-hidden />
            </Reveal>
          }
          prevLabel="Tacos anteriores"
          nextLabel="Tacos siguientes"
        />

        <div className="mt-20">
          <ProductGrid
            products={drinks}
            heading={
              <Reveal>
                <h3 className="font-display text-4xl text-ink md:text-5xl">Aguas y refrescos</h3>
                <span className="mark" aria-hidden />
              </Reveal>
            }
            prevLabel="Bebidas anteriores"
            nextLabel="Bebidas siguientes"
          />
        </div>
      </div>
    </section>
  );
}
