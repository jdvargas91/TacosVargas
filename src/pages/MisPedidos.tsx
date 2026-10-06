import { useEffect, useRef, useState, type DragEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  Maximize2,
  Receipt,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatMxn, formatOrderCode } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/orderStatus";
import {
  clearPendingCheckout,
  readPendingCheckout,
  type PendingCheckout,
} from "@/lib/pendingCheckout";
import { supabase, type OrderRow } from "@/lib/supabase";
import { useSiteContent } from "@/context/SiteContentContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { cn } from "@/lib/cn";

export function MisPedidos() {
  const { user, loading, isStaff, signInGoogle, configured } = useAuth();
  const { business } = useSiteContent();
  const { clear } = useCart();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(() => readPendingCheckout());
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPending(readPendingCheckout());
  }, [user]);

  // Vista previa de la imagen seleccionada (y limpieza del object URL).
  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  // Cerrar el visor con Escape.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  function handleProofFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El comprobante debe ser una imagen (JPG o PNG).");
      return;
    }
    setError(null);
    setProofFile(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    handleProofFile(event.dataTransfer.files?.[0] ?? null);
  }

  function clearProof() {
    setProofFile(null);
    setLightboxOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (!user || !supabase) return;
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        else setOrders((data as OrderRow[]) ?? []);
      });
  }, [user, successMsg]);

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
      setLoginError(message);
      setLoginBusy(false);
    }
  }

  async function submitOrder() {
    if (!supabase || !user || !pending) return;
    const isTransfer = pending.paymentMethod === "transferencia";
    if (isTransfer && !proofFile) {
      setError("Sube una captura o foto del comprobante de transferencia.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let proofUrl: string | null = null;
      if (isTransfer && proofFile) {
        const ext = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upError } = await supabase.storage.from("payment-proofs").upload(path, proofFile, {
          upsert: true,
          contentType: proofFile.type || "image/jpeg",
        });
        if (upError) throw upError;
        const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);
        proofUrl = pub.publicUrl;
      }

      const { data, error: rpcError } = await supabase.rpc("place_order", {
        p_customer_name: pending.name,
        p_phone: pending.phone || "—",
        p_fulfillment: "pickup",
        p_delivery_address: { mode: "pickup", street: "", colonia: "", references: "", city: business.location.city },
        p_items: pending.items.map((item) => ({
          id: item.id,
          qty: item.qty,
          tortillas: item.tortillas,
        })),
        p_notes: pending.notes,
        p_payment_proof_url: proofUrl,
        p_payment_method: isTransfer ? "tarjeta" : "presencial",
      });
      if (rpcError) throw rpcError;

      const orderNumber =
        data && typeof data === "object" && "order_number" in data
          ? Number((data as { order_number: number }).order_number)
          : null;
      const orderId = data && typeof data === "object" && "id" in data ? String((data as { id: string }).id) : "";
      const folio = formatOrderCode(orderNumber, orderId);

      clearPendingCheckout();
      setPending(null);
      setProofFile(null);
      clear();
      setSuccessMsg(
        `${folio} recibido. Ya puedes pasar a recogerlo en el local (${business.location.label}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pedido.");
    } finally {
      setUploading(false);
    }
  }

  async function confirmCancelOrder() {
    if (!supabase || !cancelTarget) return;
    const orderId = cancelTarget.id;
    setCancellingId(orderId);
    setError(null);
    const { error: rpcError } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
    setCancellingId(null);
    setCancelTarget(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status: "cancelado" } : item)),
    );
  }

  if (!loading && isStaff) {
    return <Navigate to="/sistema" replace />;
  }

  return (
    <>
      <Seo title={`Mis pedidos · ${business.name}`} description="Seguimiento de tu orden." noindex />
      <Header />
      <main id="contenido" className="relative mx-auto min-h-svh max-w-4xl px-4 pb-20 pt-28">
        <div className="pointer-events-none sticky top-[4.75rem] z-30 -mx-4 mb-4 flex justify-end px-4 md:top-20">
          <div className="pointer-events-auto inline-flex max-w-[min(100%,18rem)] items-start gap-2 rounded-[12px] border border-ink/10 bg-paper/95 px-3 py-2 text-left text-xs text-clay shadow-[0_8px_24px_rgb(30_23_16_/0.08)] backdrop-blur-md">
            <MapPin size={14} className="mt-0.5 shrink-0 text-ember" aria-hidden />
            <div>
              <p className="font-semibold text-ink">Recoger en el local</p>
              <p className="mt-0.5 leading-snug">{business.location.label}</p>
            </div>
          </div>
        </div>

        <h1 className="font-display text-4xl text-ink">Mis pedidos</h1>
        <p className="mt-2 text-sm text-clay">
          Recoges en tienda. Si pagas por transferencia, sube el comprobante para que el pedido quede registrado.
        </p>

        {pending && user ? (
          <section className="card-shadow mt-8 overflow-hidden rounded-2xl border border-terracotta/20 bg-smoke">
            <header className="flex items-start gap-3 border-b border-ink/8 bg-gradient-to-br from-terracotta/10 to-gold/10 px-5 py-5 sm:px-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-terracotta/15 text-ember">
                {pending.paymentMethod === "transferencia" ? (
                  <Receipt size={20} aria-hidden />
                ) : (
                  <CheckCircle2 size={20} aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl leading-tight text-ink">
                  {pending.paymentMethod === "transferencia" ? "Sube tu comprobante" : "Confirma tu pedido"}
                </h2>
                <p className="mt-1 text-sm text-clay">
                  {pending.paymentMethod === "transferencia"
                    ? "Ya transferiste a la tarjeta del negocio. Adjunta la captura para registrar tu pedido a nombre de "
                    : "Pagas en el local al recogerlo. Confirma para registrar tu pedido a nombre de "}
                  <span className="font-medium text-ink">{pending.name}</span>.
                </p>
              </div>
            </header>

            <div className="px-5 py-5 sm:px-6">
              <div className="overflow-hidden rounded-[12px] border border-ink/8 bg-paper/60">
                <ul className="divide-y divide-ink/8">
                  {pending.items.map((item) => (
                    <li
                      key={`${item.id}-${item.tortillas ?? "x"}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-terracotta/12 px-1.5 text-xs font-bold text-ember tabular-nums">
                          {item.qty}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                          {item.tortillas ? (
                            <span className="block text-xs text-clay">
                              {item.tortillas} tortilla{item.tortillas === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                        {formatMxn(item.unitPriceCents * item.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between border-t border-ink/8 bg-smoke/70 px-3 py-2.5">
                  <span className="text-sm font-medium text-ink/80">Total</span>
                  <span className="text-xl font-bold tabular-nums text-ink">{formatMxn(pending.totalCents)}</span>
                </div>
              </div>

              {pending.paymentMethod === "transferencia" ? (
                <div className="mt-5">
                  <FieldLabel required>Comprobante de transferencia</FieldLabel>
                  <input
                    ref={fileInputRef}
                    id="proof-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => handleProofFile(e.target.files?.[0] ?? null)}
                  />
                  {proofPreview ? (
                    <figure className="mt-2 overflow-hidden rounded-[14px] border border-ink/10 bg-paper">
                      <div className="relative">
                        <img
                          src={proofPreview}
                          alt="Vista previa del comprobante"
                          className="max-h-64 w-full bg-ink/[0.03] object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          className="absolute right-2 top-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-carbon/70 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-carbon/85"
                        >
                          <Maximize2 size={14} aria-hidden />
                          Ampliar
                        </button>
                      </div>
                      <figcaption className="flex items-center justify-between gap-3 border-t border-ink/8 px-3 py-2">
                        <span className="flex min-w-0 items-center gap-2 text-xs text-clay">
                          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" aria-hidden />
                          <span className="truncate">{proofFile?.name}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink/15 px-3 text-xs font-semibold text-ink transition hover:border-terracotta hover:text-ember"
                          >
                            <RefreshCw size={13} aria-hidden />
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={clearProof}
                            aria-label="Quitar comprobante"
                            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink/15 px-3 text-xs font-semibold text-terracotta transition hover:border-terracotta"
                          >
                            <Trash2 size={13} aria-hidden />
                            Quitar
                          </button>
                        </div>
                      </figcaption>
                    </figure>
                  ) : (
                    <label
                      htmlFor="proof-input"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                      }}
                      onDrop={handleDrop}
                      className={cn(
                        "mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition",
                        dragActive
                          ? "border-terracotta bg-terracotta/10"
                          : "border-ink/20 bg-paper/60 hover:border-terracotta/60 hover:bg-terracotta/5",
                      )}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-terracotta/12 text-ember">
                        <UploadCloud size={22} aria-hidden />
                      </span>
                      <span className="text-sm font-semibold text-ink">Arrastra tu comprobante aquí</span>
                      <span className="text-xs text-clay">
                        o <span className="font-medium text-ember">haz clic para elegir</span> · JPG o PNG
                      </span>
                    </label>
                  )}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    clearPendingCheckout();
                    setPending(null);
                    clearProof();
                  }}
                  className="btn-secondary h-11 px-5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={uploading || (pending.paymentMethod === "transferencia" && !proofFile)}
                  onClick={() => void submitOrder()}
                  className="btn-accent h-11 px-5"
                >
                  <Upload size={16} aria-hidden />
                  {uploading ? "Enviando…" : "Confirmar pedido"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {pending && !user && !loading ? (
          <p className="mt-6 rounded-2xl border border-terracotta/25 bg-terracotta/10 px-4 py-3 text-sm text-clay">
            Inicia sesión con Google para registrar tu pedido pendiente.
          </p>
        ) : null}

        {successMsg ? (
          <p className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
            {successMsg}
          </p>
        ) : null}

        {loading ? <p className="mt-6 text-clay">Cargando…</p> : null}
        {!loading && user && orders.length === 0 && !pending ? (
          <p className="mt-6 text-clay">Aún no tienes pedidos.</p>
        ) : null}
        {error ? <p className="mt-4 text-terracotta">{error}</p> : null}

        <div className="mt-8 space-y-4">
          {orders.map((order) => {
            const code = formatOrderCode(order.order_number, order.id);
            const canCancel = order.status === "recibido";
            const isCancelled = order.status === "cancelado";
            return (
              <article
                key={order.id}
                className={cn(
                  "card-shadow overflow-hidden rounded-2xl border bg-smoke transition",
                  isCancelled ? "border-ink/10 opacity-75" : "border-ink/8",
                )}
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/8 bg-paper/50 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-display text-2xl tracking-wide text-ink">{code}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-clay">
                      <Clock size={13} aria-hidden />
                      {new Date(order.created_at).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                      ORDER_STATUS_TONES[order.status],
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </header>

                <div className="px-5 py-4">
                  <div className="overflow-hidden rounded-[12px] border border-ink/8 bg-paper/60">
                    <ul className="divide-y divide-ink/8">
                      {order.items.map((item, idx) => (
                        <li
                          key={`${order.id}-${item.id}-${idx}`}
                          className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-terracotta/12 px-1.5 text-xs font-bold tabular-nums text-ember">
                              {item.qty}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                              {item.kind === "taco" && item.tortillas ? (
                                <span className="block text-xs text-clay">
                                  {item.tortillas} tortilla{item.tortillas === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </span>
                          </div>
                          {typeof item.unitPrice === "number" ? (
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                              {formatMxn(item.unitPrice * item.qty)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-clay">
                        <MapPin size={13} className="text-ember" aria-hidden />
                        Recoger en el local
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-clay">
                        <Wallet size={13} className="text-ember" aria-hidden />
                        {order.payment_method === "tarjeta" ? "Transferencia" : "Pago al recoger"}
                      </span>
                      {order.payment_proof_url ? (
                        <a
                          href={order.payment_proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/5 px-2.5 py-1 font-medium text-ember transition hover:bg-terracotta/10"
                        >
                          <Receipt size={13} aria-hidden />
                          Ver comprobante
                        </a>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] font-medium uppercase tracking-wide text-clay">Total</span>
                      <span className="text-xl font-bold tabular-nums text-ink">{formatMxn(order.total_cents)}</span>
                    </div>
                  </div>

                  {canCancel ? (
                    <div className="mt-4 flex justify-end border-t border-ink/8 pt-4">
                      <button
                        type="button"
                        disabled={cancellingId === order.id}
                        onClick={() => setCancelTarget(order)}
                        className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-terracotta/40 px-4 text-sm font-medium text-terracotta transition hover:bg-terracotta/10 disabled:opacity-50"
                      >
                        <Ban size={15} aria-hidden />
                        {cancellingId === order.id ? "Cancelando…" : "Cancelar pedido"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
      {lightboxOpen && proofPreview ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-carbon/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Comprobante en tamaño completo"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
          >
            <X size={20} />
          </button>
          <img
            src={proofPreview}
            alt="Comprobante de transferencia"
            className="max-h-[88vh] max-w-full rounded-xl object-contain shadow-[0_24px_60px_rgb(0_0_0_/0.5)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar pedido"
        body="¿Seguro que quieres cancelar este pedido? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        busy={Boolean(cancelTarget && cancellingId === cancelTarget.id)}
        onCancel={() => {
          if (!cancellingId) setCancelTarget(null);
        }}
        onConfirm={() => void confirmCancelOrder()}
      />
      <GoogleGateModal
        open={!loading && !user}
        title="Tu cuenta Vargas"
        body="Entra con Google para subir el comprobante y ver el estado de tus pedidos."
        error={loginError}
        onClose={() => {
          window.location.href = "/";
        }}
        onConfirm={() => {
          if (!loginBusy) void handleLogin();
        }}
      />
    </>
  );
}
