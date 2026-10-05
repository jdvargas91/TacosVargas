import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Pencil, Save, Search, Store } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { formatMxn, formatOrderCode } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, ORDER_STATUSES } from "@/lib/orderStatus";
import { supabase, type OrderRow } from "@/lib/supabase";
import { personNameError } from "@/lib/validation";
import { cn } from "@/lib/cn";

type SourceFilter = "todos" | "web" | "mostrador";

const OPEN_COUNTER = new Set(["recibido", "en_preparacion", "en_camino"]);

const filterOptions = [
  { value: "todos", label: "Todos los estados" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })),
];

const sourceFilterOptions = [
  { value: "todos", label: "Web y mostrador" },
  { value: "web", label: "Solo web" },
  { value: "mostrador", label: "Solo mostrador" },
];

const statusSelectOptions = ORDER_STATUSES.map((status) => ({
  value: status,
  label: ORDER_STATUS_LABELS[status],
}));

export function PedidosPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<"todos" | OrderRow["status"]>("todos");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
  const [nameQuery, setNameQuery] = useState("");
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [nameFieldErrors, setNameFieldErrors] = useState<Record<string, string | null>>({});
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        else setOrders((data as OrderRow[]) ?? []);
      });
  }, []);

  useEffect(() => {
    setNameDrafts((current) => {
      const next = { ...current };
      for (const order of orders) {
        if (next[order.id] === undefined) {
          next[order.id] = order.customer_name ?? "";
        }
      }
      return next;
    });
  }, [orders]);

  const nameNeedle = nameQuery.trim().toLowerCase();

  const visible = orders.filter((order) => {
    const byStatus = filter === "todos" || order.status === filter;
    const bySource = sourceFilter === "todos" || (order.source ?? "web") === sourceFilter;
    const byName =
      !nameNeedle || (order.customer_name ?? "").toLowerCase().includes(nameNeedle);
    return byStatus && bySource && byName;
  });

  async function updateStatus(id: string, status: OrderRow["status"]) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setOrders((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  async function saveCustomerName(orderId: string) {
    if (!supabase) return;
    const trimmed = (nameDrafts[orderId] ?? "").trim();
    const nameErr = personNameError(trimmed);
    if (nameErr) {
      setNameFieldErrors((current) => ({ ...current, [orderId]: nameErr }));
      setError(nameErr);
      return;
    }
    setSavingNameId(orderId);
    setError(null);
    setNameFieldErrors((current) => ({ ...current, [orderId]: null }));

    const { error: rpcError } = await supabase.rpc("update_order_customer_name", {
      p_order_id: orderId,
      p_customer_name: trimmed,
    });

    if (rpcError) {
      const { error: directError } = await supabase
        .from("orders")
        .update({ customer_name: trimmed })
        .eq("id", orderId);
      if (directError) {
        setError(directError.message);
        setSavingNameId(null);
        return;
      }
    }

    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, customer_name: trimmed } : item)),
    );
    setSavingNameId(null);
  }

  return (
    <div className="mt-2 space-y-6">
      {error ? <p className="text-terracotta">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="block min-w-[12rem] flex-1 py-1 sm:max-w-xs text-sm text-clay">
          <span className="mb-2 block font-medium text-ink/80">Cliente</span>
          <label className="relative block">
            <span className="sr-only">Buscar por nombre de cliente</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-clay"
              aria-hidden
            />
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              className="h-11 w-full rounded-[10px] border border-ink/15 bg-white pl-10 pr-3 text-ink focus-visible:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35"
            />
          </label>
        </div>
        <label className="block min-w-[12rem] text-sm text-clay">
          <span className="mb-2 block font-medium text-ink/80">Origen</span>
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as SourceFilter)}
            options={sourceFilterOptions}
            aria-label="Filtrar por origen"
          />
        </label>
        <label className="block min-w-[14rem] text-sm text-clay">
          <span className="mb-2 block font-medium text-ink/80">Estado</span>
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
            options={filterOptions}
            aria-label="Filtrar pedidos por estado"
          />
        </label>
        <p className="pb-2 text-sm text-clay">
          {visible.length} pedido{visible.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-ink/15 bg-smoke/60 px-6 py-12 text-center">
            <Package className="mx-auto text-clay" size={28} aria-hidden />
            <p className="mt-3 text-clay">No hay pedidos en este filtro.</p>
          </div>
        ) : null}

        {visible.map((order) => {
          const isCounter = order.source === "mostrador";
          const canEditCounter = isCounter && OPEN_COUNTER.has(order.status);
          const code = formatOrderCode(order.order_number, order.id);
          const draftName = nameDrafts[order.id] ?? order.customer_name ?? "";
          const isSavingName = savingNameId === order.id;
          const draftNameError = nameFieldErrors[order.id];

          return (
            <article
              key={order.id}
              className={cn(
                "card-shadow rounded-[10px] border bg-smoke",
                isCounter ? "border-ember/20" : "border-ink/8",
              )}
            >
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-ink/8 bg-paper/50 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-2xl tracking-wide text-ink">{code}</p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-0.5 text-xs font-semibold",
                        isCounter
                          ? "border-ember/30 bg-ember/10 text-ember"
                          : "border-ink/15 bg-white text-clay",
                      )}
                    >
                      {isCounter ? <Store size={12} aria-hidden /> : null}
                      {isCounter ? "Mostrador" : "Web"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-[8px] border px-2.5 py-0.5 text-xs font-semibold",
                        ORDER_STATUS_TONES[order.status],
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="min-w-[10rem] flex-1 sm:max-w-xs">
                      <input
                        value={draftName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNameDrafts((current) => ({ ...current, [order.id]: value }));
                          setNameFieldErrors((current) => ({
                            ...current,
                            [order.id]: value.trim() ? personNameError(value) : null,
                          }));
                        }}
                        placeholder="Nombre del cliente"
                        className={cn(
                          "h-10 w-full rounded-[10px] border bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35",
                          draftNameError
                            ? "border-terracotta"
                            : "border-ink/15 focus-visible:border-terracotta",
                        )}
                        aria-label={`Nombre del cliente, pedido ${code}`}
                        autoComplete="name"
                        inputMode="text"
                      />
                      {draftNameError ? (
                        <p className="mt-1 text-xs text-terracotta">{draftNameError}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm"
                      disabled={isSavingName || Boolean(draftNameError)}
                      onClick={() => void saveCustomerName(order.id)}
                    >
                      <Save size={15} aria-hidden />
                      Guardar nombre
                    </button>
                    {canEditCounter ? (
                      <Link
                        to={`/sistema/mostrador?edit=${order.id}`}
                        className="btn-accent inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm"
                      >
                        <Pencil size={15} aria-hidden />
                        Editar pedido
                      </Link>
                    ) : null}
                    {!isCounter && order.phone ? (
                      <span className="text-sm text-clay">{order.phone}</span>
                    ) : null}
                  </div>
                </div>
                <div className="w-full min-w-[12rem] sm:w-56">
                  <p className="mb-1.5 text-xs font-medium text-clay">Cambiar estado</p>
                  <Select
                    value={order.status}
                    onValueChange={(v) => void updateStatus(order.id, v as OrderRow["status"])}
                    options={statusSelectOptions}
                    aria-label={`Estado del pedido ${code}`}
                  />
                </div>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium text-ember">Recoger en el local</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink">
                    {order.items.map((item) => (
                      <li key={`${order.id}-${item.id}`} className="flex gap-2">
                        <span className="w-8 shrink-0 font-semibold text-clay">{item.qty}×</span>
                        <span>
                          {item.name}
                          {item.tortillas ? (
                            <span className="text-clay">
                              {" "}
                              · {item.tortillas} tortilla{item.tortillas === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {canEditCounter ? (
                    <p className="mt-3 text-xs text-clay">
                      Para agregar productos o cambiar cantidades, usa{" "}
                      <Link
                        to={`/sistema/mostrador?edit=${order.id}`}
                        className="font-medium text-terracotta underline-offset-2 hover:underline"
                      >
                        Editar pedido
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                  <p className="text-xl font-bold text-ink">{formatMxn(order.total_cents)}</p>
                  {order.payment_proof_url ? (
                    <a
                      className="text-sm font-medium text-terracotta underline-offset-2 hover:underline"
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver comprobante
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
