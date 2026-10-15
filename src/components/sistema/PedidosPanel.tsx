import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChefHat,
  Clock,
  Inbox,
  MapPin,
  Maximize2,
  Package,
  Pencil,
  Receipt,
  Replace,
  Search,
  ShoppingBag,
  Store,
  Truck,
  Upload,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatMxn, formatOrderCode } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_MARK,
  ORDER_STATUS_RAIL,
  orderStatusChoices,
  type OrderStatus,
} from "@/lib/orderStatus";
import { supabase, type OrderRow } from "@/lib/supabase";
import { cn } from "@/lib/cn";

type SourceFilter = "todos" | "web" | "mostrador";
type Period = "day" | "week" | "month" | "all";
type TabId = "proceso" | "entregado";

const OPEN_COUNTER = new Set(["recibido", "en_preparacion"]);

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  recibido: Inbox,
  en_preparacion: Clock,
  en_camino: Truck,
  entregado: ShoppingBag,
  cancelado: Ban,
};

const TZ = "America/Mexico_City";
/** Colima/Manzanillo usan UTC-6 fijo (México ya no aplica horario de verano). */
const MX_OFFSET = "-06:00";

function groupOf(order: OrderRow): TabId {
  if (order.status === "entregado") return "entregado";
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
  { id: "entregado", label: "Pagados", icon: CheckCircle2 },
];

