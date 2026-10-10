import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Maximize2,
  Package,
  Pencil,
  Receipt,
  Search,
  Store,
  X,
  XCircle,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";
import { formatMxn, formatOrderCode } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, ORDER_STATUSES } from "@/lib/orderStatus";
import { supabase, type OrderRow } from "@/lib/supabase";
import { cn } from "@/lib/cn";

type SourceFilter = "todos" | "web" | "mostrador";
type Period = "day" | "week" | "month" | "all";
type TabId = "proceso" | "entregado" | "cancelado";

const OPEN_COUNTER = new Set(["recibido", "en_preparacion"]);

const TZ = "America/Mexico_City";
/** Colima/Manzanillo usan UTC-6 fijo (México ya no aplica horario de verano). */
const MX_OFFSET = "-06:00";

function groupOf(status: OrderRow["status"]): TabId {
  if (status === "entregado") return "entregado";
  if (status === "cancelado") return "cancelado";
  return "proceso";
}

function mexicoTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Instante UTC del inicio del período seleccionado (en hora de México). */
function periodStart(period: Period): Date | null {
  if (period === "all") return null;
  const iso = mexicoTodayIso();
  const [y, m, d] = iso.split("-").map(Number);
  if (period === "day") return new Date(`${iso}T00:00:00${MX_OFFSET}`);
  if (period === "month") {
    const mm = String(m).padStart(2, "0");
    return new Date(`${y}-${mm}-01T00:00:00${MX_OFFSET}`);
  }
  // Semana: lunes como inicio.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(Date.UTC(y, m - 1, d + delta));
  const ys = monday.getUTCFullYear();
  const ms = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const ds = String(monday.getUTCDate()).padStart(2, "0");
  return new Date(`${ys}-${ms}-${ds}T00:00:00${MX_OFFSET}`);
}

const sourceFilterOptions = [
  { value: "todos", label: "Web y mostrador" },
  { value: "web", label: "Solo web" },
  { value: "mostrador", label: "Solo mostrador" },
];

const periodOptions: { id: Period; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "all", label: "Todos" },
];

const tabMeta: { id: TabId; label: string; icon: typeof ChefHat }[] = [
  { id: "proceso", label: "En proceso", icon: ChefHat },
  { id: "entregado", label: "Entregados", icon: CheckCircle2 },
  { id: "cancelado", label: "Cancelados", icon: XCircle },
];

const statusSelectOptions = ORDER_STATUSES.map((status) => ({
  value: status,
  label: ORDER_STATUS_LABELS[status],
}));

