import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AGUA_SIZES,
  fallbackDetails,
  seedProducts,
  type DrinkSize,
  type DrinkSizeId,
  type Product,
} from "@/data/seedProducts";
import { repairMojibake } from "@/lib/text";

const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export type ProductRow = {
  id: string;
  kind: "taco" | "drink";
  name: string;
  description: string;
  long_description?: string | null;
  ingredients?: string[] | null;
  allergens?: string[] | null;
  weight_grams?: number | null;
  serving?: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
  sold_out: boolean;
  is_featured: boolean;
  sort_order: number;
  archived?: boolean | null;
  sizes?: DrinkSize[] | null;
};

export type Fulfillment = "pickup" | "delivery";

export type AddressPayload = {
  mode?: Fulfillment;
  street: string;
  colonia: string;
  references: string;
  city: string;
};

export type OrderItemPayload = {
  id: string;
  name: string;
  kind: "taco" | "drink";
  qty: number;
  unitPrice: number;
  tortillas?: 1 | 2 | null;
  size?: DrinkSizeId | null;
};

export type OrderRow = {
  id: string;
  order_number?: number | null;
  user_id: string | null;
  customer_name: string | null;
  phone: string;
  fulfillment?: Fulfillment;
  delivery_address: AddressPayload;
  items: OrderItemPayload[];
  notes: string | null;
  total_cents: number;
  payment_method: "presencial" | "tarjeta";
  payment_proof_url?: string | null;
  status: "recibido" | "en_preparacion" | "en_camino" | "entregado" | "cancelado";
  source?: "web" | "mostrador";
  created_by?: string | null;
  created_at: string;
};

function mapSizes(row: ProductRow, seed?: Product): DrinkSize[] | undefined {
  if (Array.isArray(row.sizes) && row.sizes.length > 0) {
    return row.sizes
      .map((item) => ({
        id: item.id === "grande" ? ("grande" as const) : ("chica" as const),
        label: repairMojibake(item.label || (item.id === "grande" ? "Grande" : "Chica")),
        priceCents: Number(item.priceCents ?? (item as { price_cents?: number }).price_cents ?? 0),
      }))
      .filter((item) => item.priceCents > 0);
  }
  if (seed?.sizes?.length) return seed.sizes;
  return undefined;
}

export function mapProduct(row: ProductRow): Product {
  const seed = seedProducts.find((item) => item.id === row.id);
  const details = seed ?? fallbackDetails(row);
  const name = repairMojibake(row.name);
  const description = repairMojibake(row.description);
  const longFromDb = repairMojibake(row.long_description || "");
  const sizes = mapSizes(row, seed);
  return {
    id: row.id,
    kind: row.kind,
    name: /[ÃÂ]/.test(row.name) && seed ? seed.name : name,
    description: /[ÃÂ]/.test(row.description) && seed ? seed.description : description,
    longDescription: longFromDb || details.longDescription,
    ingredients: row.ingredients?.length ? row.ingredients.map(repairMojibake) : details.ingredients,
    weightGrams: row.weight_grams ?? details.weightGrams,
    serving: repairMojibake(row.serving || "") || details.serving,
    allergens: row.allergens?.length ? row.allergens.map(repairMojibake) : details.allergens,
    priceCents: sizes?.length ? Math.min(...sizes.map((s) => s.priceCents)) : row.price_cents,
    imageUrl: row.image_url || seed?.imageUrl || "/products/camaron_capeado.webp",
    stock: row.stock,
    soldOut: row.sold_out,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    sizes,
  };
}

export { AGUA_SIZES };

export function formatAddress(address: AddressPayload) {
  return [address.street, address.colonia, address.references, address.city]
    .filter(Boolean)
    .join(", ");
}

export function formatFulfillment(address: AddressPayload, fulfillment?: Fulfillment) {
  const mode = fulfillment ?? address.mode;
  if (mode === "delivery") return "Recoger en el local";
  return "Recoger en el local";
}
