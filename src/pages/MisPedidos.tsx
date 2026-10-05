import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { MapPin, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatMxn, formatOrderCode } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import {
  clearPendingCheckout,
  readPendingCheckout,
  type PendingCheckout,
} from "@/lib/pendingCheckout";
import { formatFulfillment, supabase, type OrderRow } from "@/lib/supabase";
import { useSiteContent } from "@/context/SiteContentContext";
import { FieldLabel } from "@/components/ui/FieldLabel";

export function MisPedidos() {
  const { user, loading, isStaff, signInGoogle, configured } = useAuth();
  const { business } = useSiteContent();
  const { clear } = useCart();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(() => readPendingCheckout());
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setPending(readPendingCheckout());
  }, [user]);

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

  async function submitWithProof() {
    if (!supabase || !user || !pending) return;
    if (!proofFile) {
      setError("Sube una captura o foto del comprobante de transferencia.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const ext = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upError } = await supabase.storage.from("payment-proofs").upload(path, proofFile, {
        upsert: true,
        contentType: proofFile.type || "image/jpeg",
      });
      if (upError) throw upError;

      const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      // Bucket privado: usamos path firmado o la URL pública si el bucket permite; guardamos path útil
      const proofUrl = pub.publicUrl;

      const { data, error: rpcError } = await supabase.rpc("place_order", {
        p_customer_name: pending.name,
        p_phone: pending.phone,
        p_fulfillment: "pickup",
        p_delivery_address: { mode: "pickup", street: "", colonia: "", references: "", city: business.location.city },
        p_items: pending.items.map((item) => ({
          id: item.id,
          qty: item.qty,
          tortillas: item.tortillas,
        })),
        p_notes: pending.notes,
        p_payment_proof_url: proofUrl,
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

  async function cancelOrder(order: OrderRow) {
    if (!supabase) return;
    const code = formatOrderCode(order.order_number, order.id);
    if (!confirm(`¿Cancelar el pedido ${code}?`)) return;
    setCancellingId(order.id);
    setError(null);
    const { error: rpcError } = await supabase.rpc("cancel_my_order", { p_order_id: order.id });
    setCancellingId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, status: "cancelado" } : item)),
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
          <section className="card-shadow mt-8 rounded-2xl border border-terracotta/25 bg-terracotta/5 p-5">
            <h2 className="font-display text-2xl text-ink">Sube tu comprobante</h2>
            <p className="mt-2 text-sm text-clay">
              Ya transferiste a la tarjeta del negocio. Sube una captura o foto del comprobante para crear el pedido{" "}
              <span className="font-medium text-ink">({formatMxn(pending.totalCents)})</span> a nombre de{" "}
              <span className="font-medium text-ink">{pending.name}</span>.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-clay">
              {pending.items.map((item) => (
                <li key={`${item.id}-${item.tortillas ?? "x"}`}>
                  {item.qty}× {item.name}
                  {item.tortillas ? ` · ${item.tortillas} tortilla${item.tortillas === 1 ? "" : "s"}` : ""}
                </li>
              ))}
            </ul>
            <label className="mt-5 block text-sm text-clay">
              <FieldLabel required>Comprobante (imagen)</FieldLabel>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-2 block w-full text-sm text-ink file:mr-3 file:rounded-[10px] file:border-0 file:bg-terracotta file:px-4 file:py-2 file:font-semibold file:text-white"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  clearPendingCheckout();
                  setPending(null);
                }}
                className="btn-secondary h-11 px-5 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={uploading || !proofFile}
                onClick={() => void submitWithProof()}
                className="btn-accent h-11 px-5"
              >
                <Upload size={16} aria-hidden />
                {uploading ? "Enviando…" : "Confirmar pedido"}
              </button>
            </div>
          </section>
        ) : null}

        {pending && !user && !loading ? (
          <p className="mt-6 rounded-2xl border border-terracotta/25 bg-terracotta/10 px-4 py-3 text-sm text-clay">
            Inicia sesión con Google para subir el comprobante y registrar tu pedido.
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
            return (
              <article key={order.id} className="card-shadow rounded-2xl bg-smoke p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-display text-2xl tracking-wide text-ink">{code}</p>
                  <p className="text-terracotta">{ORDER_STATUS_LABELS[order.status]}</p>
                </div>
                <p className="mt-2 text-sm text-clay">{new Date(order.created_at).toLocaleString("es-MX")}</p>
                <ul className="mt-3 text-clay">
                  {order.items.map((item, idx) => (
                    <li key={`${order.id}-${item.id}-${idx}`}>
                      {item.qty}× {item.name}
                      {item.kind === "taco" && item.tortillas
                        ? ` · ${item.tortillas} tortilla${item.tortillas === 1 ? "" : "s"}`
                        : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-ink">{formatMxn(order.total_cents)}</p>
                <p className="mt-2 text-sm text-clay">
                  {formatFulfillment(order.delivery_address, order.fulfillment)}
                </p>
                {canCancel ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={cancellingId === order.id}
                      onClick={() => void cancelOrder(order)}
                      className="inline-flex h-11 items-center rounded-[10px] border border-terracotta/40 px-4 text-sm font-medium text-terracotta disabled:opacity-50"
                    >
                      {cancellingId === order.id ? "Cancelando…" : "Cancelar pedido"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
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
