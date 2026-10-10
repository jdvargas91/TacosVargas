import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy, LogIn, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { useSiteContent } from "@/context/SiteContentContext";
import { formatMxn, isProductAvailable, isWithinServiceHours } from "@/lib/format";
import { parseCartLineKey, type Tortillas } from "@/lib/cart";
import type { DrinkSizeId } from "@/data/seedProducts";
import { savePendingCheckout, type PaymentMethod, type PendingCheckoutItem } from "@/lib/pendingCheckout";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { QtyStepper } from "@/components/QtyStepper";
import { TortillaPicker } from "@/components/TortillaPicker";
import { SizePicker } from "@/components/SizePicker";
import { ProductMedia } from "@/components/ProductMedia";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { personNameError } from "@/lib/validation";
import { productHasSizes, productUnitPrice, resolveSize } from "@/lib/productPricing";
import { cn } from "@/lib/cn";

function tortillaLineLabel(tortillas?: Tortillas) {
  if (tortillas === 1) return "1 tortilla";
  if (tortillas === 2) return "2 tortillas";
  return null;
}

function effectiveTortillas(cartKey: string, kind: "taco" | "drink"): Tortillas | undefined {
  const { tortillas } = parseCartLineKey(cartKey);
  if (kind !== "taco") return undefined;
  return tortillas ?? 2;
}

