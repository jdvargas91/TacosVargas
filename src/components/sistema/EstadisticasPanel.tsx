import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMxn } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";

type Grain = "day" | "week" | "month";

type SeriesPoint = {
  key: string;
  label: string;
  sales_cents: number;
  orders: number;
};

type ProductStat = {
  name: string;
  kind: "taco" | "drink";
  qty: number;
  sales_cents: number;
};

type CountStat = {
  orders: number;
  sales_cents: number;
};

type SalesSummary = {
  grain: Grain;
  label: string;
  sales_cents: number;
  orders_delivered: number;
  avg_ticket_cents: number;
  cancelled_count: number;
  cancelled_cents: number;
  open_count: number;
  open_cents: number;
  previous: { sales_cents: number; orders_delivered: number };
  series: SeriesPoint[];
  products: ProductStat[];
  channels: Array<CountStat & { source: string }>;
  fulfillment: Array<CountStat & { fulfillment: string }>;
};

const TZ = "America/Mexico_City";
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const grains: Array<{ id: Grain; label: string }> = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

function num(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function mexicoToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toIso(y: number, m: number, d: number) {
  const utc = new Date(Date.UTC(y, m - 1, d));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addDays(iso: string, days: number) {
  const { y, m, d } = parseIso(iso);
  return toIso(y, m, d + days);
}

function addMonths(iso: string, months: number) {
  const { y, m, d } = parseIso(iso);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return toIso(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(d, last));
}

function startOfPeriod(grain: Grain, iso: string) {
  if (grain === "day") return iso;
  if (grain === "month") return `${iso.slice(0, 7)}-01`;
  const { y, m, d } = parseIso(iso);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDays(iso, delta);
}

function shiftAnchor(grain: Grain, iso: string, dir: -1 | 1) {
  if (grain === "day") return addDays(iso, dir);
  if (grain === "week") return addDays(iso, dir * 7);
  return addMonths(iso, dir);
}

function periodLabel(grain: Grain, anchor: string) {
  const { y, m, d } = parseIso(anchor);
  if (grain === "day") return `${d} ${MONTHS[m - 1]} ${y}`;
  if (grain === "month") return `${MONTH_NAMES[m - 1]} ${y}`;
  const start = parseIso(startOfPeriod("week", anchor));
  const end = parseIso(addDays(startOfPeriod("week", anchor), 6));
  if (start.y === end.y && start.m === end.m) {
    return `${start.d}–${end.d} ${MONTHS[end.m - 1]} ${end.y}`;
  }
  if (start.y === end.y) {
    return `${start.d} ${MONTHS[start.m - 1]} – ${end.d} ${MONTHS[end.m - 1]} ${end.y}`;
  }
  return `${start.d} ${MONTHS[start.m - 1]} ${start.y} – ${end.d} ${MONTHS[end.m - 1]} ${end.y}`;
}

function comparisonCopy(grain: Grain, sales: number, previous: number) {
  const previousName =
    grain === "day" ? "el día anterior" : grain === "week" ? "la semana anterior" : "el mes anterior";
  if (previous <= 0 && sales <= 0) return `Igual que ${previousName}`;
  if (previous <= 0) return `Sin ventas ${previousName}`;
  const pct = Math.round(((sales - previous) / previous) * 100);
  if (pct === 0) return `Igual que ${previousName}`;
  if (pct > 0) return `${pct}% más que ${previousName}`;
  return `${Math.abs(pct)}% menos que ${previousName}`;
}

function openCopy(count: number, cents: number) {
  if (count <= 0) return "No hay pedidos en curso.";
  const noun = count === 1 ? "pedido en curso" : "pedidos en curso";
  return `${count} ${noun} · ${formatMxn(cents)}`;
}

function ticket(cents: number, orders: number) {
  if (orders <= 0) return "—";
  return formatMxn(Math.round(cents / orders));
}

function formatMxnShort(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function seriesAria(grain: Grain, point: SeriesPoint) {
  const amount = formatMxn(point.sales_cents);
  if (grain === "month" && /^\d{4}-\d{2}-\d{2}$/.test(point.key)) {
    const { y, m, d } = parseIso(point.key);
    return `${d} de ${MONTH_NAMES[m - 1]} de ${y}: ${amount}`;
  }
  return `${point.label}: ${amount}`;
}

function readableError(message: string) {
  if (/admin_sales_summary|schema cache|PGRST202|could not find the function/i.test(message)) {
    return "El resumen todavía no está en la base. Aplica la migración de estadísticas y vuelve a abrir esta pantalla.";
  }
  if (/Solo el administrador/i.test(message)) return "Solo el administrador puede ver el resumen.";
  return message;
}

function parseSummary(value: unknown): SalesSummary | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.grain !== "day" && row.grain !== "week" && row.grain !== "month") return null;
  if (!row.previous || typeof row.previous !== "object") return null;
  const previous = row.previous as Record<string, unknown>;

  const series = Array.isArray(row.series)
    ? row.series.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const point = item as Record<string, unknown>;
        if (typeof point.key !== "string" || typeof point.label !== "string") return [];
        return [
          {
            key: point.key,
            label: point.label,
            sales_cents: num(point.sales_cents),
            orders: num(point.orders),
          },
        ];
      })
    : [];

  const products = Array.isArray(row.products)
    ? row.products.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const product = item as Record<string, unknown>;
        if (typeof product.name !== "string") return [];
        return [
          {
            name: product.name,
            kind: product.kind === "drink" ? ("drink" as const) : ("taco" as const),
            qty: num(product.qty),
            sales_cents: num(product.sales_cents),
          },
        ];
      })
    : [];

  const channels = Array.isArray(row.channels)
    ? row.channels.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const channel = item as Record<string, unknown>;
        if (typeof channel.source !== "string") return [];
        return [{ source: channel.source, orders: num(channel.orders), sales_cents: num(channel.sales_cents) }];
      })
    : [];

  const fulfillment = Array.isArray(row.fulfillment)
    ? row.fulfillment.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const mode = item as Record<string, unknown>;
        if (typeof mode.fulfillment !== "string") return [];
        return [
          {
            fulfillment: mode.fulfillment,
            orders: num(mode.orders),
            sales_cents: num(mode.sales_cents),
          },
        ];
      })
    : [];

  return {
    grain: row.grain,
    label: typeof row.label === "string" && row.label ? row.label : "",
    sales_cents: num(row.sales_cents),
    orders_delivered: num(row.orders_delivered),
    avg_ticket_cents: num(row.avg_ticket_cents),
    cancelled_count: num(row.cancelled_count),
    cancelled_cents: num(row.cancelled_cents),
    open_count: num(row.open_count),
    open_cents: num(row.open_cents),
    previous: {
      sales_cents: num(previous.sales_cents),
      orders_delivered: num(previous.orders_delivered),
    },
    series,
    products,
    channels,
    fulfillment,
  };
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduce;
}

