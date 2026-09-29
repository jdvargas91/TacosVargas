import { useEffect, useState } from "react";
import { MessageCircle, Package, Store } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { formatMxn, shortFolio } from "@/lib/format";
import { formatFulfillment, supabase, type OrderRow } from "@/lib/supabase";
import { whatsappCustomerUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

const statusOptions: OrderRow["status"][] = [
  "recibido",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

const statusLabel: Record<OrderRow["status"], string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const statusTone: Record<OrderRow["status"], string> = {
  recibido: "bg-amber-500/15 text-amber-900 border-amber-500/25",
  en_preparacion: "bg-terracotta/15 text-ember border-terracotta/30",
  en_camino: "bg-sky-500/12 text-sky-900 border-sky-500/25",
  entregado: "bg-emerald-500/12 text-emerald-900 border-emerald-500/25",
  cancelado: "bg-ink/8 text-clay border-ink/15",
};

type SourceFilter = "todos" | "web" | "mostrador";

const filterOptions = [
  { value: "todos", label: "Todos los estados" },
  ...statusOptions.map((status) => ({ value: status, label: statusLabel[status] })),
];

const sourceFilterOptions = [
  { value: "todos", label: "Web y mostrador" },
  { value: "web", label: "Solo web" },
  { value: "mostrador", label: "Solo mostrador" },
];

const statusSelectOptions = statusOptions.map((status) => ({
  value: status,
  label: statusLabel[status],
}));

export function PedidosPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<"todos" | OrderRow["status"]>("todos");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
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

  const visible = orders.filter((order) => {
    const byStatus = filter === "todos" || order.status === filter;
    const bySource = sourceFilter === "todos" || (order.source ?? "web") === sourceFilter;
    return byStatus && bySource;
  });

  async function updateStatus(id: string, status: OrderRow["status"]) {
    if (!supabase) return;
    const order = orders.find((item) => item.id === id);
    if (order?.source === "mostrador") return;
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setOrders((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  return (
    <div className="mt-2 space-y-6">
      {error ? <p className="text-terracotta">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
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
          return (
            <article
              key={order.id}
              className={cn(
                "card-shadow overflow-hidden rounded-[10px] border bg-smoke",
                isCounter ? "border-ember/20" : "border-ink/8",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/8 bg-paper/50 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-2xl tracking-wide text-ink">{shortFolio(order.id)}</p>
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
                        statusTone[order.status],
                      )}
                    >
                      {statusLabel[order.status]}
                    </span>
                  </div>
                  {isCounter ? (
                    <p className="mt-1.5 text-sm text-clay">Venta presencial · sin datos de cliente</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-clay">
                      <span className="font-medium text-ink">{order.customer_name}</span>
                      <span className="mx-1.5 text-ink/25">·</span>
                      {order.phone}
                    </p>
                  )}
                </div>
                <div className="w-full min-w-[12rem] sm:w-52">
                  <p className="mb-1.5 text-xs font-medium text-clay">
                    {isCounter ? "Estado (fijo)" : "Cambiar estado"}
                  </p>
                  <Select
                    value={isCounter ? "entregado" : order.status}
                    onValueChange={(v) => void updateStatus(order.id, v as OrderRow["status"])}
                    options={statusSelectOptions}
                    disabled={isCounter}
                    aria-label={`Estado del pedido ${shortFolio(order.id)}`}
                  />
                </div>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  {!isCounter ? (
                    <p className="text-sm font-medium text-ember">
                      {formatFulfillment(order.delivery_address, order.fulfillment)}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-ember">Entrega inmediata en local</p>
                  )}
                  <ul className="mt-3 space-y-1.5 text-sm text-ink">
                    {order.items.map((item) => (
                      <li key={`${order.id}-${item.id}`} className="flex gap-2">
                        <span className="w-8 shrink-0 font-semibold text-clay">{item.qty}×</span>
                        <span>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                  <p className="text-xl font-bold text-ink">{formatMxn(order.total_cents)}</p>
                  {!isCounter ? (
                    <a
                      className="btn-secondary inline-flex h-11 items-center gap-2 px-4 text-sm"
                      href={whatsappCustomerUrl(order.phone)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={16} aria-hidden />
                      Abrir en WhatsApp
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
