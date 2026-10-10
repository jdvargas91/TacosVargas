import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, PackageMinus, PackagePlus, Pencil, Save, Search, X } from "lucide-react";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useProducts } from "@/context/ProductsContext";
import { AGUA_SIZES, type Product, type ProductKind } from "@/data/seedProducts";
import { productHasSizes, productPriceLabel } from "@/lib/productPricing";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 5;

const emptyForm = {
  kind: "taco" as ProductKind,
  name: "",
  description: "",
  longDescription: "",
  ingredients: "",
  allergens: "",
  price: "",
  priceChica: "22",
  priceGrande: "38",
  hasSizes: false,
  soldOut: false,
  isFeatured: false,
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
  const [page, setPage] = useState(1);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [query]);

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
    setCreating(true);
    const sizesPayload = usingSizes
      ? [
          { id: "chica", label: "Chica", priceCents: chicaCents },
          { id: "grande", label: "Grande", priceCents: grandeCents },
        ]
      : null;
    const nextSort =
      products.reduce((max, product) => Math.max(max, product.sortOrder || 0), 0) + 10;
    const { data, error: insertError } = await supabase
      .from("products")
      .insert({
        kind: form.kind,
        name: form.name.trim(),
        description: form.description.trim(),
        long_description: form.longDescription.trim() || form.description.trim(),
        ingredients: splitList(form.ingredients),
        allergens: form.kind === "taco" ? splitList(form.allergens) : [],
        price_cents: priceCents,
        sizes: sizesPayload,
        stock: 100,
        sold_out: false,
        is_featured: form.isFeatured,
        sort_order: nextSort,
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
                    setForm({ ...form, kind: v as ProductKind });
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
                  ) : null}
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
        <ProductEditor
          product={editing}
          onRefresh={() => void refresh()}
          onSaved={async () => {
            await refresh();
            cancelForm();
            setMessage("Cambios guardados.");
          }}
          onCancel={cancelForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-clay">
        Aquí armas el menú que ve el cliente en la página. Puedes dar de alta tacos o bebidas, subir foto y marcar si
        ya no hay por hoy.
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
        {filtered.length > PAGE_SIZE ? ` · página ${currentPage} de ${totalPages}` : null}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-ink/15 bg-smoke/60 px-6 py-12 text-center">
          <p className="text-clay">{query.trim() ? "Ningún producto coincide con la búsqueda." : "Aún no hay productos."}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[10px] border border-ink/10 bg-smoke">
            <ul className="divide-y divide-ink/10">
              {pageItems.map((product) => (
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

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-clay">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-ink/15 bg-white px-3 text-sm font-medium text-ink disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Anterior
                </button>
                <span className="min-w-16 text-center text-sm tabular-nums text-ink">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-ink/15 bg-white px-3 text-sm font-medium text-ink disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </>
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
  onRefresh,
  onSaved,
  onCancel,
}: {
  product: Product;
  onRefresh: () => void;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [longDescription, setLongDescription] = useState(product.longDescription);
  const [ingredients, setIngredients] = useState(product.ingredients.join(", "));
  const [allergens, setAllergens] = useState(product.allergens.join(", "));
  const [price, setPrice] = useState(String(product.priceCents / 100));
  const [hasSizes, setHasSizes] = useState(productHasSizes(product));
  const [priceChica, setPriceChica] = useState(
    String((product.sizes?.find((s) => s.id === "chica")?.priceCents ?? AGUA_SIZES[0].priceCents) / 100),
  );
  const [priceGrande, setPriceGrande] = useState(
    String((product.sizes?.find((s) => s.id === "grande")?.priceCents ?? AGUA_SIZES[1].priceCents) / 100),
  );
  const [soldOut, setSoldOut] = useState(product.soldOut);
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(product.name);
    setDescription(product.description);
    setLongDescription(product.longDescription);
    setIngredients(product.ingredients.join(", "));
    setAllergens(product.allergens.join(", "));
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
        allergens: product.kind === "taco" ? splitList(allergens) : [],
        price_cents: priceCents,
        sizes: sizesPayload,
        sold_out: soldOut,
        is_featured: isFeatured,
        sort_order: product.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) setMessage(error.message);
    else await onSaved();
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
    onRefresh();
  }

  return (
    <article className="card-shadow grid gap-5 rounded-[10px] border border-ink/8 bg-smoke p-5 md:grid-cols-[160px_1fr] md:p-6">
      <MediaUpload value={product.imageUrl} label="Foto del producto" onChange={(file) => void upload(file)} />

      <div className="grid gap-3">
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
            ) : null}
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
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