function SalesBars({ grain, series }: { grain: Grain; series: SeriesPoint[] }) {
  const reduce = usePrefersReducedMotion();
  const [grown, setGrown] = useState(reduce);
  const max = Math.max(0, ...series.map((point) => point.sales_cents));
  const title = grain === "day" ? "Ventas por hora" : "Ventas por día";

  useEffect(() => {
    if (reduce) {
      setGrown(true);
      return;
    }
    setGrown(false);
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [reduce, series]);

  return (
    <section className="min-w-0">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded-[10px] border border-ink/10 bg-smoke p-4">
        <div className="flex min-w-max items-end gap-2" role="list" aria-label={title}>
          {series.map((point) => {
            const scale = max === 0 ? 0 : point.sales_cents / max;
            return (
              <div
                key={point.key}
                role="listitem"
                aria-label={seriesAria(grain, point)}
                className="flex w-[4.5rem] shrink-0 flex-col items-center gap-2"
              >
                <span className="text-center text-xs font-semibold text-ink">{formatMxnShort(point.sales_cents)}</span>
                <svg width="28" height="140" aria-hidden="true" className="overflow-visible">
                  <rect x="0" y="0" width="28" height="140" rx="6" className="fill-ink/10" />
                  <rect
                    x="0"
                    y="0"
                    width="28"
                    height="140"
                    rx="6"
                    className="stat-bar fill-terracotta"
                    style={{ transform: `scaleY(${grown ? scale : 0})` }}
                  />
                </svg>
                <span className="text-center text-xs text-clay">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function findCount<T extends CountStat>(rows: T[], key: keyof T, value: string) {
  return rows.find((row) => row[key] === value) ?? { orders: 0, sales_cents: 0 };
}

export function EstadisticasPanel() {
  const [grain, setGrain] = useState<Grain>("day");
  const [anchor, setAnchor] = useState(mexicoToday);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = mexicoToday();
  const nextAnchor = shiftAnchor(grain, anchor, 1);
  const atLatest = startOfPeriod(grain, nextAnchor) > today;
  const label = summary?.label || periodLabel(grain, anchor);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError("No hay conexión con la base de datos.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSummary(null);

    supabase.rpc("admin_sales_summary", { p_grain: grain, p_anchor: anchor }).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) {
        setError(readableError(rpcError.message));
        setLoading(false);
        return;
      }
      const parsed = parseSummary(data);
      if (!parsed) {
        setError("No se pudo leer el resumen.");
        setLoading(false);
        return;
      }
      setSummary(parsed);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [anchor, grain]);

  const channelRows = [
    { label: "Web", ...findCount(summary?.channels ?? [], "source", "web") },
    { label: "Mostrador", ...findCount(summary?.channels ?? [], "source", "mostrador") },
  ];
  const deliveryRows = [
    { label: "Recoger", ...findCount(summary?.fulfillment ?? [], "fulfillment", "pickup") },
    { label: "Envío", ...findCount(summary?.fulfillment ?? [], "fulfillment", "delivery") },
  ];

  return (
    <div className="min-w-0 space-y-6 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Tipo de periodo"
          className="flex gap-1 rounded-[10px] border border-ink/10 bg-paper p-1"
        >
          {grains.map((item) => {
            const active = grain === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setGrain(item.id)}
                className={cn(
                  "h-11 flex-1 rounded-[8px] px-4 text-sm font-medium sm:flex-none",
                  active ? "bg-terracotta text-white" : "text-clay hover:bg-ink/5 hover:text-ink",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor((current) => shiftAnchor(grain, current, -1))}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-[10px] border border-ink/15 bg-smoke px-3 text-sm font-medium text-ink"
          >
            <ChevronLeft size={18} aria-hidden />
            Anterior
          </button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold text-ink sm:min-w-44">{label}</p>
          <button
            type="button"
            onClick={() => setAnchor((current) => shiftAnchor(grain, current, 1))}
            disabled={atLatest}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-[10px] border border-ink/15 bg-smoke px-3 text-sm font-medium text-ink disabled:opacity-40"
          >
            Siguiente
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      </div>

      {loading ? (
        <p role="status" className="text-sm text-clay">
          Cargando resumen…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-[10px] border border-ember/30 bg-smoke px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {summary && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[10px] border border-ink/10 bg-smoke p-4">
              <h2 className="text-sm font-medium text-clay">Ventas cobradas</h2>
              <p className="mt-2 text-2xl font-semibold text-ink">{formatMxn(summary.sales_cents)}</p>
            </article>
            <article className="rounded-[10px] border border-ink/10 bg-smoke p-4">
              <h2 className="text-sm font-medium text-clay">Pedidos entregados</h2>
              <p className="mt-2 text-2xl font-semibold text-ink">{summary.orders_delivered}</p>
            </article>
            <article className="rounded-[10px] border border-ink/10 bg-smoke p-4">
              <h2 className="text-sm font-medium text-clay">Ticket promedio</h2>
              <p className="mt-2 text-2xl font-semibold text-ink">{formatMxn(summary.avg_ticket_cents)}</p>
            </article>
            <article className="rounded-[10px] border border-ink/10 bg-smoke p-4">
              <h2 className="text-sm font-medium text-clay">Cancelados</h2>
              <p className="mt-2 text-2xl font-semibold text-ink">{summary.cancelled_count}</p>
              <p className="mt-1 text-sm text-clay">{formatMxn(summary.cancelled_cents)}</p>
            </article>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">
              {comparisonCopy(summary.grain, summary.sales_cents, summary.previous.sales_cents)}
            </p>
            <p className="text-sm text-clay">{openCopy(summary.open_count, summary.open_cents)}</p>
          </div>

          {summary.orders_delivered === 0 ? (
            <p className="rounded-[10px] border border-dashed border-ink/15 bg-smoke px-6 py-12 text-center text-sm text-clay">
              No hubo ventas en este periodo.
            </p>
          ) : (
            <SalesBars grain={summary.grain} series={summary.series} />
          )}

          <section className="min-w-0">
            <h2 className="font-display text-2xl text-ink">Productos</h2>
            <div className="mt-3 overflow-x-auto rounded-[10px] border border-ink/10 bg-smoke">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">Productos vendidos en el periodo</caption>
                <thead>
                  <tr className="text-clay">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Producto
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tipo
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Piezas
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Importe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.products.length === 0 ? (
                    <tr className="border-t border-ink/10">
                      <td colSpan={4} className="px-4 py-8 text-center text-clay">
                        Ningún producto en este periodo.
                      </td>
                    </tr>
                  ) : (
                    summary.products.map((product) => (
                      <tr key={`${product.kind}-${product.name}`} className="border-t border-ink/10">
                        <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                          {product.name}
                        </th>
                        <td className="px-4 py-3 text-clay">{product.kind === "drink" ? "Bebida" : "Taco"}</td>
                        <td className="px-4 py-3 text-right text-ink">{product.qty}</td>
                        <td className="px-4 py-3 text-right text-ink">{formatMxn(product.sales_cents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="min-w-0">
            <h2 className="font-display text-2xl text-ink">Origen</h2>
            <div className="mt-3 overflow-x-auto rounded-[10px] border border-ink/10 bg-smoke">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">Ventas por canal y forma de entrega</caption>
                <thead>
                  <tr className="text-clay">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Origen
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Pedidos
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Ventas
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Ticket
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th
                      colSpan={4}
                      scope="colgroup"
                      className="border-t border-ink/10 bg-paper px-4 py-2 text-left text-sm font-semibold text-clay"
                    >
                      Canal
                    </th>
                  </tr>
                  {channelRows.map((row) => (
                    <tr key={row.label} className="border-t border-ink/10">
                      <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                        {row.label}
                      </th>
                      <td className="px-4 py-3 text-right text-ink">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatMxn(row.sales_cents)}</td>
                      <td className="px-4 py-3 text-right text-ink">{ticket(row.sales_cents, row.orders)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th
                      colSpan={4}
                      scope="colgroup"
                      className="border-t border-ink/10 bg-paper px-4 py-2 text-left text-sm font-semibold text-clay"
                    >
                      Entrega
                    </th>
                  </tr>
                  {deliveryRows.map((row) => (
                    <tr key={row.label} className="border-t border-ink/10">
                      <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                        {row.label}
                      </th>
                      <td className="px-4 py-3 text-right text-ink">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatMxn(row.sales_cents)}</td>
                      <td className="px-4 py-3 text-right text-ink">{ticket(row.sales_cents, row.orders)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
