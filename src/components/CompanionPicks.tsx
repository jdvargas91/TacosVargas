import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/data/seedProducts";
import { productPath } from "@/data/seedProducts";
import { useCart } from "@/context/CartContext";
import { formatMxn, isProductAvailable } from "@/lib/format";

export function CompanionPicks({ current, items }: { current: Product; items: Product[] }) {
  const { qtyForProduct, addQty } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const pairingDrinks = current.kind === "taco";

  useEffect(() => {
    setAddedId(null);
  }, [current.id]);

  if (items.length === 0) return null;

  return (
    <section className="mt-20" aria-labelledby="acompanar-titulo">
      <h2 id="acompanar-titulo" className="font-display text-3xl text-ink">
        {pairingDrinks ? "Y de tomar" : "El taco que lo pide"}
      </h2>
      <p className="mt-3 max-w-[65ch] text-clay">
        {pairingDrinks
          ? "Aguas y refrescos para armar el pedido aquí, sin volver al inicio."
          : "Tacos para completar el pedido desde esta ficha."}
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-5 py-4 md:grid-cols-4">
        {items.map((item) => {
          const available = isProductAvailable(item.soldOut, item.stock);
          const inCart = qtyForProduct(item.id);
          const remaining = available ? Math.max(0, item.stock - inCart) : 0;
          const canAdd = remaining > 0;

          return (
            <li key={item.id} className="card-shadow flex flex-col rounded-2xl bg-smoke">
              <Link to={productPath(item.id)} className="group block overflow-hidden rounded-t-2xl">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="aspect-square w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
                />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">
                    <Link to={productPath(item.id)} className="hover:text-ember">
                      {item.name}
                    </Link>
                  </p>
                  <p className="mt-1 text-sm text-ink">{formatMxn(item.priceCents)}</p>
                  {inCart > 0 ? (
                    <p className="mt-1 text-sm text-clay">En el pedido: {inCart}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => {
                    addQty(item.id, 1, item.kind === "taco" ? 2 : undefined);
                    setAddedId(item.id);
                  }}
                  className="btn-accent mt-auto h-11 w-full px-3 text-sm disabled:opacity-50"
                >
                  <ShoppingBag size={16} aria-hidden />
                  {canAdd ? "Agregar" : "Agotado"}
                </button>
                {addedId === item.id && inCart > 0 ? (
                  <p className="text-sm text-ink" role="status">
                    Listo. Sigue aquí o ve al pedido.
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