export function PedidosPanel() {
  const toast = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tab, setTab] = useState<TabId>("proceso");
  const [period, setPeriod] = useState<Period>("day");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
  const [nameQuery, setNameQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
        if (order.status === "cancelado") return false;
        const bySource = sourceFilter === "todos" || (order.source ?? "web") === sourceFilter;
        const byName =
          !nameNeedle || (order.customer_name ?? "").toLowerCase().includes(nameNeedle);
        return bySource && byName;
      }),
    [orders, sourceFilter, nameNeedle],
  );

  // El filtro de período solo aplica a pedidos entregados.
  // Los pedidos en proceso son "en vivo" y se muestran siempre.
  const start = useMemo(() => periodStart(period), [period]);
  const inPeriod = (order: OrderRow) => !start || new Date(order.created_at) >= start;

  const counts = useMemo(() => {
    const acc: Record<TabId, number> = { proceso: 0, entregado: 0 };
    for (const order of base) {
      const g = groupOf(order);
      if (g !== "proceso" && !inPeriod(order)) continue;
      acc[g] += 1;
    }
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, start]);

  const visible = base.filter((order) => {
    if (groupOf(order) !== tab) return false;
    if (tab !== "proceso" && !inPeriod(order)) return false;
    return true;
  });

  async function updateStatus(id: string, status: OrderRow["status"]) {
    if (!supabase) return;
    const previous = orders.find((item) => item.id === id);
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      toast.error("Pedido no actualizado", updateError.message);
      return;
    }
    const nextGroup = previous ? groupOf({ ...previous, status }) : null;
    const moved = previous != null && nextGroup !== groupOf(previous);
    setOrders((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    toast.success(
      "Pedido actualizado",
      moved
        ? `Estado: ${ORDER_STATUS_LABELS[status]}. Ahora está en ${nextGroup === "entregado" ? "Pagados" : "En proceso"}.`
        : `Estado: ${ORDER_STATUS_LABELS[status]}.`,
    );
  }

  async function uploadProof(orderId: string, file: File, replacing = false) {
    if (!supabase || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(replacing ? "Comprobante no cambiado" : "Comprobante no subido", "Usa una imagen JPG o PNG.");
      return;
    }
    setUploadingId(orderId);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${orderId}-${Date.now()}.${ext}`;
    const { error: upError } = await supabase.storage.from("payment-proofs").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (upError) {
      setError(upError.message);
      toast.error(replacing ? "Comprobante no cambiado" : "Comprobante no subido", upError.message);
      setUploadingId(null);
      return;
    }
    const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ payment_proof_url: pub.publicUrl })
      .eq("id", orderId);
    if (updateError) {
      setError(updateError.message);
      toast.error(replacing ? "Comprobante no cambiado" : "Comprobante no guardado", updateError.message);
      setUploadingId(null);
      return;
    }
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, payment_proof_url: pub.publicUrl } : item)),
    );
    toast.success(
      replacing ? "Comprobante actualizado" : "Comprobante guardado",
      "La foto quedó guardada en el pedido.",
    );
    setUploadingId(null);
  }

  return (
    <div className="mt-2 space-y-5">
      {error ? <p className="text-ember">{error}</p> : null}

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
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:flex lg:flex-wrap">
        <div className="block min-w-0 py-1 text-sm text-clay lg:min-w-[12rem] lg:max-w-xs lg:flex-1">
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
        <label className="block min-w-0 text-sm text-clay lg:w-56">
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
            className="flex flex-wrap gap-1 rounded-[10px] border border-ink/10 bg-paper/80 p-1"
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
                    "h-11 rounded-[7px] px-3 text-sm font-semibold transition",
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
          const flow = orderStatusChoices(order.source);
          const statusValues =
            flow.includes(order.status) || order.status === "en_camino" || order.status === "cancelado"
              ? flow
              : [order.status, ...flow];
          const statusOptions = statusValues.map((status) => ({
            value: status,
            label: ORDER_STATUS_LABELS[status],
          }));
          const StatusIcon = STATUS_ICONS[order.status];

          return (
            <article
              key={order.id}
              className="@container card-shadow relative overflow-hidden rounded-[10px] border border-ink/10 bg-smoke"
            >
              <span
                className={cn("absolute inset-y-0 left-0 w-1", ORDER_STATUS_RAIL[order.status])}
                aria-hidden
              />
              <div className="relative z-10 flex flex-col gap-3 border-b border-ink/8 bg-paper/50 px-4 py-4 @min-[36rem]:flex-row @min-[36rem]:items-start @min-[36rem]:justify-between @min-[36rem]:px-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-[10px]",
                      ORDER_STATUS_MARK[order.status],
                    )}
                    aria-hidden
                  >
                    <StatusIcon size={18} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
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
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                        <User size={14} className="text-clay" aria-hidden />
                        {customerName}
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-xs text-clay">
                        <Calendar size={14} aria-hidden />
                        {new Date(order.created_at).toLocaleString("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full @min-[36rem]:w-56">
                  <p className="mb-1.5 text-xs font-medium text-clay">Cambiar estado</p>
                  <Select
                    value={statusValues.includes(order.status) ? order.status : statusValues[0]}
                    onValueChange={(v) => void updateStatus(order.id, v as OrderRow["status"])}
                    options={statusOptions}
                    aria-label={`Estado del pedido ${code}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b border-ink/8 bg-paper/70 px-4 py-3 @min-[36rem]:flex-row @min-[36rem]:items-center @min-[36rem]:justify-between @min-[36rem]:px-5">
                {hasProof ? (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(order.payment_proof_url!)}
                        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-ink/10 bg-white shadow-sm"
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
                            size={16}
                            className="text-white opacity-0 transition group-hover:opacity-100"
                            aria-hidden
                          />
                        </span>
                      </button>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                          <Receipt size={15} aria-hidden />
                          Comprobante
                        </p>
                        <p className="mt-0.5 text-xs text-clay">Opcional. Solo si el cliente pagó por transferencia.</p>
                      </div>
                    </div>
                    <label
                      className={cn(
                        "inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-ink/15 bg-white px-4 text-sm font-medium text-ink transition hover:border-ink/25 @min-[36rem]:w-auto",
                        uploadingId === order.id && "pointer-events-none opacity-60",
                      )}
                    >
                      <Replace size={15} aria-hidden />
                      {uploadingId === order.id ? "Cambiando…" : "Cambiar comprobante"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingId === order.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void uploadProof(order.id, file, true);
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-ink/10 bg-white text-clay"
                        aria-hidden
                      >
                        <Receipt size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">Comprobante</p>
                        <p className="mt-0.5 text-xs leading-snug text-clay">
                          Opcional. Súbelo solo si el cliente pagó por transferencia.
                        </p>
                      </div>
                    </div>
                    <label
                      className={cn(
                        "btn-secondary h-11 w-full shrink-0 cursor-pointer px-4 text-sm @min-[36rem]:w-auto",
                        uploadingId === order.id && "pointer-events-none opacity-60",
                      )}
                    >
                      <Upload size={16} aria-hidden />
                      {uploadingId === order.id ? "Subiendo…" : "Subir comprobante"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingId === order.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void uploadProof(order.id, file);
                        }}
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="space-y-4 px-4 py-4 @min-[36rem]:px-5">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-clay">
                    <MapPin size={15} className="shrink-0" aria-hidden />
                    Recoger en el local
                  </p>
                  <ul className="mt-2 overflow-hidden rounded-[10px] border border-ink/8 bg-paper/70">
                    {order.items.map((item, idx) => (
                      <li
                        key={`${order.id}-${item.id}-${idx}`}
                        className="flex items-baseline gap-3 border-b border-ink/8 px-3 py-2.5 text-sm last:border-b-0"
                      >
                        <span className="w-8 shrink-0 font-bold tabular-nums text-ink">{item.qty}×</span>
                        <span className="min-w-0 text-ink">
                          <span className="font-medium">{item.name}</span>
                          {item.tortillas || item.size ? (
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              {item.tortillas ? (
                                <span className="inline-flex rounded-full border border-terracotta/25 bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-ink">
                                  {item.tortillas} tortilla{item.tortillas === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {item.size ? (
                                <span className="inline-flex rounded-full border border-terracotta/25 bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-ink">
                                  {item.size === "grande" ? "Grande" : "Chica"}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-3 border-t border-ink/8 pt-4 @min-[36rem]:flex-row @min-[36rem]:items-center @min-[36rem]:justify-between">
                  <div>
                    <p className="text-xs font-medium text-clay">Total</p>
                    <p className="text-xl font-bold text-ink">{formatMxn(order.total_cents)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 @min-[36rem]:flex @min-[36rem]:flex-wrap @min-[36rem]:justify-end">
                    {canEditCounter ? (
                      <Link
                        to={`/sistema/mostrador?edit=${order.id}`}
                        className="btn-secondary inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 px-3 text-sm @min-[36rem]:w-auto"
                      >
                        <Pencil size={15} aria-hidden />
                        Editar pedido
                      </Link>
                    ) : null}
                  </div>
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
