import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartQty, readCart, writeCart, type CartMap } from "@/lib/cart";
import { isProductAvailable } from "@/lib/format";
import { useProducts } from "@/context/ProductsContext";

type CartContextValue = {
  cart: CartMap;
  totalItems: number;
  setQty: (productId: string, qty: number) => void;
  addQty: (productId: string, delta?: number) => void;
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
      for (const product of products) {
        const qty = next[product.id] ?? 0;
        if (!qty) continue;
        const max = isProductAvailable(product.soldOut, product.stock) ? product.stock : 0;
        if (qty > max) {
          if (max <= 0) delete next[product.id];
          else next[product.id] = max;
          changed = true;
        }
      }
      if (changed) writeCart(next);
      return changed ? next : current;
    });
  }, [products]);

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((current) => {
      const product = products.find((item) => item.id === productId);
      const max = product && isProductAvailable(product.soldOut, product.stock) ? product.stock : 0;
      const nextQty = Math.max(0, Math.min(qty, max));
      const next = { ...current };
      if (nextQty <= 0) delete next[productId];
      else next[productId] = nextQty;
      writeCart(next);
      return next;
    });
  }, [products]);

  const addQty = useCallback(
    (productId: string, delta = 1) => {
      setCart((current) => {
        const product = products.find((item) => item.id === productId);
        const max = product && isProductAvailable(product.soldOut, product.stock) ? product.stock : 0;
        const nextQty = Math.max(0, Math.min((current[productId] ?? 0) + delta, max));
        const next = { ...current };
        if (nextQty <= 0) delete next[productId];
        else next[productId] = nextQty;
        writeCart(next);
        return next;
      });
    },
    [products],
  );

  const clear = useCallback(() => {
    writeCart({});
    setCart({});
  }, []);

  const value = useMemo(
    () => ({ cart, totalItems: cartQty(cart), setQty, addQty, clear }),
    [cart, clear, setQty, addQty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