export function PedidosPanel() {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tab, setTab] = useState<TabId>("proceso");
  const [period, setPeriod] = useState<Period>("day");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
  const [nameQuery, setNameQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  const nameNeedle = nameQuery.trim().toLowerCase();

  // Base: filtros de origen y nombre (comunes a todas las pestañas).
  const base = useMemo(
    () =>
      orders.filter((order) => {
        const bySource = sourceFilter === "todos" || (order.source ?? "web") === sourceFilter;
        const byName =
          !nameNeedle || (order.customer_name ?? "").toLowerCase().includes(nameNeedle);
        return bySource && byName;
      }),
    [orders, sourceFilter, nameNeedle],
  );

  // El filtro de período solo aplica a pedidos históricos (entregados/cancelados).
  // Los pedidos en proceso son "en vivo" y se muestran siempre.
  const start = useMemo(() => periodStart(period), [period]);
  const inPeriod = (order: OrderRow) => !start || new Date(order.created_at) >= start;

  const counts = useMemo(() => {
    const acc: Record<TabId, number> = { proceso: 0, entregado: 0, cancelado: 0 };
    for (const order of base) {
      const g = groupOf(order.status);
      if (g !== "proceso" && !inPeriod(order)) continue;
      acc[g] += 1;
    }
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, start]);

  const visible = base.filter((order) => {
    if (groupOf(order.status) !== tab) return false;
    if (tab !== "proceso" && !inPeriod(order)) return false;
    return true;
  });

  async function updateStatus(id: string, status: OrderRow["status"]) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      toast.error("Pedido no actualizado", updateError.message);
      return;
    }
    setOrders((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    toast.success("Pedido actualizado", `Estado: ${ORDER_STATUS_LABELS[status]}.`);
  }

  return (
    <div className="mt-2 space-y-5">
      {error ? <p className="text-terracotta">{error}</p> : null}

      {/* Pestañas por estado */}
      <div
        className="flex gap-1 rounded-[10px] border border-ink/10 bg-paper/80 p-1"
        role="tablist"
        aria-label="Agrupar pedidos"
      >
        {tabMeta.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[9px] px-3 text-sm font-semibold transition",
                active ? "bg-terracotta text-white shadow-sm" : "text-clay hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon size={16} aria-hidden />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.label.split(" ")[0]}</span>
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-white/25 text-white" : "bg-terracotta/15 text-ember",
                )}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
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
      </div>

      {/* Filtro de período (solo histórico) */}
      {tab !== "proceso" ? (
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex gap-1 rounded-[10px] border border-ink/10 bg-paper/80 p-1"
            role="group"
            aria-label="Filtrar por período"
          >
            {periodOptions.map((opt) => {
              const active = period === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPeriod(opt.id)}
                  className={cn(
                    "h-9 rounded-[7px] px-3 text-sm font-semibold transition",
                    active ? "bg-ink text-paper shadow-sm" : "text-clay hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-clay">
            {visible.length} pedido{visible.length === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-clay">
          {visible.length} pedido{visible.length === 1 ? "" : "s"} en vivo
        </p>
      )}

      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-ink/15 bg-smoke/60 px-6 py-12 text-center">
            <Package className="mx-auto text-clay" size={28} aria-hidden />
            <p className="mt-3 text-clay">
              {tab === "proceso"
                ? "No hay pedidos en curso ahora mismo."
                : "No hay pedidos en este período."}
            </p>
          </div>
        ) : null}

        {visible.map((order) => {
          const isCounter = order.source === "mostrador";
          const canEditCounter = isCounter && OPEN_COUNTER.has(order.status);
          const code = formatOrderCode(order.order_number, order.id);
          const customerName = order.customer_name?.trim() || "Sin nombre";
          const hasProof = Boolean(order.payment_proof_url);

          return (
            <article
              key={order.id}
              className={cn(
                "card-shadow overflow-hidden rounded-[10px] border bg-smoke",
                hasProof ? "border-amber-500/40" : isCounter ? "border-ember/20" : "border-ink/8",
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
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-ink">{customerName}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-clay">
                      <Clock size={12} aria-hidden />
                      {new Date(order.created_at).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
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

              {/* Comprobante destacado */}
              {hasProof ? (
                <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(order.payment_proof_url!)}
                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border border-amber-500/50 bg-white shadow-sm"
                    aria-label="Ampliar comprobante de pago"
                  >
                    <img
                      src={order.payment_proof_url!}
                      alt="Comprobante de pago"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-carbon/0 transition group-hover:bg-carbon/45">
                      <Maximize2
                        size={18}
                        className="text-white opacity-0 transition group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                  </button>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                      <Receipt size={15} aria-hidden />
                      Comprobante de pago
                    </p>
                    <p className="mt-0.5 text-xs text-amber-900/80">
                      Revisa la transferencia antes de preparar el pedido.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(order.payment_proof_url!)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-ember underline-offset-2 hover:underline"
                    >
                      <Maximize2 size={12} aria-hidden />
                      Ver a pantalla completa
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium text-ember">Recoger en el local</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink">
                    {order.items.map((item, idx) => (
                      <li key={`${order.id}-${item.id}-${idx}`} className="flex gap-2">
                        <span className="w-8 shrink-0 font-semibold text-clay">{item.qty}×</span>
                        <span>
                          {item.name}
                          {item.tortillas ? (
                            <span className="text-clay">
                              {" "}
                              · {item.tortillas} tortilla{item.tortillas === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          {item.size ? (
                            <span className="text-clay">
                              {" "}
                              · {item.size === "grande" ? "Grande" : "Chica"}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                  <p className="text-xl font-bold text-ink">{formatMxn(order.total_cents)}</p>
                  {canEditCounter ? (
                    <Link
                      to={`/sistema/mostrador?edit=${order.id}`}
                      className="btn-accent inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm"
                    >
                      <Pencil size={15} aria-hidden />
                      Editar pedido
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox del comprobante */}
      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-carbon/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Comprobante en tamaño completo"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt="Comprobante de pago"
            className="max-h-[88vh] max-w-full rounded-xl object-contain shadow-[0_24px_60px_rgb(0_0_0_/0.5)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
