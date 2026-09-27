import { useEffect, useState, type ReactNode } from "react";
import { PackageMinus, PackagePlus, Save, Warehouse } from "lucide-react";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
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
  stock: "50",
  soldOut: false,
  isFeatured: false,
  sortOrder: "100",
};

const fieldClass = "mt-2 h-11 w-full rounded-[10px] border border-ink/15 bg-white px-3 text-ink";
const areaClass = "mt-2 min-h-20 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink";

const kindOptions = [
  { value: "taco", label: "Taco" },
  { value: "drink", label: "Bebida" },
];

export function CatalogoPanel() {
  const { products, refresh } = useProducts();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function createProduct() {
    if (!supabase) return;
    setError(null);
    setMessage(null);
    const priceCents = Math.round(Number(form.price) * 100);
    if (!form.name.trim() || Number.isNaN(priceCents)) {
      setError("El nombre y el precio son obligatorios.");
      return;
    }
    setCreating(true);
    const { data, error: insertError } = await supabase
      .from("products")
      .insert({
        kind: form.kind,
        name: form.name.trim(),
        description: form.description.trim(),
        long_description: form.longDescription.trim() || form.description.trim(),
        ingredients: splitList(form.ingredients),
        allergens: splitList(form.allergens),
        weight_grams: form.weightGrams ? Number(form.weightGrams) : null,
        serving: form.serving || null,
        price_cents: priceCents,
        stock: Math.max(0, Number(form.stock) || 0),
        sold_out: form.soldOut,
        is_featured: form.isFeatured,
        sort_order: Number(form.sortOrder) || 100,
        archived: false,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setCreating(false);
      setError(insertError?.message ?? "No se pudo crear el producto.");
      return;
    }

    if (imageFile) {
      const path = `${data.id}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, imageFile, {
        upsert: true,
      });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        await supabase.from("products").update({ image_url: pub.publicUrl }).eq("id", data.id);
      }
    }

    setCreating(false);
    setForm(emptyForm);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setMessage("Producto agregado al menú.");
    void refresh();
  }

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-clay">
        Aquí armas el menú que ve el cliente en la página. Puedes dar de alta tacos o bebidas, subir foto, marcar si ya
        no hay y sumar o restar piezas del almacén.
      </p>

      {error ? <p className="rounded-[10px] border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</p> : null}
      {message ? <p className="rounded-[10px] border border-ink/10 bg-paper px-4 py-3 text-sm text-clay">{message}</p> : null}

      <section className="card-shadow rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Agregar producto al menú</h2>
        <p className="mt-1 text-sm text-clay">Completa los mismos datos que usas al editar un producto ya existente.</p>

        <div className="mt-5 grid gap-5 md:grid-cols-[160px_1fr]">
          <MediaUpload
            value={imagePreview}
            label="Foto del producto"
            onChange={(file) => {
              if (imagePreview) URL.revokeObjectURL(imagePreview);
              setImageFile(file);
              setImagePreview(URL.createObjectURL(file));
            }}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tipo de producto" hint="Taco o bebida">
              <Select
                className="mt-2"
                value={form.kind}
                onValueChange={(v) => {
                  const kind = v as ProductKind;
                  setForm({
                    ...form,
                    kind,
                    serving: kind === "taco" ? "1 taco" : "1 porción",
                  });
                }}
                options={kindOptions}
                aria-label="Tipo de producto"
              />
            </Field>
            <Field label="Nombre" hint="Cómo aparece en el menú">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
            </Field>
            <Field label="Descripción corta" hint="Una o dos líneas bajo el nombre" className="md:col-span-2">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={fieldClass}
              />
            </Field>
            <Field label="Descripción completa" hint="Texto de la ficha del producto" className="md:col-span-2">
              <textarea
                value={form.longDescription}
                onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                className={areaClass}
              />
            </Field>
            <Field label="Ingredientes" hint="Sepáralos con coma">
              <input
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                className={fieldClass}
                placeholder="Tortilla de maíz, Camarón, Salsa…"
              />
            </Field>
            <Field label="Alérgenos" hint="Sepáralos con coma">
              <input
                value={form.allergens}
                onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                className={fieldClass}
                placeholder="Maíz, Gluten…"
              />
            </Field>
            <Field label="Precio (pesos MXN)" hint="Sin el signo de pesos">
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={fieldClass} inputMode="decimal" />
            </Field>
            <Field label="Existencias iniciales" hint="Cuántas piezas hay al darlo de alta">
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={fieldClass} inputMode="numeric" />
            </Field>
            <Field label="Porción" hint="Ej. 1 taco o vaso chico">
              <input value={form.serving} onChange={(e) => setForm({ ...form, serving: e.target.value })} className={fieldClass} />
            </Field>
            <Field label="Peso aproximado (gramos)" hint="Opcional">
              <input
                value={form.weightGrams}
                onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
                className={fieldClass}
                inputMode="numeric"
              />
            </Field>
            <Field label="Orden en el menú" hint="Número más chico = aparece primero">
              <input
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className={fieldClass}
                inputMode="numeric"
              />
            </Field>
            <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
              <Switch
                checked={form.soldOut}
                onCheckedChange={(soldOut) => setForm({ ...form, soldOut })}
                label="Marcar como agotado"
                description="Si está encendido, el cliente no puede pedirlo aunque haya existencias."
              />
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(isFeatured) => setForm({ ...form, isFeatured })}
                label="Destacar en el menú"
                description="Lo muestra con prioridad / como especialidad de la casa."
              />
            </div>
          </div>
        </div>

        <button type="button" disabled={creating} onClick={() => void createProduct()} className="btn-accent mt-6 h-12 px-6">
          <PackagePlus size={16} aria-hidden />
          {creating ? "Guardando…" : "Agregar al menú"}
        </button>
      </section>

      <div>
        <h2 className="font-display text-2xl text-ink">Productos del menú</h2>
        <p className="mt-1 text-sm text-clay">{products.length} productos activos</p>
        <div className="mt-5 space-y-6">
          {products.map((product) => (
            <ProductEditor key={product.id} product={product} onSaved={() => void refresh()} />
          ))}
        </div>
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
  const [stockDelta, setStockDelta] = useState("");
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
        ingredients: splitList(ingredients),
        allergens: splitList(allergens),
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
      setMessage("Cambios guardados.");
      onSaved();
    }
  }

  async function adjustStock() {
    if (!supabase) return;
    const delta = Number(stockDelta);
    if (!delta || Number.isNaN(delta)) {
      setMessage("Escribe cuántas piezas sumar (+) o restar (−). Ejemplo: 10 o -5.");
      return;
    }
    const { error } = await supabase.rpc("adjust_product_stock", {
      p_product_id: product.id,
      p_delta: delta,
      p_reason: stockReason.trim() || null,
      p_sold_out: soldOut,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(
        delta > 0
          ? `Se sumaron ${delta} piezas. Ahora hay ${product.stock + delta} en existencia.`
          : `Se restaron ${Math.abs(delta)} piezas. Ahora hay ${Math.max(0, product.stock + delta)} en existencia.`,
      );
      setStockDelta("");
      setStockReason("");
      onSaved();
    }
  }

  async function archive() {
    if (!supabase) return;
    if (
      !confirm(
        `¿Quitar “${product.name}” del menú público?\n\nEl producto deja de mostrarse a los clientes. No se borra del historial; puedes volver a darlo de alta después si hace falta.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("products").update({ archived: true }).eq("id", product.id);
    if (error) setMessage(error.message);
    else {
      setMessage("Producto oculto del menú.");
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
    setMessage("Foto actualizada.");
    onSaved();
  }

  return (
    <article className="card-shadow grid gap-5 rounded-[10px] border border-ink/8 bg-smoke p-5 md:grid-cols-[160px_1fr] md:p-6">
      <MediaUpload value={product.imageUrl} label="Foto del producto" onChange={(file) => void upload(file)} />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-clay">
              En existencia: <span className="font-semibold text-ink">{product.stock}</span> ·{" "}
              {formatMxn(product.priceCents)}
            </p>
            <p className="mt-0.5 text-xs text-clay">Lo que ve el cliente en el menú público</p>
          </div>
          <button
            type="button"
            onClick={() => void archive()}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-terracotta/40 px-4 text-sm font-medium text-terracotta"
          >
            <PackageMinus size={16} aria-hidden />
            Quitar del menú
          </button>
        </div>

        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Descripción corta">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={areaClass} />
        </Field>
        <Field label="Descripción completa">
          <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} className={areaClass} />
        </Field>
        <Field label="Ingredientes" hint="Sepáralos con coma">
          <input value={ingredients} onChange={(e) => setIngredients(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Alérgenos" hint="Sepáralos con coma">
          <input value={allergens} onChange={(e) => setAllergens(e.target.value)} className={fieldClass} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Precio (pesos MXN)">
            <input value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} inputMode="decimal" />
          </Field>
          <Field label="Porción">
            <input value={serving} onChange={(e) => setServing(e.target.value)} className={fieldClass} />
          </Field>
          <Field label="Peso (gramos)">
            <input value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} className={fieldClass} inputMode="numeric" />
          </Field>
          <Field label="Orden en el menú" hint="Más chico = primero">
            <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={fieldClass} inputMode="numeric" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Switch
            checked={soldOut}
            onCheckedChange={setSoldOut}
            label="Marcar como agotado"
            description="Si está encendido, el cliente no puede pedirlo. Úsalo cuando se acabó por hoy."
          />
          <Switch
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
            label="Destacar en el menú"
            description="Resalta este producto como especialidad o recomendación."
          />
        </div>

        <div className="rounded-[10px] border border-dashed border-ink/20 bg-paper/70 p-4">
          <p className="font-medium text-ink">Actualizar existencias (almacén)</p>
          <p className="mt-1 text-sm text-clay">
            Aquí no escribes el total nuevo: escribes cuánto <strong className="font-medium text-ink">sumar o restar</strong>.
            Ejemplo: llegó mercancía → escribe <code className="rounded bg-smoke px-1">10</code>. Se echó a perder o se
            usó → escribe <code className="rounded bg-smoke px-1">-5</code>. El motivo queda anotado para saber por qué
            cambió.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr_auto]">
            <Field label="Cantidad (±)">
              <input
                value={stockDelta}
                onChange={(e) => setStockDelta(e.target.value)}
                className={fieldClass}
                placeholder="10 o -5"
                inputMode="numeric"
              />
            </Field>
            <Field label="Motivo" hint="Ej. llegada de proveedor, merma, conteo">
              <input
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                className={fieldClass}
                placeholder="Llegada de proveedor"
              />
            </Field>
            <div className="flex items-end">
              <button type="button" onClick={() => void adjustStock()} className="btn-secondary h-11 w-full px-4 text-sm sm:w-auto">
                <Warehouse size={16} aria-hidden />
                Aplicar cambio
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-accent h-11 px-6">
            <Save size={16} aria-hidden />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {message ? <p className="text-sm text-clay">{message}</p> : null}
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm text-clay ${className}`}>
      <span className="font-medium text-ink/80">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-clay">{hint}</span> : null}
      {children}
    </label>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
