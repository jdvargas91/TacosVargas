import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bike, Info, LogIn, Send, Store, Trash2, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { useSiteContent } from "@/context/SiteContentContext";
import { formatMxn, isProductAvailable, isWithinServiceHours, shortFolio } from "@/lib/format";
import {
  formatAddress,
  supabase,
  type AddressPayload,
  type Fulfillment,
} from "@/lib/supabase";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { QtyStepper } from "@/components/QtyStepper";

export function OrderBuilder() {
  const { products, refresh } = useProducts();
  const { business } = useSiteContent();
  const { cart, setQty, clear, totalItems } = useCart();
  const { user, configured, signInGoogle, loading: authLoading } = useAuth();
  const emptyAddress: AddressPayload = {
    mode: "pickup",
    street: "",
    colonia: "",
    references: "",
    city: business.location.city,
  };
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [address, setAddress] = useState(emptyAddress);
  const [gate, setGate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      products
        .map((product) => ({ product, qty: cart[product.id] ?? 0 }))
        .filter((line) => line.qty > 0),
    [cart, products],
  );

  const totalCents = lines.reduce((sum, line) => sum + line.product.priceCents * line.qty, 0);
  const outsideHours = !isWithinServiceHours(new Date(), business.hours);
  const canConfirm = Boolean(user);

  useEffect(() => {
    if (!user || name) return;
    const fullName =
      typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata.name === "string"
          ? user.user_metadata.name
          : "";
    if (fullName) setName(fullName);
  }, [name, user]);

  async function submitOrder() {
    setError(null);
    if (totalItems < 1) {
      setError("Agrega tacos o bebidas desde el menú.");
      return;
    }
    if (!user) {
      setGate(true);
      return;
    }
    if (fulfillment === "delivery") {
      if (!address.street.trim() || !address.colonia.trim() || !address.city.trim()) {
        setError("Para mensajería completa calle, colonia y ciudad.");
        return;
      }
    }
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Escribe un teléfono de contacto.");
      return;
    }
    if (!supabase) {
      setError("Falta configurar Supabase para registrar el pedido. El menú sí funciona.");
      return;
    }

    const deliveryPayload: AddressPayload =
      fulfillment === "pickup"
        ? { ...emptyAddress, mode: "pickup" }
        : { ...address, mode: "delivery" };

    setSubmitting(true);
    try {
      const displayName =
        name ||
        (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "") ||
        "Cliente";
      const { data, error: rpcError } = await supabase.rpc("place_order", {
        p_customer_name: displayName,
        p_phone: phone,
        p_fulfillment: fulfillment,
        p_delivery_address: deliveryPayload,
        p_items: lines.map((line) => ({ id: line.product.id, qty: line.qty })),
        p_notes: notes,
      });
      if (rpcError) throw rpcError;

      const orderId = String((data as { id: string }).id);
      const folio = shortFolio(orderId);
      const message = buildOrderMessage({
        folio,
        name: displayName,
        phone,
        fulfillment,
        address: formatAddress(deliveryPayload),
        items: lines.map((line) => ({
          name: line.product.name,
          qty: line.qty,
          unitPriceCents: line.product.priceCents,
        })),
        totalCents,
        notes,
      });
      window.open(whatsappUrl(message, business.whatsapp), "_blank", "noopener,noreferrer");
      setSuccess(
        `Pedido ${folio} registrado. Si WhatsApp no abrió, copia este mensaje y envíalo al ${business.phone}.\n\n${message}`,
      );
      clear();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-ink md:text-5xl">Tu Pedido</h1>
            <p className="mt-3 max-w-prose text-clay">
              Arma tu pedido, inicia sesión con Google y confirma. Así guardamos tu orden y puedes seguirla en Mis
              pedidos. El pago es presencial, en pesos mexicanos.
            </p>
          </div>
          {lines.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink transition hover:border-ember hover:bg-ember hover:text-tortilla"
            >
              <Trash2 size={16} aria-hidden />
              Vaciar pedido
            </button>
          ) : null}
        </div>
        {outsideHours ? (
          <p className="mt-4 rounded-2xl bg-smoke px-4 py-3 text-sm text-clay card-shadow">
            Estamos fuera de horario ({business.hours.days}, {business.hours.label}). El pedido se atiende en el
            siguiente servicio.
          </p>
        ) : null}

        {lines.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-smoke px-6 py-16 text-center card-shadow">
            <p className="font-display text-3xl text-ink">El pedido está vacío</p>
            <p className="mx-auto mt-3 max-w-md text-clay">
              Elige tacos y bebidas en el menú. Aquí verás la miniatura, el precio y la cantidad de cada uno.
            </p>
            <Link
              to="/#menu"
              className="mt-8 btn-accent"
            >
              <UtensilsCrossed size={18} aria-hidden />
              Ir al menú
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
            <ul className="space-y-3">
              {lines.map(({ product, qty }) => {
                const available = isProductAvailable(product.soldOut, product.stock);
                return (
                  <li
                    key={product.id}
                    className="flex gap-4 rounded-2xl bg-smoke p-3 sm:p-4 card-shadow"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      width={88}
                      height={88}
                      className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover sm:h-[88px] sm:w-[88px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{product.name}</p>
                          <p className="text-sm text-clay">{formatMxn(product.priceCents)} c/u</p>
                        </div>
                        <p className="tabular-nums font-semibold text-ink">{formatMxn(product.priceCents * qty)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <QtyStepper
                          value={qty}
                          max={available ? product.stock : qty}
                          disabled={!available}
                          onChange={(next) => setQty(product.id, next)}
                          label={product.name}
                        />
                        <button
                          type="button"
                          aria-label={`Quitar ${product.name} del pedido`}
                          onClick={() => setQty(product.id, 0)}
                          className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-clay hover:border-terracotta hover:text-ink"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form
              className="card-shadow rounded-2xl bg-smoke p-5 sm:p-6 lg:sticky lg:top-24"
              onSubmit={(event) => {
                event.preventDefault();
                void submitOrder();
              }}
            >
              <fieldset>
                <legend className="font-display text-2xl text-ink">¿Cómo lo recibes?</legend>
                <div className="mt-4 grid gap-3">
                  <label
                    className={`flex gap-3 rounded-xl border p-4 transition ${fulfillment === "pickup"
                      ? "border-terracotta bg-gold/20"
                      : "border-ink/15 bg-white"
                      }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      className="sr-only"
                      checked={fulfillment === "pickup"}
                      onChange={() => setFulfillment("pickup")}
                    />
                    <Store className="mt-0.5 shrink-0 text-terracotta" size={22} aria-hidden />
                    <span>
                      <span className="block text-ink">Recoger en el local</span>
                      <span className="mt-1 block text-sm text-clay">
                        Pagas al recoger. Te confirmamos por WhatsApp cuando esté listo.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex gap-3 rounded-xl border p-4 transition ${fulfillment === "delivery"
                      ? "border-terracotta bg-gold/20"
                      : "border-ink/15 bg-white"
                      }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      className="sr-only"
                      checked={fulfillment === "delivery"}
                      onChange={() => setFulfillment("delivery")}
                    />
                    <Bike className="mt-0.5 shrink-0 text-terracotta" size={22} aria-hidden />
                    <span>
                      <span className="block text-ink">Mensajería</span>
                      <span className="mt-1 block text-sm text-clay">
                        Llevamos el pedido. El envío se cotiza al atenderte.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              {fulfillment === "delivery" ? (
                <div className="mt-5 space-y-4">
                  <p className="flex gap-2 rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm text-clay">
                    <Info size={18} className="mt-0.5 shrink-0 text-terracotta" aria-hidden />
                    La mensajería tiene un costo adicional. El monto se define por WhatsApp cuando te atendamos; no se
                    cobra en esta página.
                  </p>
                  <label className="block text-sm text-clay">
                    Calle y número
                    <input
                      value={address.street}
                      onChange={(event) => setAddress({ ...address, street: event.target.value })}
                      className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                      required
                    />
                  </label>
                  <label className="block text-sm text-clay">
                    Colonia
                    <input
                      value={address.colonia}
                      onChange={(event) => setAddress({ ...address, colonia: event.target.value })}
                      className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                      required
                    />
                  </label>
                  <label className="block text-sm text-clay">
                    Referencias
                    <input
                      value={address.references}
                      onChange={(event) => setAddress({ ...address, references: event.target.value })}
                      className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                    />
                  </label>
                  <label className="block text-sm text-clay">
                    Ciudad
                    <input
                      value={address.city}
                      onChange={(event) => setAddress({ ...address, city: event.target.value })}
                      className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                      required
                    />
                  </label>
                </div>
              ) : null}

              <label className="mt-5 block text-sm text-clay">
                Nombre
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                  autoComplete="name"
                />
              </label>
              <label className="mt-4 block text-sm text-clay">
                Teléfono
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </label>
              <label className="mt-4 block text-sm text-clay">
                Notas (sabor de agua, sin cebolla…)
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 min-h-24 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
                />
              </label>

              <p className="mt-6 flex items-center justify-between text-ink">
                <span>Total de productos</span>
                <span className="text-3xl font-semibold text-ink">{formatMxn(totalCents)}</span>
              </p>
              {fulfillment === "delivery" ? (
                <p className="mt-1 text-sm text-clay">Sin incluir el costo de mensajería.</p>
              ) : null}
              {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
              {success ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-paper p-3 text-sm text-clay">{success}</pre>
              ) : null}

              {!authLoading && user ? (
                <div className="mt-5 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-clay">
                  Sesión: <span className="font-medium text-ink">{user.email}</span>
                  {" · "}
                  <Link to="/mis-pedidos" className="text-ember hover:underline">
                    Ver mis pedidos
                  </Link>
                </div>
              ) : null}

              {!authLoading && !user ? (
                <div className="mt-5 rounded-xl border border-terracotta/25 bg-terracotta/10 px-4 py-4 text-sm text-clay">
                  <p className="font-medium text-ink">Inicia sesión para confirmar</p>
                  <p className="mt-1">
                    Con Google creas tu cuenta, registramos el pedido a tu nombre y puedes verlo después como en una
                    tienda en línea.
                  </p>
                  <button
                    type="button"
                    onClick={() => setGate(true)}
                    className="btn-accent mt-4 w-full"
                  >
                    <LogIn size={18} aria-hidden />
                    Iniciar sesión con Google
                  </button>
                </div>
              ) : null}

              {canConfirm ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent mt-6 w-full disabled:opacity-60"
                >
                  <Send size={18} aria-hidden />
                  {submitting ? "Enviando…" : "Confirmar pedido"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-accent mt-6 w-full cursor-not-allowed opacity-45"
                  title="Inicia sesión con Google para confirmar"
                >
                  <Send size={18} aria-hidden />
                  Confirmar pedido
                </button>
              )}
              <Link to="/#menu" className="mt-3 inline-flex h-11 w-full items-center justify-center text-sm text-clay">
                Seguir viendo el menú
              </Link>
              {!configured ? (
                <p className="mt-3 text-sm text-clay">
                  Para registrar pedidos, agrega VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
                </p>
              ) : null}
            </form>
          </div>
        )}
      </div>

      <GoogleGateModal
        open={gate}
        title="Inicia sesión para pedir"
        body="Necesitas una cuenta con Google para confirmar el pedido y verlo después en Mis pedidos. El menú se puede ver sin cuenta."
        onClose={() => setGate(false)}
        onConfirm={() => {
          void signInGoogle(`${window.location.origin}/pedido`);
        }}
      />
    </section>
  );
}
