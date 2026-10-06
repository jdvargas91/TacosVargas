import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  CupSoda,
  FilePlus,
  Minus,
  Package,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  UtensilsCrossed,
} from "lucide-react";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Switch } from "@/components/ui/Switch";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useProducts } from "@/context/ProductsContext";
import type { Product, ProductKind } from "@/data/seedProducts";
import { formatMxn, formatOrderCode } from "@/lib/format";
import { supabase, type OrderItemPayload } from "@/lib/supabase";
import { personNameError } from "@/lib/validation";
import { cn } from "@/lib/cn";

function cartFromQtyMap(items: { id: string; qty: number }[]): Record<string, number> {
  const cart: Record<string, number> = {};
  for (const item of items) {
    if (!item?.id || !item.qty) continue;
    cart[item.id] = (cart[item.id] ?? 0) + item.qty;
  }
  return cart;
}

const kindTabs: { id: ProductKind; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: "taco", label: "Tacos", icon: UtensilsCrossed },
  { id: "drink", label: "Bebidas", icon: CupSoda },
];

const OPEN_STATUSES = ["recibido", "en_preparacion", "en_camino"] as const;

type OpenCounterOrder = {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  total_cents: number;
  status: string;
  items: OrderItemPayload[];
};

type RpcOrderPayload = {
  id: string;
  order_number?: number;
  customer_name?: string;
  total_cents?: number;
};

