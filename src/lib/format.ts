export function formatMxn(cents: number) {
  const amount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
  return amount.includes("MXN") ? amount : `${amount} MXN`;
}

export function isWithinServiceHours(now = new Date()) {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = 7 * 60 + 30;
  const close = 13 * 60 + 30;
  const weekday = day >= 1 && day <= 6;
  return weekday && minutes >= open && minutes < close;
}

export function shortFolio(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function isProductAvailable(soldOut: boolean, stock: number) {
  return !soldOut && stock > 0;
}
