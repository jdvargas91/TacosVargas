import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fallbackDetails, seedProducts, type Product } from "@/data/seedProducts";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, key, {
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
  price_cents: number;
  image_url: string | null;
  stock: number;
  sold_out: boolean;
  is_featured: boolean;
  sort_order: number;
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
};

export type OrderRow = {
  id: string;
  user_id: string;
  customer_name: string | null;
  phone: string;
  fulfillment?: Fulfillment;
  delivery_address: AddressPayload;
  items: OrderItemPayload[];
  notes: string | null;
  total_cents: number;
  payment_method: "presencial";
  status: "recibido" | "en_preparacion" | "en_camino" | "entregado" | "cancelado";
  created_at: string;
};

export function mapProduct(row: ProductRow): Product {
  const seed = seedProducts.find((item) => item.id === row.id);
  const details = seed ?? fallbackDetails(row);
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    longDescription: details.longDescription,
    ingredients: details.ingredients,
    weightGrams: details.weightGrams,
    serving: details.serving,
    allergens: details.allergens,
    priceCents: row.price_cents,
    imageUrl: row.image_url || "/products/fallback.jpg",
    stock: row.stock,
    soldOut: row.sold_out,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
  };
}

export function formatAddress(address: AddressPayload) {
  return [address.street, address.colonia, address.references, address.city]
    .filter(Boolean)
    .join(", ");
}

export function formatFulfillment(address: AddressPayload, fulfillment?: Fulfillment) {
  const mode = fulfillment ?? address.mode;
  if (mode === "pickup") return "Recoger en el local";
  const line = formatAddress(address);
  return line ? `Mensajería · ${line}` : "Mensajería";
}