export function MostradorPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editParam = searchParams.get("edit");
  const { products, refresh } = useProducts();
  const [kindTab, setKindTab] = useState<ProductKind>("taco");
  const [cart, setCart] = useState<Record<string, number>>({});
  /** Cantidades ya reservadas en el pedido (para no bloquear por stock al editar). */
  const [baselineQty, setBaselineQty] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenCounterOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soldOutTarget, setSoldOutTarget] = useState<{ product: Product; next: boolean } | null>(null);
  const [soldOutBusy, setSoldOutBusy] = useState(false);

  const catalog = useMemo(
    () =>
      products.map((product) => {
        const qty = cart[product.id] ?? 0;
        const reserved = baselineQty[product.id] ?? 0;
        const effectiveStock = product.stock + reserved;
        const available =
          qty > 0 || (!product.soldOut && effectiveStock > 0) || reserved > 0;
        return { product, qty, available, max: Math.max(effectiveStock, qty) };
      }),
    [baselineQty, cart, products],
  );

  const visible = catalog.filter((line) => line.product.kind === kindTab);
  const selected = catalog.filter((line) => line.qty > 0);
  const totalCents = selected.reduce((sum, line) => sum + line.product.priceCents * line.qty, 0);
  const totalItems = selected.reduce((sum, line) => sum + line.qty, 0);

  const editingOrder = useMemo(
    () => openOrders.find((order) => order.id === editingOrderId) ?? null,
    [editingOrderId, openOrders],
  );

  const itemsInTab = (kind: ProductKind) =>
    catalog.filter((line) => line.product.kind === kind && line.qty > 0).reduce((sum, line) => sum + line.qty, 0);

  const loadOpenOrders = useCallback(async () => {
    if (!supabase) {
      setOpenOrders([]);
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, total_cents, status, items")
      .eq("source", "mostrador")
      .in("status", [...OPEN_STATUSES])
      .order("created_at", { ascending: false });

    setLoadingOrders(false);
    if (fetchError) {
      setOpenOrders([]);
      return;
    }
    setOpenOrders(
      ((data ?? []) as OpenCounterOrder[]).map((order) => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : [],
      })),
    );
  }, []);

  useEffect(() => {
    void loadOpenOrders();
  }, [loadOpenOrders]);

  const applyOrderToTicket = useCallback((order: OpenCounterOrder) => {
    const nextCart = cartFromQtyMap(order.items);
    setEditingOrderId(order.id);
    setCustomerName(order.customer_name?.trim() ?? "");
    setNameError(personNameError(order.customer_name?.trim() ?? ""));
    setCart(nextCart);
    setBaselineQty(nextCart);
    setError(null);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!editParam || loadingOrders) return;
    if (editingOrderId === editParam) return;
    const order = openOrders.find((item) => item.id === editParam);
    if (order) {
      applyOrderToTicket(order);
      return;
    }
    setError("Ese pedido no está abierto en mostrador (ya se entregó o no existe).");
  }, [applyOrderToTicket, editParam, editingOrderId, loadingOrders, openOrders]);

  function setQty(id: string, qty: number) {
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function clearCart() {
    if (editingOrderId) {
      setError("En edición no puedes vaciar el ticket. Baja cantidades o guarda los cambios.");
      return;
    }
    setCart({});
    setError(null);
  }

  function startNewOrder() {
    setEditingOrderId(null);
    setCustomerName("");
    setNameError(null);
    setCart({});
    setBaselineQty({});
    setError(null);
    setMessage(null);
    if (searchParams.has("edit")) {
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  }

  function selectOpenOrder(orderId: string) {
    const order = openOrders.find((item) => item.id === orderId);
    if (!order) return;
    applyOrderToTicket(order);
    setSearchParams({ edit: orderId }, { replace: true });
  }

  async function confirmSoldOut() {
    if (!soldOutTarget || !supabase) {
      setSoldOutTarget(null);
      return;
    }
    const { product, next } = soldOutTarget;
    setSoldOutBusy(true);
    const { error: rpcError } = await supabase.rpc("set_product_sold_out", {
      p_product_id: product.id,
      p_sold_out: next,
    });
    setSoldOutBusy(false);
    setSoldOutTarget(null);
    if (rpcError) {
      setError(rpcError.message ?? "No se pudo cambiar la disponibilidad");
      return;
    }
    setMessage(
      next
        ? `${product.name} marcado como agotado`
        : `${product.name} vuelve a estar disponible`,
    );
    void refresh();
  }

  async function submit() {
    setError(null);
    setMessage(null);
    setNameError(null);

    const nameErr = personNameError(customerName);
    if (nameErr) {
      setNameError(nameErr);
      setError(nameErr);
      return;
    }
    const name = customerName.trim();
    if (selected.length < 1) {
      setError("Elige al menos un producto.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const items = selected.map((line) => ({ id: line.product.id, qty: line.qty }));
    setSubmitting(true);

    if (editingOrderId) {
      const { data, error: rpcError } = await supabase.rpc("sync_counter_order", {
        p_order_id: editingOrderId,
        p_items: items,
        p_customer_name: name,
      });
      setSubmitting(false);

      if (rpcError || !data || typeof data !== "object" || !("id" in data)) {
        setError(rpcError?.message ?? "No se pudo guardar el pedido");
        return;
      }

      const payload = data as RpcOrderPayload;
      const folio = formatOrderCode(payload.order_number, String(payload.id));
      setMessage(`${folio} actualizado · ${formatMxn(payload.total_cents ?? totalCents)}`);
      setBaselineQty(cartFromQtyMap(items));
      void refresh();
      void loadOpenOrders();
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("place_counter_sale", {
      p_items: items,
      p_customer_name: name,
    });
    setSubmitting(false);

    if (rpcError || !data || typeof data !== "object" || !("id" in data)) {
      setError(rpcError?.message ?? "No se pudo abrir el pedido");
      return;
    }

    const payload = data as RpcOrderPayload;
    const folio = formatOrderCode(payload.order_number, String(payload.id));
    setMessage(`Pedido ${folio} abierto · puedes seguir editándolo`);
    const createdId = String(payload.id);
    setEditingOrderId(createdId);
    setBaselineQty(cartFromQtyMap(items));
    setSearchParams({ edit: createdId }, { replace: true });
    void refresh();
    void loadOpenOrders();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row lg:overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
        <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-ink">Productos</h2>
            <p className="mt-1 text-sm text-clay">
              {editingOrderId
                ? "Ajusta cantidades o agrega productos; el ticket refleja todo el pedido."
                : "Elige tacos o bebidas; todo suma al mismo ticket."}
            </p>
          </div>
          {totalItems > 0 && !editingOrderId ? (
            <button type="button" onClick={clearCart} className="btn-secondary h-10 px-3 text-sm">
              <RotateCcw size={15} aria-hidden />
              Limpiar ticket
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
            {visible.map(({ product, qty, available, max }) => {
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
                      <p className="text-xs text-clay">
                        {locked ? "Agotado" : `${product.stock} en stock`}
                        {baselineQty[product.id] ? ` · ${baselineQty[product.id]} en pedido` : ""}
                      </p>
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

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ink/8 pt-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold",
                          product.soldOut ? "text-terracotta" : "text-emerald-700",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            product.soldOut ? "bg-terracotta" : "bg-emerald-500",
                          )}
                          aria-hidden
                        />
                        {product.soldOut ? "Agotado" : "Disponible"}
                      </span>
                      <Switch
                        checked={product.soldOut}
                        onCheckedChange={(next) => setSoldOutTarget({ product, next })}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-ink/15 px-6 py-12 text-center">
              <Package className="mx-auto text-clay" size={28} aria-hidden />
              <p className="mt-3 text-clay">No hay {kindTab === "taco" ? "tacos" : "bebidas"} en el menú.</p>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="w-full shrink-0 lg:flex lg:h-full lg:w-[20rem] lg:flex-col xl:w-[22rem]">
        <div className="card-shadow flex flex-col rounded-[10px] border border-ink/8 bg-smoke p-5 lg:h-full lg:min-h-0">
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-ember" aria-hidden />
              <h2 className="font-display text-xl text-ink">Ticket</h2>
            </div>
            <p className="mt-1 text-xs text-clay">
              {editingOrderId
                ? `Editando ${formatOrderCode(editingOrder?.order_number, editingOrderId)} · cambia cantidades y guarda`
                : "Nuevo pedido de mostrador · queda en recibido hasta entregarlo"}
            </p>
          </div>

          <div className="mt-4 shrink-0 space-y-3">
            <button
              type="button"
              onClick={startNewOrder}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] border px-2 text-xs font-semibold transition",
                !editingOrderId
                  ? "border-terracotta bg-terracotta/10 text-ember"
                  : "border-ink/15 bg-paper/70 text-clay hover:border-ink/25 hover:text-ink",
              )}
            >
              <FilePlus size={14} aria-hidden />
              Abrir pedido nuevo
            </button>

            {loadingOrders ? (
              <p className="text-xs text-clay">Cargando pedidos abiertos…</p>
            ) : openOrders.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink/70">
                  <Pencil size={12} className="mr-1 inline align-text-bottom" aria-hidden />
                  Pedidos abiertos
                </p>
                <ul className="max-h-36 space-y-1 overflow-y-auto pr-0.5" aria-label="Pedidos de mostrador abiertos">
                  {openOrders.map((order) => {
                    const active = editingOrderId === order.id;
                    const folio = formatOrderCode(order.order_number, order.id);
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => selectOpenOrder(order.id)}
                          className={cn(
                            "flex w-full items-start justify-between gap-2 rounded-[8px] border px-2.5 py-2 text-left text-xs transition",
                            active
                              ? "border-terracotta bg-terracotta/10 text-ink"
                              : "border-ink/10 bg-paper/60 text-clay hover:border-ink/20 hover:text-ink",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">{folio}</span>
                            <span className="block truncate">{order.customer_name?.trim() || "Sin nombre"}</span>
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">{formatMxn(order.total_cents)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-clay">No hay pedidos abiertos en mostrador.</p>
            )}

            <label className="block text-sm text-clay">
              <FieldLabel required>Nombre del cliente</FieldLabel>
              <input
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setNameError(personNameError(event.target.value));
                }}
                className={cn(
                  "mt-2 h-11 w-full rounded-[10px] border bg-white px-3 text-sm text-ink",
                  nameError ? "border-terracotta" : "border-ink/15",
                )}
                autoComplete="name"
                placeholder="Solo letras, ej. Ana López"
                inputMode="text"
              />
              {nameError ? <p className="mt-1 text-xs text-terracotta">{nameError}</p> : null}
            </label>
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
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-sm font-semibold text-ink">{formatMxn(product.priceCents * qty)}</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Quitar uno de ${product.name}`}
                          className="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/15 text-ink"
                          onClick={() => setQty(product.id, qty - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Agregar uno de ${product.name}`}
                          className="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/15 text-ink"
                          onClick={() => setQty(product.id, qty + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
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

            <button
              type="button"
              disabled={submitting || selected.length === 0 || Boolean(personNameError(customerName))}
              onClick={() => void submit()}
              className="btn-accent mt-4 h-12 w-full"
            >
              {editingOrderId ? <Save size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
              {submitting
                ? editingOrderId
                  ? "Guardando…"
                  : "Abriendo…"
                : editingOrderId
                  ? "Guardar cambios"
                  : "Abrir pedido"}
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={Boolean(soldOutTarget)}
        tone={soldOutTarget?.next ? "danger" : "accent"}
        title={soldOutTarget?.next ? "¿Marcar como agotado?" : "¿Volver a disponible?"}
        body={
          soldOutTarget
            ? soldOutTarget.next
              ? `"${soldOutTarget.product.name}" dejará de estar disponible para pedir en el sitio y el mostrador hasta que lo reactives.`
              : `"${soldOutTarget.product.name}" volverá a estar disponible para pedir de inmediato.`
            : ""
        }
        confirmLabel={soldOutTarget?.next ? "Marcar agotado" : "Hacer disponible"}
        busyLabel="Guardando…"
        busy={soldOutBusy}
        onConfirm={() => void confirmSoldOut()}
        onCancel={() => {
          if (!soldOutBusy) setSoldOutTarget(null);
        }}
      />
    </div>
  );
}
