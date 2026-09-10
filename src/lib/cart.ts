const KEY = "tv-cart-v1";

export type CartMap = Record<string, number>;

export function readCart(): CartMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CartMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCart(cart: CartMap) {
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function cartQty(cart: CartMap) {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}
