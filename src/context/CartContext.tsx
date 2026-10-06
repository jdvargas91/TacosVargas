import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cartLineKey,
  cartQty,
  cartQtyForProduct,
  parseCartLineKey,
  readCart,
  writeCart,
  type CartMap,
  type Tortillas,
} from "@/lib/cart";
import { isProductAvailable } from "@/lib/format";
import { useProducts } from "@/context/ProductsContext";

type CartContextValue = {
  cart: CartMap;
  totalItems: number;
  qtyForProduct: (productId: string) => number;
  setQty: (productId: string, qty: number, tortillas?: Tortillas) => void;
  addQty: (productId: string, delta?: number, tortillas?: Tortillas) => void;
  setLineTortillas: (productId: string, from: Tortillas, to: Tortillas) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [cart, setCart] = useState<CartMap>({});

  useEffect(() => {
    setCart(readCart());
  }, []);

  useEffect(() => {
    setCart((current) => {
      const next: CartMap = { ...current };
      let changed = false;
      const byProduct = new Map<string, number>();
      for (const [key, qty] of Object.entries(next)) {
        const { productId } = parseCartLineKey(key);
        byProduct.set(productId, (byProduct.get(productId) ?? 0) + qty);
      }
      for (const product of products) {
        const total = byProduct.get(product.id) ?? 0;
        if (!total) continue;
        const max = isProductAvailable(product.soldOut, product.stock) ? product.stock : 0;
        if (total > max) {
          // Recorta líneas del producto si supera stock
          let remaining = max;
          for (const key of Object.keys(next)) {
            const parsed = parseCartLineKey(key);
            if (parsed.productId !== product.id) continue;
            if (remaining <= 0) {
              delete next[key];
              changed = true;
              continue;
            }
            if (next[key] > remaining) {
              next[key] = remaining;
              remaining = 0;
              changed = true;
            } else {
              remaining -= next[key];
            }
          }
        }
      }
      if (changed) writeCart(next);
      return changed ? next : current;
    });
  }, [products]);

  const setQty = useCallback(
    (productId: string, qty: number, tortillas?: Tortillas) => {
      setCart((current) => {
        const product = products.find((item) => item.id === productId);
        const max = product && isProductAvailable(product.soldOut, product.stock) ? product.stock : 0;
        const key = cartLineKey(productId, product?.kind === "taco" ? tortillas ?? 2 : undefined);
        const others = cartQtyForProduct(current, productId) - (current[key] ?? 0);
        const nextQty = Math.max(0, Math.min(qty, Math.max(0, max - others)));
        const next = { ...current };
        if (nextQty <= 0) delete next[key];
        else next[key] = nextQty;
        writeCart(next);
        return next;
      });
    },
    [products],
  );

  const addQty = useCallback(
    (productId: string, delta = 1, tortillas?: Tortillas) => {
      setCart((current) => {
        const product = products.find((item) => item.id === productId);
        const max = product && isProductAvailable(product.soldOut, product.stock) ? product.stock : 0;
        const key = cartLineKey(productId, product?.kind === "taco" ? tortillas ?? 2 : undefined);
        const others = cartQtyForProduct(current, productId) - (current[key] ?? 0);
        const nextQty = Math.max(0, Math.min((current[key] ?? 0) + delta, Math.max(0, max - others)));
        const next = { ...current };
        if (nextQty <= 0) delete next[key];
        else next[key] = nextQty;
        writeCart(next);
        return next;
      });
    },
    [products],
  );

  /**
   * Cambia las tortillas de una línea de taco conservando su posición en el carrito.
   * Si ya existe una línea con las tortillas destino, fusiona las cantidades (sin duplicar).
   */
  const setLineTortillas = useCallback((productId: string, from: Tortillas, to: Tortillas) => {
    if (from === to) return;
    setCart((current) => {
      const fromKey = cartLineKey(productId, from);
      if (!current[fromKey]) return current;
      const toKey = cartLineKey(productId, to);
      // Reconstruimos en el mismo orden; fromKey se mapea a toKey y se suma donde toque.
      const next: CartMap = {};
      for (const [key, qty] of Object.entries(current)) {
        const finalKey = key === fromKey ? toKey : key;
        next[finalKey] = (next[finalKey] ?? 0) + qty;
      }
      writeCart(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeCart({});
    setCart({});
  }, []);

  const qtyForProduct = useCallback((productId: string) => cartQtyForProduct(cart, productId), [cart]);

  const value = useMemo(
    () => ({ cart, totalItems: cartQty(cart), qtyForProduct, setQty, addQty, setLineTortillas, clear }),
    [cart, clear, setQty, addQty, setLineTortillas, qtyForProduct],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
