import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Eye } from "lucide-react";
import type { Product } from "@/data/seedProducts";
import { productPath } from "@/data/seedProducts";
import { isProductAvailable } from "@/lib/format";
import { productPriceLabel } from "@/lib/productPricing";
import { ProductMedia } from "@/components/ProductMedia";
import { Reveal } from "@/components/Reveal";

export function ProductCard({ product }: { product: Product }) {
  const available = isProductAvailable(product.soldOut, product.stock);
  const reduce = useReducedMotion();

  return (
    <motion.article
      className="group card-shadow relative flex h-full min-w-0 flex-col overflow-hidden rounded-[10px] bg-smoke"
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={productPath(product.id)} className="relative block overflow-hidden">
        <ProductMedia src={product.imageUrl} alt={product.name} tone="card" muted={!available}>
          {product.isFeatured ? (
            <span className="absolute left-2.5 top-2.5 rounded-sm bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">
              Especialidad de la casa
            </span>
          ) : null}
          {!available ? (
            <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-xl text-tortilla md:text-2xl">
              Agotado
            </span>
          ) : null}
        </ProductMedia>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug text-ink md:text-lg">
            <Link to={productPath(product.id)} className="hover:text-ember">
              {product.name}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{productPriceLabel(product)}</p>
        </div>
        <p className="line-clamp-2 text-sm text-clay">{product.description}</p>
        <Link
          to={productPath(product.id)}
          className={
            available
              ? "btn-secondary mt-auto h-11 w-full text-sm"
              : "btn-secondary mt-auto h-11 w-full text-sm opacity-70"
          }
        >
          <Eye size={15} aria-hidden />
          Ver detalles
        </Link>
      </div>
    </motion.article>
  );
}

function ProductGrid({
  products,
  heading,
}: {
  products: Product[];
  heading: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <>
      {heading}
      <ul className="mt-8 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
        {products.map((product, index) => (
          <Reveal key={product.id} as="li" delay={reduce ? 0 : Math.min(index * 0.04, 0.28)}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </ul>
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
          />
        </div>
      </div>
    </section>
  );
}