export function OrderBuilder() {
  const navigate = useNavigate();
  const { products } = useProducts();
  const { business } = useSiteContent();
  const { cart, setQty, setLineTortillas, setLineSize, clear, totalItems } = useCart();
  const { user, configured, signInGoogle, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("presencial");
  const [copied, setCopied] = useState(false);
  const [gate, setGate] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const card = business.cardPayment;

  const lines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([cartKey, qty]) => {
        const { productId, size } = parseCartLineKey(cartKey);
        const product = products.find((item) => item.id === productId);
        if (!product) return null;
        const tortillas = effectiveTortillas(cartKey, product.kind);
        const drinkSize = productHasSizes(product) ? size ?? "chica" : undefined;
        const unitPrice = productUnitPrice(product, drinkSize);
        const sizeMeta = resolveSize(product, drinkSize);
        return { cartKey, product, qty, tortillas, size: drinkSize, unitPrice, sizeMeta };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [cart, products]);

  const totalCents = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const outsideHours = !isWithinServiceHours(new Date(), business.hours);

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

  function validate(): boolean {
    const next: Record<string, string> = {};
    const nameErr = personNameError(name);
    if (nameErr) next.name = nameErr;
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function cancelForm() {
    setName(
      user
        ? typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === "string"
            ? user.user_metadata.name
            : ""
        : "",
    );
    setNotes("");
    setPaymentMethod("presencial");
    setError(null);
    setInfo(null);
    setFieldErrors({});
  }

  async function copyCardNumber() {
    try {
      await navigator.clipboard.writeText(card.cardNumber.replace(/\s+/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No pudimos copiar el número. Cópialo manualmente.");
    }
  }

  function buildPendingItems(): PendingCheckoutItem[] {
    return lines.map(({ product, qty, tortillas, size, unitPrice, sizeMeta }) => ({
      id: product.id,
      name: sizeMeta ? `${product.name} · ${sizeMeta.label}` : product.name,
      qty,
      unitPriceCents: unitPrice,
      kind: product.kind,
      ...(product.kind === "taco" ? { tortillas: tortillas ?? 2 } : {}),
      ...(size ? { size } : {}),
    }));
  }

  function persistPendingCheckout() {
    savePendingCheckout({
      name: name.trim(),
      phone: "",
      notes: notes.trim(),
      items: buildPendingItems(),
      totalCents,
      paymentMethod,
      createdAt: new Date().toISOString(),
    });
  }

  function setLineQty(cartKey: string, nextQty: number) {
    const { productId, size } = parseCartLineKey(cartKey);
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    if (product.kind === "taco") {
      const t = effectiveTortillas(cartKey, "taco") ?? 2;
      setQty(productId, nextQty, { tortillas: t });
    } else if (productHasSizes(product)) {
      setQty(productId, nextQty, { size: size ?? "chica" });
    } else {
      setQty(productId, nextQty);
    }
  }

  function changeLineTortillas(cartKey: string, next: Tortillas) {
    const { productId } = parseCartLineKey(cartKey);
    const product = products.find((item) => item.id === productId);
    if (!product || product.kind !== "taco") return;
    const from = effectiveTortillas(cartKey, "taco") ?? 2;
    setLineTortillas(productId, from, next);
  }

  function changeLineSize(cartKey: string, next: DrinkSizeId) {
    const { productId, size } = parseCartLineKey(cartKey);
    const product = products.find((item) => item.id === productId);
    if (!product || !productHasSizes(product)) return;
    setLineSize(productId, size ?? "chica", next);
  }

  async function handleLogin() {
    setLoginError(null);
    if (!configured) {
      setLoginError("Falta configurar Supabase en el archivo .env.");
      return;
    }
    setLoginBusy(true);
    try {
      sessionStorage.setItem("vargas_post_login", "/mis-pedidos");
      await signInGoogle(`${window.location.origin}/cuenta`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión con Google.";
      if (/provider is not enabled/i.test(message)) {
        setLoginError(
          "Google no está habilitado en Supabase. En Authentication → Providers → Google: actívalo, pega Client ID y Secret, y guarda.",
        );
      } else {
        setLoginError(message);
      }
      setLoginBusy(false);
    }
  }

  function continueCheckout() {
    setError(null);
    setInfo(null);
    if (totalItems < 1) {
      setError("Agrega tacos o bebidas desde el menú.");
      return;
    }
    if (!validate()) {
      setError("Revisa los campos marcados.");
      return;
    }

    persistPendingCheckout();

    if (!user) {
      sessionStorage.setItem("vargas_post_login", "/mis-pedidos");
      setGate(true);
      return;
    }

    setSubmitting(true);
    setInfo("Continúa en tu cuenta para subir el comprobante.");
    navigate("/mis-pedidos", {
      state: { checkoutHint: "Continúa en tu cuenta para subir el comprobante." },
    });
    setSubmitting(false);
  }

  return (
    <section className="px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-ink md:text-5xl">Tu Pedido</h1>
            <p className="mt-3 max-w-prose text-clay">
              Arma tu pedido para recoger en el local. Paga por transferencia o tarjeta, inicia sesión con Google y sube
              tu comprobante en Mis pedidos para confirmar la orden.
            </p>
          </div>
          {lines.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink transition hover:border-ember hover:bg-ember hover:text-tortilla"
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
            <Link to="/#menu" className="mt-8 btn-accent">
              <UtensilsCrossed size={18} aria-hidden />
              Ir al menú
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
            <ul className="space-y-3">
              {lines.map(({ cartKey, product, qty, tortillas, size, unitPrice, sizeMeta }) => {
                const available = isProductAvailable(product.soldOut, product.stock);
                const tortillaLabel = product.kind === "taco" ? tortillaLineLabel(tortillas ?? 2) : null;
                const pickerValue = (tortillas ?? 2) as Tortillas;

                return (
                  <li key={cartKey} className="flex gap-4 rounded-2xl bg-smoke p-3 sm:p-4 card-shadow">
                    <ProductMedia
                      src={product.imageUrl}
                      alt={product.name}
                      tone="thumb"
                      className="h-[72px] w-[72px] shrink-0 sm:h-[88px] sm:w-[88px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{product.name}</p>
                          <p className="text-sm text-clay">
                            {formatMxn(unitPrice)} c/u
                            {tortillaLabel ? <span className="text-clay"> · {tortillaLabel}</span> : null}
                            {sizeMeta ? <span className="text-clay"> · {sizeMeta.label}</span> : null}
                          </p>
                        </div>
                        <p className="tabular-nums font-semibold text-ink">{formatMxn(unitPrice * qty)}</p>
                      </div>

                      {product.kind === "taco" ? (
                        <TortillaPicker
                          className="mt-3"
                          value={pickerValue}
                          onChange={(next) => changeLineTortillas(cartKey, next)}
                        />
                      ) : null}
                      {product.sizes?.length && size ? (
                        <SizePicker
                          className="mt-3"
                          sizes={product.sizes}
                          value={size}
                          onChange={(next) => changeLineSize(cartKey, next)}
                        />
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <QtyStepper
                          value={qty}
                          max={available ? product.stock : qty}
                          disabled={!available}
                          onChange={(next) => setLineQty(cartKey, next)}
                          label={product.name}
                        />
                        <button
                          type="button"
                          aria-label={`Quitar ${product.name} del pedido`}
                          onClick={() => setLineQty(cartKey, 0)}
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
                continueCheckout();
              }}
              noValidate
            >
              <div className="mt-6">
                <h2 className="font-display text-2xl text-ink">¿Cómo quieres pagar?</h2>
                <div
                  role="radiogroup"
                  aria-label="Forma de pago"
                  className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] bg-ink/[0.04] p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === "presencial"}
                    onClick={() => setPaymentMethod("presencial")}
                    className={cn(
                      "rounded-[10px] px-3 py-3 text-left transition",
                      paymentMethod === "presencial"
                        ? "border-terracotta/25 bg-gold/15 shadow-[0_6px_18px_rgb(30_23_16_/0.10)] ring-1 ring-terracotta/35"
                        : "hover:bg-white/60",
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">Pago al recoger</span>
                    <span className="mt-0.5 block text-xs text-clay">Pagas en el local al entregarlo</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === "transferencia"}
                    onClick={() => setPaymentMethod("transferencia")}
                    className={cn(
                      "rounded-[10px] px-3 py-3 text-left transition",
                      paymentMethod === "transferencia"
                        ? "border-terracotta/25 bg-gold/15 shadow-[0_6px_18px_rgb(30_23_16_/0.10)] ring-1 ring-terracotta/35"
                        : "hover:bg-white/60",
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">Transferencia</span>
                    <span className="mt-0.5 block text-xs text-clay">Pagas antes y subes tu comprobante</span>
                  </button>
                </div>

                {paymentMethod === "transferencia" ? (
                  <div className="mt-4">
                    <dl className="mt-1 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[10px] border border-ink/10 bg-white px-4 py-3">
                        <dt className="text-xs font-medium uppercase tracking-wide text-clay">Banco</dt>
                        <dd className="mt-1 font-semibold text-ink">{card.bank}</dd>
                      </div>
                      <div className="rounded-[10px] border border-ink/10 bg-white px-4 py-3">
                        <dt className="text-xs font-medium uppercase tracking-wide text-clay">Titular</dt>
                        <dd className="mt-1 font-semibold text-ink">{card.accountName}</dd>
                      </div>
                      {card.clabe.trim() ? (
                        <div className="rounded-[10px] border border-ink/10 bg-white px-4 py-3 sm:col-span-2">
                          <dt className="text-xs font-medium uppercase tracking-wide text-clay">CLABE</dt>
                          <dd className="mt-1 font-semibold tabular-nums text-ink">{card.clabe}</dd>
                        </div>
                      ) : null}
                      <div className="rounded-[10px] border border-ink/10 bg-white px-4 py-3 sm:col-span-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-clay">Tarjeta</dt>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <dd className="font-semibold tabular-nums text-ink">{card.cardNumber}</dd>
                          <button
                            type="button"
                            onClick={() => void copyCardNumber()}
                            aria-label="Copiar número de tarjeta"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-ink/15 bg-paper px-3 text-xs font-semibold text-ink transition hover:border-terracotta hover:text-ember"
                          >
                            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                            {copied ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    </dl>
                    <p className="mt-3 text-sm text-clay">{card.hint}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-clay">
                    Pagas directamente cuando recojas tu pedido en el local. No necesitas comprobante.
                  </p>
                )}
              </div>

              <label className="mt-6 block text-sm text-clay">
                <FieldLabel required>Nombre</FieldLabel>
                <input
                  value={name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setName(value);
                    setFieldErrors((current) => {
                      const nameErr = value.trim() ? personNameError(value) : null;
                      if (!nameErr) {
                        const { name: _removed, ...rest } = current;
                        return rest;
                      }
                      return { ...current, name: nameErr };
                    });
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
                  autoComplete="name"
                  inputMode="text"
                  placeholder="Solo letras, ej. Ana López"
                />
                {fieldErrors.name ? <p className="mt-1 text-xs text-terracotta">{fieldErrors.name}</p> : null}
              </label>
              <label className="mt-4 block text-sm text-clay">
                <FieldLabel>Notas (sabor de agua, sin cebolla…)</FieldLabel>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 min-h-24 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
                />
              </label>

              <p className="mt-6 flex items-center justify-between text-ink">
                <span>Total</span>
                <span className="text-3xl font-semibold text-ink">{formatMxn(totalCents)}</span>
              </p>
              {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
              {info ? <p className="mt-3 text-sm text-ink">{info}</p> : null}

              {!authLoading && user ? (
                <div className="mt-5 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-clay">
                  Sesión: <span className="font-medium text-ink">{user.email}</span>
                  {" · "}
                  <Link to="/mis-pedidos" className="cursor-pointer text-ember hover:underline">
                    Ver mis pedidos
                  </Link>
                </div>
              ) : null}

              {!authLoading && !user ? (
                <div className="mt-5 rounded-xl border border-terracotta/25 bg-terracotta/10 px-4 py-4 text-sm text-clay">
                  <p className="font-medium text-ink">Inicia sesión para continuar</p>
                  <p className="mt-1">
                    Con Google guardamos tu pedido pendiente y podrás subir el comprobante de pago en Mis pedidos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (totalItems < 1) {
                        setError("Agrega tacos o bebidas desde el menú.");
                        return;
                      }
                      if (!validate()) {
                        setError("Revisa los campos marcados.");
                        return;
                      }
                      persistPendingCheckout();
                      sessionStorage.setItem("vargas_post_login", "/mis-pedidos");
                      setLoginError(null);
                      setGate(true);
                    }}
                    className="btn-accent mt-4 w-full"
                  >
                    <LogIn size={18} aria-hidden />
                    Iniciar sesión con Google
                  </button>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button type="button" onClick={cancelForm} className="btn-secondary h-11 px-5 text-sm">
                  <X size={16} aria-hidden />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !user}
                  title={!user ? "Inicia sesión con Google para continuar" : undefined}
                  className="btn-accent h-11 px-6 disabled:opacity-60"
                >
                  <ArrowRight size={18} aria-hidden />
                  {submitting ? "Continuando…" : "Continuar"}
                </button>
              </div>
              <Link
                to="/#menu"
                className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center text-sm text-clay hover:underline"
              >
                Seguir viendo el menú
              </Link>
            </form>
          </div>
        )}
      </div>

      <GoogleGateModal
        open={gate}
        title="Inicia sesión para continuar"
        body="Necesitas una cuenta con Google para subir tu comprobante y confirmar el pedido. Tu carrito y datos quedan guardados mientras inicias sesión."
        error={loginError}
        onClose={() => {
          setGate(false);
          setLoginError(null);
          setLoginBusy(false);
        }}
        onConfirm={() => {
          if (!loginBusy) void handleLogin();
        }}
      />
    </section>
  );
}
