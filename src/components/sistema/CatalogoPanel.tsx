import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PackageMinus, PackagePlus, Pencil, Save, Search, Warehouse, X } from "lucide-react";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useProducts } from "@/context/ProductsContext";
import { AGUA_SIZES, type Product, type ProductKind } from "@/data/seedProducts";
import { productHasSizes, productPriceLabel } from "@/lib/productPricing";
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
  priceChica: "22",
  priceGrande: "38",
  hasSizes: false,
  stock: "100",
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
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const editing = products.find((p) => p.id === editingId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function openCreate() {
    setError(null);
    setMessage(null);
    setForm(emptyForm);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setEditingId(null);
    setMode("create");
  }

  function openEdit(product: Product) {
    setError(null);
    setMessage(null);
    setEditingId(product.id);
    setMode("edit");
  }

  function cancelForm() {
    setMode("list");
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setError(null);
  }

  async function createProduct() {
    if (!supabase) return;
    setError(null);
    setMessage(null);
    const usingSizes = form.kind === "drink" && form.hasSizes;
    const chicaCents = Math.round(Number(form.priceChica) * 100);
    const grandeCents = Math.round(Number(form.priceGrande) * 100);
    const priceCents = usingSizes ? chicaCents : Math.round(Number(form.price) * 100);
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!form.description.trim()) {
      setError("La descripción corta es obligatoria.");
      return;
    }
    if (usingSizes) {
      if (Number.isNaN(chicaCents) || chicaCents < 0 || Number.isNaN(grandeCents) || grandeCents < 0) {
        setError("Escribe precios válidos para chica y grande.");
        return;
      }
    } else if (Number.isNaN(priceCents) || priceCents < 0) {
      setError("Escribe un precio válido en pesos.");
      return;
    }
    if (form.kind === "taco" && !form.serving.trim()) {
      setError("La porción es obligatoria.");
      return;
    }
    setCreating(true);
    const sizesPayload = usingSizes
      ? [
          { id: "chica", label: "Chica", priceCents: chicaCents },
          { id: "grande", label: "Grande", priceCents: grandeCents },
        ]
      : null;
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
        serving: usingSizes ? "Agua fresca" : form.serving || null,
        price_cents: priceCents,
        sizes: sizesPayload,
        stock: 100,
        sold_out: false,
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
    setMessage("Producto agregado al menú.");
    cancelForm();
    void refresh();
  }

  if (mode === "create") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">Nuevo producto</h2>
            <p className="mt-1 text-sm text-clay">Completa los datos para publicarlo en el menú.</p>
          </div>
        </div>

        {error ? (
          <p className="rounded-[10px] border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            {error}
          </p>
        ) : null}

        <section className="card-shadow rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[160px_1fr]">
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
              <Field label="Tipo de producto" hint="Taco o bebida" required>
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
              <Field label="Nombre" hint="Cómo aparece en el menú" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
              </Field>
              <Field label="Descripción corta" hint="Una o dos líneas bajo el nombre" className="md:col-span-2" required>
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
              {form.kind === "taco" ? (
                <>
                  <Field label="Ingredientes" hint="Sepáralos con coma">
                    <input
                      value={form.ingredients}
                      onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                      className={fieldClass}
                      placeholder="Tortilla de maíz, Camarón, Salsa…"
                    />
                  </Field>
                  <Field label="Contiene" hint="Alimentos que pueden causar reacción. Sepáralos con coma">
                    <input
                      value={form.allergens}
                      onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                      className={fieldClass}
                      placeholder="Maíz, Gluten…"
                    />
                  </Field>
                  <Field label="Porción" hint="Ej. 1 taco" required>
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
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <Switch
                      checked={form.hasSizes}
                      onCheckedChange={(hasSizes) =>
                        setForm({
                          ...form,
                          hasSizes,
                          priceChica: hasSizes ? form.priceChica || "22" : form.priceChica,
                          priceGrande: hasSizes ? form.priceGrande || "38" : form.priceGrande,
                        })
                      }
                      label="Agua con tamaños (chica / grande)"
                      description="El cliente elige el tamaño en la ficha. Chica $22 y grande $38 por defecto."
                    />
                  </div>
                  {form.hasSizes ? (
                    <Field label="Sabores / notas" hint="Opcional. No pongas agua ni azúcar. Sepáralos con coma" className="md:col-span-2">
                      <input
                        value={form.ingredients}
                        onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                        className={fieldClass}
                        placeholder="Ej. Chía"
                      />
                    </Field>
                  ) : (
                    <Field label="Contiene" hint="Opcional. Sepáralos con coma" className="md:col-span-2">
                      <input
                        value={form.allergens}
                        onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                        className={fieldClass}
                        placeholder="Opcional…"
                      />
                    </Field>
                  )}
                </>
              )}
              {form.kind === "drink" && form.hasSizes ? (
                <>
                  <Field label="Precio chica (MXN)" hint="Ej. 22" required>
                    <input
                      value={form.priceChica}
                      onChange={(e) => setForm({ ...form, priceChica: e.target.value })}
                      className={fieldClass}
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label="Precio grande (MXN)" hint="Ej. 38" required>
                    <input
                      value={form.priceGrande}
                      onChange={(e) => setForm({ ...form, priceGrande: e.target.value })}
                      className={fieldClass}
                      inputMode="decimal"
                    />
                  </Field>
                </>
              ) : (
                <Field label="Precio (pesos MXN)" hint="Sin el signo de pesos" required>
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className={fieldClass}
                    inputMode="decimal"
                  />
                </Field>
              )}
              <Field label="Orden en el menú" hint="Número más chico = aparece primero" required>
                <input
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className={fieldClass}
                  inputMode="numeric"
                />
              </Field>
              <div className="md:col-span-2">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(isFeatured) => setForm({ ...form, isFeatured })}
                  label="Destacar en el menú"
                  description="Lo muestra con prioridad / como especialidad de la casa."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={cancelForm} className="btn-secondary h-12 px-6">
              <X size={16} aria-hidden />
              Cancelar
            </button>
            <button type="button" disabled={creating} onClick={() => void createProduct()} className="btn-accent h-12 px-6">
              <PackagePlus size={16} aria-hidden />
              {creating ? "Guardando…" : "Crear producto"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (mode === "edit") {
    if (!editing) {
      return (
        <div className="space-y-4">
          <p className="text-clay">Ese producto ya no está en el menú.</p>
          <button type="button" onClick={cancelForm} className="btn-secondary h-11 px-5">
            Volver al listado
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl text-ink">Editar producto</h2>
          <p className="mt-1 text-sm text-clay">{editing.name}</p>
        </div>
        <ProductEditor product={editing} onSaved={() => void refresh()} onCancel={cancelForm} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-clay">
        Aquí armas el menú que ve el cliente en la página. Puedes dar de alta tacos o bebidas, subir foto, marcar si ya
        no hay y sumar o restar piezas del almacén.
      </p>

      {error ? (
        <p className="rounded-[10px] border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</p>
      ) : null}
      {message ? <p className="rounded-[10px] border border-ink/10 bg-paper px-4 py-3 text-sm text-clay">{message}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1 py-1 sm:max-w-sm">
          <span className="sr-only">Buscar por nombre</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-clay" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            className="h-11 w-full rounded-[10px] border border-ink/15 bg-white pl-10 pr-3 text-ink focus-visible:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35"
          />
        </label>
        <button type="button" onClick={openCreate} className="btn-accent h-11 shrink-0 self-end px-5 sm:self-auto">
          <PackagePlus size={16} aria-hidden />
          Crear producto
        </button>
      </div>

      <p className="text-sm text-clay">
        {filtered.length} de {products.length} producto{products.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-ink/15 bg-smoke/60 px-6 py-12 text-center">
          <p className="text-clay">{query.trim() ? "Ningún producto coincide con la búsqueda." : "Aún no hay productos."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-ink/10 bg-smoke">
          <ul className="divide-y divide-ink/10">
            {filtered.map((product) => (
              <li key={product.id}>
                <article className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-paper sm:h-[4.5rem] sm:w-[4.5rem]">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        width={72}
                        height={72}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[10px] text-clay">Sin foto</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="truncate font-medium text-ink">{product.name}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                        {productPriceLabel(product)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-clay sm:text-sm">
                      {product.kind === "drink" ? (productHasSizes(product) ? "Agua fresca" : "Bebida") : "Taco"}
                      <span className="mx-1.5 text-ink/25">·</span>
                      {product.stock} en existencia
                      {product.soldOut ? (
                        <>
                          <span className="mx-1.5 text-ink/25">·</span>
                          <span className="text-terracotta">Agotado</span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[7.5rem_7.5rem]">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-ink/15 bg-white px-3 text-sm font-medium text-ink"
                    >
                      <Pencil size={14} aria-hidden />
                      Editar
                    </button>
                    <DeleteProductButton product={product} onDone={() => void refresh()} />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DeleteProductButton({ product, onDone }: { product: Product; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!supabase) return;
    if (
      !confirm(
        `¿Eliminar “${product.name}” del menú?\n\nDejará de mostrarse a los clientes. Esta acción pide confirmación a propósito.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("products").update({ archived: true }).eq("id", product.id);
    setBusy(false);
    if (error) alert(error.message);
    else onDone();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void remove()}
      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-terracotta/40 bg-white px-3 text-sm font-medium text-terracotta disabled:opacity-50"
    >
      <PackageMinus size={14} aria-hidden />
      {busy ? "…" : "Eliminar"}
    </button>
  );
}

function ProductEditor({
  product,
  onSaved,
  onCancel,
}: {
  product: Product;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [longDescription, setLongDescription] = useState(product.longDescription);
  const [ingredients, setIngredients] = useState(product.ingredients.join(", "));
  const [allergens, setAllergens] = useState(product.allergens.join(", "));
  const [serving, setServing] = useState(product.serving);
  const [weightGrams, setWeightGrams] = useState(String(product.weightGrams || ""));
  const [price, setPrice] = useState(String(product.priceCents / 100));
  const [hasSizes, setHasSizes] = useState(productHasSizes(product));
  const [priceChica, setPriceChica] = useState(
    String((product.sizes?.find((s) => s.id === "chica")?.priceCents ?? AGUA_SIZES[0].priceCents) / 100),
  );
  const [priceGrande, setPriceGrande] = useState(
    String((product.sizes?.find((s) => s.id === "grande")?.priceCents ?? AGUA_SIZES[1].priceCents) / 100),
  );
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
    setHasSizes(productHasSizes(product));
    setPriceChica(
      String((product.sizes?.find((s) => s.id === "chica")?.priceCents ?? AGUA_SIZES[0].priceCents) / 100),
    );
    setPriceGrande(
      String((product.sizes?.find((s) => s.id === "grande")?.priceCents ?? AGUA_SIZES[1].priceCents) / 100),
    );
    setSoldOut(product.soldOut);
    setIsFeatured(product.isFeatured);
    setSortOrder(String(product.sortOrder));
  }, [product]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    setMessage(null);
    const usingSizes = product.kind === "drink" && hasSizes;
    const chicaCents = Math.round(Number(priceChica) * 100);
    const grandeCents = Math.round(Number(priceGrande) * 100);
    const priceCents = usingSizes ? chicaCents : Math.round(Number(price) * 100);
    if (!name.trim() || Number.isNaN(priceCents) || priceCents < 0) {
      setMessage("El nombre y el precio son obligatorios.");
      setSaving(false);
      return;
    }
    if (usingSizes && (Number.isNaN(grandeCents) || grandeCents < 0)) {
      setMessage("Escribe precios válidos para chica y grande.");
      setSaving(false);
      return;
    }
    const sizesPayload = usingSizes
      ? [
          { id: "chica", label: "Chica", priceCents: chicaCents },
          { id: "grande", label: "Grande", priceCents: grandeCents },
        ]
      : null;
    const { error } = await supabase
      .from("products")
      .update({
        name,
        description,
        long_description: longDescription,
        ingredients: splitList(ingredients),
        allergens: splitList(allergens),
        serving: usingSizes ? "Agua fresca" : serving || null,
        weight_grams: weightGrams ? Number(weightGrams) : null,
        price_cents: priceCents,
        sizes: sizesPayload,
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
        <div>
          <p className="text-sm text-clay">
            En existencia: <span className="font-semibold text-ink">{product.stock}</span> ·{" "}
            {productPriceLabel(product)}
          </p>
          <p className="mt-0.5 text-xs text-clay">Lo que ve el cliente en el menú público</p>
        </div>

        <Field label="Nombre" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Descripción corta" required>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={areaClass} />
        </Field>
        <Field label="Descripción completa">
          <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} className={areaClass} />
        </Field>
        {product.kind === "taco" ? (
          <>
            <Field label="Ingredientes" hint="Sepáralos con coma">
              <input value={ingredients} onChange={(e) => setIngredients(e.target.value)} className={fieldClass} />
            </Field>
            <Field label="Contiene" hint="Alimentos que pueden causar reacción. Sepáralos con coma">
              <input value={allergens} onChange={(e) => setAllergens(e.target.value)} className={fieldClass} />
            </Field>
          </>
        ) : (
          <>
            <Switch
              checked={hasSizes}
              onCheckedChange={setHasSizes}
              label="Agua con tamaños (chica / grande)"
              description="Actívalo para jamaica, piña y demás aguas frescas. El cliente elige el tamaño."
            />
            {hasSizes ? (
              <Field label="Sabores / notas" hint="Opcional. No pongas agua ni azúcar">
                <input value={ingredients} onChange={(e) => setIngredients(e.target.value)} className={fieldClass} />
              </Field>
            ) : (
              <Field label="Contiene" hint="Opcional. Sepáralos con coma">
                <input value={allergens} onChange={(e) => setAllergens(e.target.value)} className={fieldClass} />
              </Field>
            )}
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {product.kind === "drink" && hasSizes ? (
            <>
              <Field label="Precio chica (MXN)" required>
                <input
                  value={priceChica}
                  onChange={(e) => setPriceChica(e.target.value)}
                  className={fieldClass}
                  inputMode="decimal"
                />
              </Field>
              <Field label="Precio grande (MXN)" required>
                <input
                  value={priceGrande}
                  onChange={(e) => setPriceGrande(e.target.value)}
                  className={fieldClass}
                  inputMode="decimal"
                />
              </Field>
            </>
          ) : (
            <Field label="Precio (pesos MXN)" required>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} inputMode="decimal" />
            </Field>
          )}
          {product.kind === "taco" ? (
            <>
              <Field label="Porción" required>
                <input value={serving} onChange={(e) => setServing(e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Peso (gramos)">
                <input value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} className={fieldClass} inputMode="numeric" />
              </Field>
            </>
          ) : null}
          <Field label="Orden en el menú" hint="Más chico = primero" required>
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
            usó → escribe <code className="rounded bg-smoke px-1">-5</code>.
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

        <div className="flex flex-wrap items-center justify-end gap-3">
          {message ? <p className="mr-auto text-sm text-clay">{message}</p> : null}
          <button type="button" onClick={onCancel} className="btn-secondary h-11 px-6">
            <X size={16} aria-hidden />
            Cancelar
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-accent h-11 px-6">
            <Save size={16} aria-hidden />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm text-clay ${className}`}>
      <FieldLabel required={required} hint={hint}>
        {label}
      </FieldLabel>
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
