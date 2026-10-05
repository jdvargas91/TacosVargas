export function formatMxn(cents: number) {
  const amount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
  return amount.includes("MXN") ? amount : `${amount} MXN`;
}

function parseHm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinServiceHours(
  now = new Date(),
  hours?: { opens: string; closes: string; weekdays: number[] },
) {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = hours ? parseHm(hours.opens) : 7 * 60 + 30;
  const close = hours ? parseHm(hours.closes) : 13 * 60 + 30;
  const weekdays = hours?.weekdays ?? [1, 2, 3, 4, 5, 6];
  return weekdays.includes(day) && minutes >= open && minutes < close;
}

export function shortFolio(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Folio legible: PEDIDO-1, PEDIDO-2… Si aún no hay número, usa un recorte del UUID. */
export function formatOrderCode(orderNumber?: number | null, fallbackId?: string) {
  if (typeof orderNumber === "number" && Number.isFinite(orderNumber) && orderNumber > 0) {
    return `PEDIDO-${Math.trunc(orderNumber)}`;
  }
  if (fallbackId) return shortFolio(fallbackId);
  return "PEDIDO-?";
}

export function isProductAvailable(soldOut: boolean, stock: number) {
  return !soldOut && stock > 0;
}
