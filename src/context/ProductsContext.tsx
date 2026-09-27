import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedProducts, type Product } from "@/data/seedProducts";
import { mapProduct, supabase, type ProductRow } from "@/lib/supabase";

type ProductsContextValue = {
  products: Product[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [loading, setLoading] = useState(Boolean(supabase));

  const refresh = useCallback(async () => {
    if (!supabase) {
      setProducts(seedProducts);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("archived", false)
      .order("sort_order", { ascending: true });
    if (error || !data) {
      // archived column may not exist yet — fallback without filter
      const fallback = await supabase.from("products").select("*").order("sort_order", { ascending: true });
      if (fallback.error || !fallback.data) {
        setProducts(seedProducts);
      } else {
        setProducts((fallback.data as ProductRow[]).filter((row) => !row.archived).map(mapProduct));
      }
    } else {
      setProducts((data as ProductRow[]).map(mapProduct));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ products, loading, refresh }), [loading, products, refresh]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts debe usarse dentro de ProductsProvider");
  return ctx;
}
