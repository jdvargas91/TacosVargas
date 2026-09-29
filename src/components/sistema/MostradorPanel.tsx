import { useMemo, useState } from "react";
import { CheckCircle2, CupSoda, Minus, Package, Plus, Receipt, RotateCcw, UtensilsCrossed } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import type { ProductKind } from "@/data/seedProducts";
import { formatMxn, isProductAvailable, shortFolio } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";

const kindTabs: { id: ProductKind; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: "taco", label: "Tacos", icon: UtensilsCrossed },
  { id: "drink", label: "Bebidas", icon: CupSoda },
];

export function MostradorPanel() {
  const { products, refresh } = useProducts();
  const [kindTab, setKindTab] = useState<ProductKind>("taco");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFolio, setLastFolio] = useState<string | null>(null);

  const catalog = useMemo(
    () =>
      products.map((product) => ({
        product,
        qty: cart[product.id] ?? 0,
        available: isProductAvailable(product.soldOut, product.stock),
      })),
    [cart, products],
  );

  const visible = catalog.filter((line) => line.product.kind === kindTab);
  const selected = catalog.filter((line) => line.qty > 0);
  const totalCents = selected.reduce((sum, line) => sum + line.product.priceCents * line.qty, 0);
  const totalItems = selected.reduce((sum, line) => sum + line.qty, 0);

  const itemsInTab = (kind: ProductKind) =>
    catalog.filter((line) => line.product.kind === kind && line.qty > 0).reduce((sum, line) => sum + line.qty, 0);

  function setQty(id: string, qty: number) {
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function clearCart() {
    setCart({});
    setError(null);
  }

  async function submit() {
    setError(null);
    setMessage(null);
    if (selected.length < 1) {
      setError("Elige al menos un producto.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setSubmitting(true);
    const items = selected.map((line) => ({ id: line.product.id, qty: line.qty }));

    // Prefer place_counter_sale (migración nueva). Si aún no está en el proyecto, usa la RPC legacy.
    let orderId: string | null = null;
    const sale = await supabase.rpc("place_counter_sale", { p_items: items });

    if (!sale.error && sale.data && typeof sale.data === "object" && "id" in sale.data) {
      orderId = String((sale.data as { id: string }).id);
    } else {
      const legacy = await supabase.rpc("place_counter_order", {
        p_customer_name: "Mostrador",
        p_phone: "00000000",
        p_fulfillment: "pickup",
        p_delivery_address: { mode: "pickup", street: "", colonia: "", references: "", city: "" },
        p_items: items,
        p_notes: "",
      });
      if (legacy.error || !legacy.data || typeof legacy.data !== "object" || !("id" in legacy.data)) {
        setSubmitting(false);
        setError(legacy.error?.message ?? sale.error?.message ?? "No se pudo registrar la venta");
        return;
      }
      orderId = String((legacy.data as { id: string }).id);
      // La RPC antigua deja status "recibido"; forzamos entregada en venta de mostrador.
      await supabase.from("orders").update({ status: "entregado" }).eq("id", orderId);
    }

    setSubmitting(false);

    const folio = shortFolio(orderId);
    setLastFolio(folio);
    setMessage(`Venta ${folio} registrada como entregada · ${formatMxn(totalCents)}`);
    setCart({});
    void refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row lg:overflow-hidden">
      {/* Catálogo: scrollea solo; el ticket no se mueve */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
        <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-ink">Productos</h2>
            <p className="mt-1 text-sm text-clay">Elige tacos o bebidas; todo suma al mismo ticket.</p>
          </div>
          {totalItems > 0 ? (
            <button type="button" onClick={clearCart} className="btn-secondary h-10 px-3 text-sm">
              <RotateCcw size={15} aria-hidden />
              Limpiar
            </button>
          ) : null}
        </div>

        <div
          className="mb-4 flex shrink-0 gap-1 rounded-[10px] border border-ink/10 bg-paper/80 p-1"
          role="tablist"
          aria-label="Tipo de producto"
        >
          {kindTabs.map((tab) => {
            const Icon = tab.icon;
            const active = kindTab === tab.id;
            const count = itemsInTab(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKindTab(tab.id)}
                className={cn(
                  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] px-3 text-sm font-semibold transition",
                  active ? "bg-terracotta text-white shadow-sm" : "text-clay hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Icon size={16} aria-hidden />
                {tab.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                      active ? "bg-white/25 text-white" : "bg-terracotta/15 text-ember",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map(({ product, qty, available }) => {
              const max = Math.max(product.stock, qty);
              const locked = !available && qty === 0;
              const active = qty > 0;
              return (
                <article
                  key={product.id}
                  className={cn(
                    "flex gap-3 rounded-[10px] border p-3 transition",
                    active
                      ? "border-terracotta bg-terracotta/12 ring-2 ring-terracotta/25 shadow-[0_8px_22px_rgb(196_69_42_/0.16)]"
                      : "border-ink/10 bg-smoke hover:border-ink/20",
                    locked && "opacity-55",
                  )}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-paper">
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={56}
                      height={56}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-ink">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-sm font-semibold text-ember">{formatMxn(product.priceCents)}</p>
                      <p className="text-xs text-clay">{!available ? "Agotado" : `${product.stock} en stock`}</p>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Quitar ${product.name}`}
                        disabled={locked || qty <= 0}
                        onClick={() => setQty(product.id, qty - 1)}
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-[10px] border text-ink transition disabled:opacity-35",
                          active
                            ? "border-terracotta/40 bg-white enabled:hover:bg-terracotta/10"
                            : "border-ink/15 enabled:hover:border-terracotta enabled:hover:bg-terracotta/10",
                        )}
                      >
                        <Minus size={15} />
                      </button>
                      <span
                        className={cn(
                          "min-w-8 text-center text-base font-bold tabular-nums",
                          active ? "text-ember" : "text-ink",
                        )}
                        aria-live="polite"
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Agregar ${product.name}`}
                        disabled={locked || qty >= max}
                        onClick={() => setQty(product.id, qty + 1)}
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-[10px] border text-ink transition disabled:opacity-35",
                          active
                            ? "border-terracotta/40 bg-white enabled:hover:bg-terracotta/10"
                            : "border-ink/15 enabled:hover:border-terracotta enabled:hover:bg-terracotta/10",
                        )}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-ink/15 px-6 py-12 text-center">
              <Package className="mx-auto text-clay" size={28} aria-hidden />
              <p className="mt-3 text-clay">
                No hay {kindTab === "taco" ? "tacos" : "bebidas"} en el menú.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Ticket fijo en desktop: columna propia, no scrollea con el catálogo */}
      <aside className="w-full shrink-0 lg:flex lg:h-full lg:w-[20rem] lg:flex-col xl:w-[22rem]">
        <div className="card-shadow flex flex-col rounded-[10px] border border-ink/8 bg-smoke p-5 lg:h-full lg:min-h-0">
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-ember" aria-hidden />
              <h2 className="font-display text-xl text-ink">Ticket</h2>
            </div>
            <p className="mt-1 text-xs text-clay">Venta presencial · se marca entregada al registrar</p>
          </div>

          <div className="mt-4 min-h-0 flex-1 lg:overflow-y-auto">
            {selected.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-ink/15 bg-paper/60 px-3 py-8 text-center text-sm text-clay">
                Aún no hay productos en el ticket.
              </p>
            ) : (
              <ul className="space-y-2 pr-1">
                {selected.map(({ product, qty }) => (
                  <li
                    key={product.id}
                    className="flex items-start justify-between gap-3 rounded-[8px] border border-ink/8 bg-paper/70 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                      <p className="text-xs text-clay">
                        {qty} × {formatMxn(product.priceCents)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink">{formatMxn(product.priceCents * qty)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 shrink-0 border-t border-ink/10 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-clay">
                {totalItems} pieza{totalItems === 1 ? "" : "s"}
              </span>
              <p className="text-2xl font-bold text-ink">{formatMxn(totalCents)}</p>
            </div>

            {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
            {message ? (
              <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>{message}</span>
              </p>
            ) : null}
            {lastFolio && !message ? (
              <p className="mt-2 text-xs text-clay">Última venta: {lastFolio}</p>
            ) : null}

            <button
              type="button"
              disabled={submitting || selected.length === 0}
              onClick={() => void submit()}
              className="btn-accent mt-4 h-12 w-full"
            >
              <CheckCircle2 size={16} aria-hidden />
              {submitting ? "Registrando…" : "Registrar venta"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
