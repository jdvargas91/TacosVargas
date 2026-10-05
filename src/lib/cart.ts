const KEY = "tv-cart-v2";
const LEGACY_KEY = "tv-cart-v1";

/** Cantidad por línea. Clave: productId o productId::t1 / productId::t2 para tacos. */
export type CartMap = Record<string, number>;

export type Tortillas = 1 | 2;

export function cartLineKey(productId: string, tortillas?: Tortillas) {
  if (tortillas === 1 || tortillas === 2) return `${productId}::t${tortillas}`;
  return productId;
}

export function parseCartLineKey(key: string): { productId: string; tortillas?: Tortillas } {
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
    // Migrar carrito v1 (solo ids) a claves con 2 tortillas por defecto para tacos se hace al agregar.
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
