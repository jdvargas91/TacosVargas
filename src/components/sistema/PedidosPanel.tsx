import { useEffect, useState } from "react";
import { formatMxn, shortFolio } from "@/lib/format";
import { formatFulfillment, supabase, type OrderRow } from "@/lib/supabase";
import { whatsappCustomerUrl } from "@/lib/whatsapp";

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

export function PedidosPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<"todos" | OrderRow["status"]>("todos");
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

  const visible = filter === "todos" ? orders : orders.filter((order) => order.status === filter);

  async function updateStatus(id: string, status: OrderRow["status"]) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
  }

  return (
    <div className="mt-8">
      {error ? <p className="mb-4 text-terracotta">{error}</p> : null}
      <label className="text-sm text-clay">
        Estado
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
          className="ml-3 h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
        >
          <option value="todos">Todos</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabel[status]}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-6 space-y-4">
        {visible.length === 0 ? <p className="text-clay">No hay pedidos en este filtro.</p> : null}
        {visible.map((order) => (
          <article key={order.id} className="card-shadow rounded-2xl bg-smoke p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-2xl text-ink">{shortFolio(order.id)}</p>
              <select
                value={order.status}
                onChange={(event) => void updateStatus(order.id, event.target.value as OrderRow["status"])}
                className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-sm text-clay">
              {order.customer_name} · {order.phone}
              {order.source === "mostrador" ? " · Mostrador" : " · Web"}
            </p>
            <p className="text-sm text-clay">{formatFulfillment(order.delivery_address, order.fulfillment)}</p>
            <ul className="mt-3 text-clay">
              {order.items.map((item) => (
                <li key={`${order.id}-${item.id}`}>
                  {item.qty}× {item.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-ink">{formatMxn(order.total_cents)}</p>
            <a
              className="mt-3 inline-block text-terracotta"
              href={whatsappCustomerUrl(order.phone)}
              target="_blank"
              rel="noreferrer"
            >
              Abrir en WhatsApp
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
