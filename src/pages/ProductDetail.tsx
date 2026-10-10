import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QtyStepper } from "@/components/QtyStepper";
import { TortillaPicker } from "@/components/TortillaPicker";
import { SizePicker } from "@/components/SizePicker";
import { ProductMedia } from "@/components/ProductMedia";
import { Seo } from "@/components/Seo";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { CompanionPicks } from "@/components/CompanionPicks";
import { companionProducts, productPath, relatedProducts, type DrinkSizeId } from "@/data/seedProducts";
import { useSiteContent } from "@/context/SiteContentContext";
import type { Tortillas } from "@/lib/cart";
import { formatMxn, isProductAvailable } from "@/lib/format";
import { productHasSizes, productUnitPrice } from "@/lib/productPricing";

export function ProductDetail() {
  const { id } = useParams();
  const { products, loading } = useProducts();
  const { business } = useSiteContent();
  const { qtyForProduct, addQty } = useCart();
  const product = products.find((item) => item.id === id);
  const [pick, setPick] = useState(1);
  const [tortillas, setTortillas] = useState<Tortillas>(2);
  const [size, setSize] = useState<DrinkSizeId>("chica");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setPick(1);
    setTortillas(2);
    setSize("chica");
    setAdded(false);
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const inCart = qtyForProduct(product.id);
    const remaining = isProductAvailable(product.soldOut, product.stock)
      ? Math.max(0, product.stock - inCart)
      : 0;
    setPick((current) => {
      if (remaining <= 0) return 0;
      return Math.min(Math.max(current, 1), remaining);
    });
  }, [product, qtyForProduct]);

  if (!loading && !product) {
    return (
      <>
        <Seo title={`Producto · ${business.name}`} description="Este producto no está en el menú." noindex />
        <Header />
        <main id="contenido" className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
          <h1 className="font-display text-4xl text-ink">No encontramos este producto</h1>
          <p className="mt-4 text-clay">Puede que ya no esté en el menú o que el enlace esté viejo.</p>
          <Link to="/#menu" className="btn-accent mt-8">
            <UtensilsCrossed size={18} aria-hidden />
            Ver menú
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main id="contenido" className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
          <p className="text-clay">Cargando…</p>
        </main>
        <Footer />
      </>
    );
  }

  const available = isProductAvailable(product.soldOut, product.stock);
  const related = relatedProducts(product, products);
  const companions = companionProducts(product, products);
  const inCart = qtyForProduct(product.id);
  const isTaco = product.kind === "taco";
  const hasSizes = productHasSizes(product);
  const unitPrice = productUnitPrice(product, hasSizes ? size : null);
  const tagsLabel = isTaco ? "Ingredientes" : "Sabores";
  const showTags = product.ingredients.length > 0;

  return (
    <>
      <Seo title={`${product.name} · ${business.name}`} description={product.description} />
      <Header />
      <main id="contenido" className="px-4 pb-20 pt-28 md:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-clay">
            <Link to="/#menu" className="hover:text-ember">
              Menú
            </Link>
            <span aria-hidden> / </span>
            <span className="text-ink">{product.name}</span>
          </p>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <ProductMedia
              src={product.imageUrl}
              alt={product.name}
              tone="detail"
              loading="eager"
              imgClassName={!available ? "grayscale-[0.4]" : undefined}
            >
              {product.isFeatured ? (
                <span className="absolute left-4 top-4 rounded-sm bg-gold px-2 py-1 text-xs font-bold text-ink">
                  Especialidad de la casa
                </span>
              ) : null}
              {!available ? (
                <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-3xl text-tortilla">
                  Agotado
                </span>
              ) : null}
            </ProductMedia>

            <div>
              <h1 className="font-display text-4xl text-ink md:text-5xl">{product.name}</h1>
              <p className="mt-3 text-3xl font-semibold text-ink">{formatMxn(unitPrice)}</p>
              <p className="mt-5 max-w-prose text-clay">{product.longDescription}</p>

              {showTags ? (
                <>
                  <h2 className="mt-8 font-display text-2xl text-ink">{tagsLabel}</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {product.ingredients.map((ingredient) => (
                      <li key={ingredient} className="rounded-full bg-gold/25 px-3 py-1 text-sm text-ink">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {product.allergens.length > 0 ? (
                <p className="mt-4 text-sm text-clay">Contiene: {product.allergens.join(" · ")}</p>
              ) : null}

              {isTaco ? <TortillaPicker className="mt-8" value={tortillas} onChange={setTortillas} /> : null}
              {hasSizes && product.sizes ? (
                <SizePicker className="mt-8" sizes={product.sizes} value={size} onChange={setSize} />
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <QtyStepper
                  value={pick}
                  max={available ? Math.max(0, product.stock - inCart) : 0}
                  disabled={!available}
                  onChange={setPick}
                  label={product.name}
                />
                <button
                  type="button"
                  disabled={!available || pick < 1}
                  onClick={() => {
                    if (isTaco) addQty(product.id, pick, { tortillas });
                    else if (hasSizes) addQty(product.id, pick, { size });
                    else addQty(product.id, pick);
                    setAdded(true);
                  }}
                  className="btn-accent disabled:opacity-50"
                >
                  <ShoppingBag size={18} aria-hidden />
                  Agregar al pedido
                </button>
              </div>
              {inCart > 0 ? (
                <p className="mt-3 text-sm text-clay">
                  En el pedido: {inCart}.{" "}
                  <Link to="/pedido" className="cursor-pointer font-medium text-terracotta hover:underline">
                    Ver pedido
                  </Link>
                </p>
              ) : null}
              {added ? (
                <p className="mt-2 text-sm text-ink" role="status">
                  Listo. Puedes seguir armando o ir al pedido.
                </p>
              ) : null}
            </div>
          </div>

          <CompanionPicks current={product} items={companions} />

          {related.length > 0 ? <RelatedPicks productKind={product.kind} items={related} /> : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

function RelatedPicks({
  productKind,
  items,
}: {
  productKind: "taco" | "drink";
  items: ReturnType<typeof relatedProducts>;
}) {
  const [emblaRef, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });

  return (
    <section className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-ink">También te puede gustar</h2>
          <p className="mt-3 text-clay">
            {productKind === "taco"
              ? "Otros tacos del mostrador, en miniatura."
              : "Otras bebidas del menú, en miniatura."}
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
                    <p className="mt-1 text-sm text-ink">
                      {item.sizes?.length
                        ? `Desde ${formatMxn(Math.min(...item.sizes.map((s) => s.priceCents)))}`
                        : formatMxn(item.priceCents)}
                    </p>
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
