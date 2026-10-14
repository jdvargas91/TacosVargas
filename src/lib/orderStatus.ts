import type { OrderRow } from "@/lib/supabase";

export type OrderStatus = OrderRow["status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "recibido",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

/** Estados del flujo operativo. Facturado (entregado) solo si hay comprobante. */
export function orderStatusChoices(
  source: "web" | "mostrador" | null | undefined,
  hasPaymentProof = false,
): OrderStatus[] {
  const base: OrderStatus[] =
    source === "mostrador" ? ["en_preparacion"] : ["recibido", "en_preparacion"];
  if (hasPaymentProof) base.push("entregado");
  return base;
}

/** Etiquetas claras: "Nuevo" evita confundir con "recibido por el cliente". */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: "Nuevo",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Facturado",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_TONES: Record<OrderStatus, string> = {
  recibido: "bg-amber-500/15 text-amber-900 border-amber-500/25",
  en_preparacion: "bg-terracotta/15 text-ember border-terracotta/30",
  en_camino: "bg-sky-500/12 text-sky-900 border-sky-500/25",
  entregado: "bg-emerald-500/12 text-emerald-900 border-emerald-500/25",
  cancelado: "bg-ink/8 text-clay border-ink/15",
};

/** Franja izquierda de la tarjeta, un color por estado. */
export const ORDER_STATUS_RAIL: Record<OrderStatus, string> = {
  recibido: "bg-amber-500",
  en_preparacion: "bg-terracotta",
  en_camino: "bg-sky-500",
  entregado: "bg-emerald-600",
  cancelado: "bg-ink/30",
};

/** Fondo del icono que va delante del folio. */
export const ORDER_STATUS_MARK: Record<OrderStatus, string> = {
  recibido: "bg-amber-600 text-white",
  en_preparacion: "bg-ember text-white",
  en_camino: "bg-sky-700 text-white",
  entregado: "bg-emerald-600 text-white",
  cancelado: "bg-ink/45 text-white",
};
