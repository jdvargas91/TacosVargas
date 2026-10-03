import type { OrderRow } from "@/lib/supabase";

export type OrderStatus = OrderRow["status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "recibido",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

/** Etiquetas claras: "Nuevo" evita confundir con "recibido por el cliente". */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: "Nuevo",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado al cliente",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_TONES: Record<OrderStatus, string> = {
  recibido: "bg-amber-500/15 text-amber-900 border-amber-500/25",
  en_preparacion: "bg-terracotta/15 text-ember border-terracotta/30",
  en_camino: "bg-sky-500/12 text-sky-900 border-sky-500/25",
  entregado: "bg-emerald-500/12 text-emerald-900 border-emerald-500/25",
  cancelado: "bg-ink/8 text-clay border-ink/15",
};
