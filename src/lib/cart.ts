import type { DrinkSizeId } from "@/data/seedProducts";

const KEY = "tv-cart-v2";
const LEGACY_KEY = "tv-cart-v1";

/** Cantidad por línea. Clave: productId, productId::t1/t2 (tacos) o productId::sz-chica/grande (aguas). */
export type CartMap = Record<string, number>;

export type Tortillas = 1 | 2;

export type CartLineOpts = {
  tortillas?: Tortillas;
  size?: DrinkSizeId;
};

export function cartLineKey(productId: string, opts?: Tortillas | CartLineOpts) {
  if (opts === 1 || opts === 2) return `${productId}::t${opts}`;
  if (opts && typeof opts === "object") {
    if (opts.tortillas === 1 || opts.tortillas === 2) return `${productId}::t${opts.tortillas}`;
    if (opts.size === "chica" || opts.size === "grande") return `${productId}::sz-${opts.size}`;
  }
  return productId;
}

export function parseCartLineKey(key: string): {
  productId: string;
  tortillas?: Tortillas;
  size?: DrinkSizeId;
} {
  const sizeMatch = key.match(/^(.*)::sz-(chica|grande)$/);
  if (sizeMatch) return { productId: sizeMatch[1], size: sizeMatch[2] as DrinkSizeId };
  const match = key.match(/^(.*)::t([12])$/);
  if (match) return { productId: match[1], tortillas: Number(match[2]) as Tortillas };
  return { productId: key };
}

export function readCart(): CartMap {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CartMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
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

export function cartQtyForProduct(cart: CartMap, productId: string) {
  return Object.entries(cart).reduce((sum, [key, qty]) => {
    const parsed = parseCartLineKey(key);
    return parsed.productId === productId ? sum + qty : sum;
  }, 0);
}
