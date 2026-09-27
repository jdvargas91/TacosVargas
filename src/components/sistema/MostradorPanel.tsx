import { useMemo, useState } from "react";
import { Bike, ClipboardCheck, Store } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useSiteContent } from "@/context/SiteContentContext";
import { formatMxn, isProductAvailable, shortFolio } from "@/lib/format";
import { supabase, type AddressPayload, type Fulfillment } from "@/lib/supabase";
import { QtyStepper } from "@/components/QtyStepper";
import { cn } from "@/lib/cn";

export function MostradorPanel() {
  const { products, refresh } = useProducts();
  const { business } = useSiteContent();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [street, setStreet] = useState("");
  const [colonia, setColonia] = useState("");
  const [city, setCity] = useState(business.location.city);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      products
        .filter((p) => isProductAvailable(p.soldOut, p.stock) || (cart[p.id] ?? 0) > 0)
        .map((product) => ({ product, qty: cart[product.id] ?? 0 })),
    [cart, products],
  );

  const selected = lines.filter((line) => line.qty > 0);
  const totalCents = selected.reduce((sum, line) => sum + line.product.priceCents * line.qty, 0);

  function setQty(id: string, qty: number) {
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function submit() {
    setError(null);
    setMessage(null);
    if (selected.length < 1) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Escribe un teléfono de contacto.");
      return;
    }
    if (fulfillment === "delivery" && (!street.trim() || !colonia.trim() || !city.trim())) {
      setError("Para mensajería completa calle, colonia y ciudad.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const delivery: AddressPayload =
      fulfillment === "pickup"
        ? { mode: "pickup", street: "", colonia: "", references: "", city: business.location.city }
        : { mode: "delivery", street, colonia, references: "", city };

    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("place_counter_order", {
      p_customer_name: name || "Mostrador",
      p_phone: phone,
      p_fulfillment: fulfillment,
      p_delivery_address: delivery,
      p_items: selected.map((line) => ({ id: line.product.id, qty: line.qty })),
      p_notes: notes,
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const orderId = String((data as { id: string }).id);
    setMessage(`Pedido ${shortFolio(orderId)} registrado · ${formatMxn(totalCents)}`);
    setCart({});
    setName("");
    setPhone("");
    setNotes("");
    setFulfillment("pickup");
    void refresh();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-3">
        <h2 className="font-display text-2xl text-ink">Productos</h2>
        {products.map((product) => {
          const available = isProductAvailable(product.soldOut, product.stock);
          return (
            <div key={product.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-ink/10 bg-smoke px-4 py-3">
              <div>
                <p className="font-medium text-ink">{product.name}</p>
                <p className="text-sm text-clay">
                  {formatMxn(product.priceCents)}
                  {!available ? " · Agotado" : ` · Stock ${product.stock}`}
                </p>
              </div>
              <QtyStepper
                label={product.name}
                value={cart[product.id] ?? 0}
                onChange={(qty) => setQty(product.id, qty)}
                max={Math.max(product.stock, cart[product.id] ?? 0)}
                disabled={!available && !(cart[product.id] ?? 0)}
              />
            </div>
          );
        })}
      </div>

      <div className="card-shadow h-fit rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Pedido de mostrador</h2>
        <label className="mt-4 block text-sm text-clay">
          <span className="font-medium text-ink/80">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="mt-3 block text-sm text-clay">
          <span className="font-medium text-ink/80">Teléfono</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 h-11 w-full rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
            required
          />
        </label>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setFulfillment("pickup")}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition",
              fulfillment === "pickup"
                ? "bg-terracotta text-white shadow-sm"
                : "border border-ink/15 bg-white text-ink hover:border-ink/25",
            )}
          >
            <Store size={16} aria-hidden />
            Recoger
          </button>
          <button
            type="button"
            onClick={() => setFulfillment("delivery")}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition",
              fulfillment === "delivery"
                ? "bg-terracotta text-white shadow-sm"
                : "border border-ink/15 bg-white text-ink hover:border-ink/25",
            )}
          >
            <Bike size={16} aria-hidden />
            Mensajería
          </button>
        </div>
        {fulfillment === "delivery" ? (
          <div className="mt-3 grid gap-2">
            <input
              placeholder="Calle"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="h-11 rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
            />
            <input
              placeholder="Colonia"
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              className="h-11 rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
            />
            <input
              placeholder="Ciudad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
            />
          </div>
        ) : null}
        <label className="mt-3 block text-sm text-clay">
          <span className="font-medium text-ink/80">Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 min-h-20 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        <p className="mt-4 text-lg font-semibold text-ink">Total {formatMxn(totalCents)}</p>
        {error ? <p className="mt-2 text-sm text-terracotta">{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-clay">{message}</p> : null}
        <button type="button" disabled={submitting} onClick={() => void submit()} className="btn-accent mt-4 h-12 w-full">
          <ClipboardCheck size={16} aria-hidden />
          {submitting ? "Registrando…" : "Registrar pedido"}
        </button>
      </div>
    </div>
  );
}
