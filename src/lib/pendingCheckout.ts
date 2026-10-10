import type { DrinkSizeId } from "@/data/seedProducts";

const PENDING_KEY = "vargas_pending_checkout";

export type PendingCheckoutItem = {
  id: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  kind: "taco" | "drink";
  tortillas?: 1 | 2;
  size?: DrinkSizeId;
};

export type PaymentMethod = "presencial" | "transferencia";

export type PendingCheckout = {
  name: string;
  phone: string;
  notes: string;
  items: PendingCheckoutItem[];
  totalCents: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
};

export function savePendingCheckout(data: PendingCheckout) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(data));
}

export function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCheckout;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  sessionStorage.removeItem(PENDING_KEY);
}
