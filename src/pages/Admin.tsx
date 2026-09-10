import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { ReviewsAdmin } from "@/components/ReviewsAdmin";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductsContext";
import type { Product } from "@/data/seedProducts";
import { formatMxn, shortFolio } from "@/lib/format";
import { formatFulfillment, supabase, type OrderRow } from "@/lib/supabase";
import { whatsappCustomerUrl } from "@/lib/whatsapp";
import { business } from "@/data/business";

type Tab = "pedidos" | "catalogo" | "resenas";

const statusOptions: OrderRow["status"][] = [
  "recibido",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

const statusLabel: Record<OrderRow["status"], string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function Admin() {
  const { user, loading, isStaff, signInGoogle } = useAuth();
  const { products, refresh } = useProducts();
  const [tab, setTab] = useState<Tab>("pedidos");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<"todos" | OrderRow["status"]>("todos");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff || !supabase) return;
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        else setOrders((data as OrderRow[]) ?? []);
      });
  }, [isStaff]);

  const visible = filter === "todos" ? orders : orders.filter((order) => order.status === filter);

  async function updateStatus(id: string, status: OrderRow["status"]) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
  }

  return (
    <>
      <Seo title={`Admin · ${business.name}`} description="Panel interno." noindex />
      <Header />
      <main id="contenido" className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
        {loading ? <p className="text-clay">Cargando…</p> : null}
        {!loading && user && !isStaff ? (
          <p className="text-clay">Esta cuenta no es del negocio. Pide que te agreguen a staff.</p>
        ) : null}
        {isStaff ? (
          <>
            <h1 className="font-display text-4xl text-ink">Mostrador</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab("pedidos")}
                className={`h-11 rounded-full px-4 ${tab === "pedidos" ? "bg-terracotta text-ink" : "border border-ink/15 text-ink"}`}
              >
                Pedidos
              </button>
              <button
                type="button"
                onClick={() => setTab("catalogo")}
                className={`h-11 rounded-full px-4 ${tab === "catalogo" ? "bg-terracotta text-ink" : "border border-ink/15 text-ink"}`}
              >
                Catálogo
              </button>
              <button
                type="button"
                onClick={() => setTab("resenas")}
                className={`h-11 rounded-full px-4 ${tab === "resenas" ? "bg-terracotta text-ink" : "border border-ink/15 text-ink"}`}
              >
                Reseñas
              </button>
            </div>
            {error ? <p className="mt-4 text-terracotta">{error}</p> : null}

            {tab === "pedidos" ? (
              <div className="mt-8">
                <label className="text-sm text-clay">
                  Estado
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as typeof filter)}
                    className="ml-3 h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
                  >
                    <option value="todos">Todos</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-6 space-y-4">
                  {visible.map((order) => (
                    <article key={order.id} className="card-shadow rounded-2xl bg-smoke p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-display text-2xl text-ink">{shortFolio(order.id)}</p>
                        <select
                          value={order.status}
                          onChange={(event) => void updateStatus(order.id, event.target.value as OrderRow["status"])}
                          className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-2 text-sm text-clay">
                        {order.customer_name} · {order.phone}
                      </p>
                      <p className="text-sm text-clay">
                        {formatFulfillment(order.delivery_address, order.fulfillment)}
                      </p>
                      <ul className="mt-3 text-clay">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.id}`}>
                            {item.qty}× {item.name}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-ink">{formatMxn(order.total_cents)}</p>
                      <a
                        className="mt-3 inline-block text-terracotta"
                        href={whatsappCustomerUrl(order.phone)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir en WhatsApp
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            ) : tab === "catalogo" ? (
              <CatalogEditor products={products} onSaved={() => void refresh()} />
            ) : (
              <ReviewsAdmin />
            )}
          </>
        ) : null}
      </main>
      <GoogleGateModal
        open={!loading && !user}
        title="Entra con Google"
        body="El panel es solo para el negocio."
        onClose={() => {
          window.location.href = "/";
        }}
        onConfirm={() => {
          void signInGoogle(`${window.location.origin}/admin`);
        }}
      />
    </>
  );
}

function CatalogEditor({ products, onSaved }: { products: Product[]; onSaved: () => void }) {
  return (
    <div className="mt-8 space-y-6">
      {products.map((product) => (
        <ProductEditor key={product.id} product={product} onSaved={onSaved} />
      ))}
    </div>
  );
}

function ProductEditor({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.priceCents / 100));
  const [stock, setStock] = useState(String(product.stock));
  const [soldOut, setSoldOut] = useState(product.soldOut);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(product.name);
    setDescription(product.description);
    setPrice(String(product.priceCents / 100));
    setStock(String(product.stock));
    setSoldOut(product.soldOut);
  }, [product]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    setMessage(null);
    const priceCents = Math.round(Number(price) * 100);
    const stockValue = Math.max(0, Number(stock) || 0);
    const { error } = await supabase
      .from("products")
      .update({
        name,
        description,
        price_cents: priceCents,
        stock: stockValue,
        sold_out: soldOut || stockValue === 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Guardado");
      onSaved();
    }
  }

  async function upload(file: File) {
    if (!supabase) return;
    const path = `${product.id}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) {
      setMessage(error.message);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    await supabase.from("products").update({ image_url: data.publicUrl }).eq("id", product.id);
    onSaved();
  }

  return (
    <article className="card-shadow grid gap-4 rounded-2xl bg-smoke p-5 md:grid-cols-[160px_1fr]">
      <img src={product.imageUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
      <div className="grid gap-3">
        <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink" />
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-clay">
            Precio
            <input value={price} onChange={(event) => setPrice(event.target.value)} className="ml-2 h-11 w-24 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="text-sm text-clay">
            Stock
            <input value={stock} onChange={(event) => setStock(event.target.value)} className="ml-2 h-11 w-24 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-clay">
            <input type="checkbox" checked={soldOut} onChange={(event) => setSoldOut(event.target.checked)} />
            Agotado
          </label>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button type="button" onClick={() => void save()} disabled={saving} className="btn-accent h-11 max-w-40">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {message ? <p className="text-sm text-clay">{message}</p> : null}
      </div>
    </article>
  );
}
