import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QtyStepper } from "@/components/QtyStepper";
import { Seo } from "@/components/Seo";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { CompanionPicks } from "@/components/CompanionPicks";
import { companionProducts, productPath, relatedProducts } from "@/data/seedProducts";
import { business } from "@/data/business";
import { formatMxn, isProductAvailable } from "@/lib/format";

export function ProductDetail() {
  const { id } = useParams();
  const { products, loading } = useProducts();
  const { cart, addQty } = useCart();
  const product = products.find((item) => item.id === id);
  const [pick, setPick] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setPick(1);
    setAdded(false);
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const remaining = isProductAvailable(product.soldOut, product.stock)
      ? Math.max(0, product.stock - (cart[product.id] ?? 0))
      : 0;
    setPick((current) => {
      if (remaining <= 0) return 0;
      return Math.min(Math.max(current, 1), remaining);
    });
  }, [product, cart]);

  if (!loading && !product) {
    return (
      <>
        <Seo title={`Producto · ${business.name}`} description="Este producto no está en el menú." noindex />
        <Header />
        <main id="contenido" className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
          <h1 className="font-display text-4xl text-ink">No encontramos este taco</h1>
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
  const inCart = cart[product.id] ?? 0;

  return (
    <>
      <Seo
        title={`${product.name} · ${business.name}`}
        description={product.description}
      />
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
            <div className="relative overflow-hidden rounded-2xl">
              <img
                src={product.imageUrl}
                alt={product.name}
                className={`aspect-[4/3] w-full object-cover ${available ? "" : "grayscale-[0.4]"}`}
              />
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
            </div>

            <div>
              <h1 className="font-display text-4xl text-ink md:text-5xl">{product.name}</h1>
              <p className="mt-3 text-3xl font-semibold text-ink">{formatMxn(product.priceCents)}</p>
              <p className="mt-5 max-w-prose text-clay">{product.longDescription}</p>

              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-smoke p-4 card-shadow">
                  <dt className="text-sm text-clay">Porción</dt>
                  <dd className="mt-1 font-medium text-ink">{product.serving}</dd>
                </div>
                <div className="rounded-2xl bg-smoke p-4 card-shadow">
                  <dt className="text-sm text-clay">Peso aproximado</dt>
                  <dd className="mt-1 font-medium text-ink">{product.weightGrams} g</dd>
                </div>
              </dl>

              <h2 className="mt-8 font-display text-2xl text-ink">Ingredientes</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.ingredients.map((ingredient) => (
                  <li key={ingredient} className="rounded-full bg-gold/25 px-3 py-1 text-sm text-ink">
                    {ingredient}
                  </li>
                ))}
              </ul>

              {product.allergens.length > 0 ? (
                <p className="mt-4 text-sm text-clay">Alérgenos: {product.allergens.join(" · ")}</p>
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
                    addQty(product.id, pick);
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
                  <Link to="/pedido" className="font-medium text-terracotta">
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

          {related.length > 0 ? (
            <section className="mt-20">
              <h2 className="font-display text-3xl text-ink">También te puede gustar</h2>
              <p className="mt-3 text-clay">
                {product.kind === "taco"
                  ? "Otros tacos del mostrador, en miniatura."
                  : "Otras bebidas del menú, en miniatura."}
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-5 py-4 md:grid-cols-4">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={productPath(item.id)}
                      className="card-shadow group block rounded-2xl bg-smoke"
                    >
                      <span className="block overflow-hidden rounded-t-2xl">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="aspect-square w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
                        />
                      </span>
                      <div className="p-4">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="mt-1 text-sm text-ink">{formatMxn(item.priceCents)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
