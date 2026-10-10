import type { DrinkSize, DrinkSizeId, Product } from "@/data/seedProducts";
import { formatMxn } from "@/lib/format";

export function productHasSizes(product: Pick<Product, "sizes">): boolean {
  return Boolean(product.sizes && product.sizes.length > 0);
}

export function resolveSize(
  product: Pick<Product, "sizes" | "priceCents">,
  sizeId?: DrinkSizeId | null,
): DrinkSize | null {
  if (!product.sizes?.length) return null;
  if (sizeId) {
    const match = product.sizes.find((item) => item.id === sizeId);
    if (match) return match;
  }
  return product.sizes[0] ?? null;
}

export function productUnitPrice(
  product: Pick<Product, "sizes" | "priceCents">,
  sizeId?: DrinkSizeId | null,
): number {
  const size = resolveSize(product, sizeId);
  return size?.priceCents ?? product.priceCents;
}

/** Precio que se muestra en tarjetas del menú. */
export function productPriceLabel(product: Pick<Product, "sizes" | "priceCents">): string {
  if (!product.sizes?.length) return formatMxn(product.priceCents);
  const prices = product.sizes.map((item) => item.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatMxn(min);
  return `Desde ${formatMxn(min)}`;
}

export function sizeLineLabel(size?: DrinkSize | null): string | null {
  if (!size) return null;
  return size.label;
}
