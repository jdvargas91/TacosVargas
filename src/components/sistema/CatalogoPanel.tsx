import { useEffect, useState } from "react";
import { useProducts } from "@/context/ProductsContext";
import type { Product, ProductKind } from "@/data/seedProducts";
import { formatMxn } from "@/lib/format";
import { supabase } from "@/lib/supabase";

const emptyForm = {
  kind: "taco" as ProductKind,
  name: "",
  description: "",
  longDescription: "",
  ingredients: "",
  allergens: "",
  weightGrams: "",
  serving: "1 taco",
  price: "",
  stock: "0",
  soldOut: false,
  isFeatured: false,
  sortOrder: "100",
};

export function CatalogoPanel() {
  const { products, refresh } = useProducts();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createProduct() {
    if (!supabase) return;
    setError(null);
    setMessage(null);
    const priceCents = Math.round(Number(form.price) * 100);
    if (!form.name.trim() || Number.isNaN(priceCents)) {
      setError("Nombre y precio son obligatorios.");
      return;
    }
    setCreating(true);
    const { error: insertError } = await supabase.from("products").insert({
      kind: form.kind,
      name: form.name.trim(),
      description: form.description.trim(),
      long_description: form.longDescription.trim() || form.description.trim(),
      ingredients: form.ingredients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergens: form.allergens
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      weight_grams: form.weightGrams ? Number(form.weightGrams) : null,
      serving: form.serving || null,
      price_cents: priceCents,
      stock: Math.max(0, Number(form.stock) || 0),
      sold_out: form.soldOut,
      is_featured: form.isFeatured,
      sort_order: Number(form.sortOrder) || 100,
      archived: false,
    });
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(emptyForm);
    setMessage("Producto creado.");
    void refresh();
  }

  return (
    <div className="mt-8 space-y-8">
      {error ? <p className="text-terracotta">{error}</p> : null}
      {message ? <p className="text-clay">{message}</p> : null}

      <section className="card-shadow rounded-2xl bg-smoke p-5">
        <h2 className="font-display text-2xl text-ink">Nuevo producto</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-clay">
            Tipo
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as ProductKind })}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            >
              <option value="taco">Taco</option>
              <option value="drink">Bebida</option>
            </select>
          </label>
          <label className="text-sm text-clay">
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="text-sm text-clay md:col-span-2">
            Descripción corta
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="text-sm text-clay md:col-span-2">
            Descripción larga
            <textarea
              value={form.longDescription}
              onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
              className="mt-2 min-h-20 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
          <label className="text-sm text-clay">
            Precio (MXN)
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="text-sm text-clay">
            Stock inicial
            <input
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="text-sm text-clay md:col-span-2">
            Ingredientes (separados por coma)
            <input
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
        </div>
        <button type="button" disabled={creating} onClick={() => void createProduct()} className="btn-accent mt-4 h-11 px-5">
          {creating ? "Creando…" : "Crear producto"}
        </button>
      </section>

      <div className="space-y-6">
        {products.map((product) => (
          <ProductEditor key={product.id} product={product} onSaved={() => void refresh()} />
        ))}
      </div>
    </div>
  );
}

function ProductEditor({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [longDescription, setLongDescription] = useState(product.longDescription);
  const [ingredients, setIngredients] = useState(product.ingredients.join(", "));
  const [allergens, setAllergens] = useState(product.allergens.join(", "));
  const [serving, setServing] = useState(product.serving);
  const [weightGrams, setWeightGrams] = useState(String(product.weightGrams || ""));
  const [price, setPrice] = useState(String(product.priceCents / 100));
  const [stockDelta, setStockDelta] = useState("0");
  const [stockReason, setStockReason] = useState("");
  const [soldOut, setSoldOut] = useState(product.soldOut);
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [sortOrder, setSortOrder] = useState(String(product.sortOrder));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(product.name);
    setDescription(product.description);
    setLongDescription(product.longDescription);
    setIngredients(product.ingredients.join(", "));
    setAllergens(product.allergens.join(", "));
    setServing(product.serving);
    setWeightGrams(String(product.weightGrams || ""));
    setPrice(String(product.priceCents / 100));
    setSoldOut(product.soldOut);
    setIsFeatured(product.isFeatured);
    setSortOrder(String(product.sortOrder));
  }, [product]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    setMessage(null);
    const priceCents = Math.round(Number(price) * 100);
    const { error } = await supabase
      .from("products")
      .update({
        name,
        description,
        long_description: longDescription,
        ingredients: ingredients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allergens: allergens
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        serving: serving || null,
        weight_grams: weightGrams ? Number(weightGrams) : null,
        price_cents: priceCents,
        sold_out: soldOut,
        is_featured: isFeatured,
        sort_order: Number(sortOrder) || 0,
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

  async function adjustStock() {
    if (!supabase) return;
    const delta = Number(stockDelta);
    if (!delta) {
      setMessage("Indica un ajuste distinto de 0.");
      return;
    }
    const { error } = await supabase.rpc("adjust_product_stock", {
      p_product_id: product.id,
      p_delta: delta,
      p_reason: stockReason || null,
      p_sold_out: soldOut,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(`Stock ajustado (${delta > 0 ? "+" : ""}${delta})`);
      setStockDelta("0");
      setStockReason("");
      onSaved();
    }
  }

  async function archive() {
    if (!supabase) return;
    if (!confirm(`¿Archivar ${product.name}? Dejará de verse en el menú.`)) return;
    const { error } = await supabase.from("products").update({ archived: true }).eq("id", product.id);
    if (error) setMessage(error.message);
    else {
      setMessage("Archivado");
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-clay">
            Stock actual: <span className="font-medium text-ink">{product.stock}</span> · {formatMxn(product.priceCents)}
          </p>
          <button type="button" onClick={() => void archive()} className="text-sm text-terracotta">
            Archivar
          </button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink" />
        <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} className="min-h-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink" />
        <input
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Ingredientes"
          className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
        />
        <input
          value={allergens}
          onChange={(e) => setAllergens(e.target.value)}
          placeholder="Alérgenos"
          className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
        />
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-clay">
            Precio
            <input value={price} onChange={(e) => setPrice(e.target.value)} className="ml-2 h-11 w-24 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="text-sm text-clay">
            Porción
            <input value={serving} onChange={(e) => setServing(e.target.value)} className="ml-2 h-11 w-28 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="text-sm text-clay">
            Peso g
            <input value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} className="ml-2 h-11 w-24 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="text-sm text-clay">
            Orden
            <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="ml-2 h-11 w-20 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-clay">
            <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} />
            Agotado
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-clay">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            Destacado
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-ink/15 p-3">
          <label className="text-sm text-clay">
            Ajuste stock (±)
            <input value={stockDelta} onChange={(e) => setStockDelta(e.target.value)} className="ml-2 h-11 w-24 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <label className="text-sm text-clay">
            Motivo
            <input value={stockReason} onChange={(e) => setStockReason(e.target.value)} className="ml-2 h-11 w-40 rounded-xl border border-ink/15 bg-white px-3 text-ink" />
          </label>
          <button type="button" onClick={() => void adjustStock()} className="h-11 rounded-full border border-ink/15 px-4 text-ink">
            Aplicar ajuste
          </button>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
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
