import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { useAuth } from "@/context/AuthContext";
import { formatMxn, formatOrderCode } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { formatFulfillment, supabase, type OrderRow } from "@/lib/supabase";
import { useSiteContent } from "@/context/SiteContentContext";

export function MisPedidos() {
  const { user, loading, isStaff, signInGoogle, configured } = useAuth();
  const { business } = useSiteContent();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
  }, [user]);

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

  async function cancelOrder(order: OrderRow) {
    if (!supabase) return;
    const code = formatOrderCode(order.order_number, order.id);
    if (
      !confirm(
        `¿Cancelar el pedido ${code}?\n\nSolo se puede cancelar mientras esté en estado Nuevo (aún no lo preparan). Las existencias se liberan.`,
      )
    ) {
      return;
    }
    setCancellingId(order.id);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("cancel_my_order", { p_order_id: order.id });
    setCancellingId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const status =
      data && typeof data === "object" && "status" in data
        ? String((data as { status: string }).status)
        : "cancelado";
    setOrders((current) =>
      current.map((item) =>
        item.id === order.id ? { ...item, status: status as OrderRow["status"] } : item,
      ),
    );
  }

  if (!loading && isStaff) {
    return <Navigate to="/sistema" replace />;
  }

  return (
    <>
      <Seo title={`Mis pedidos · ${business.name}`} description="Seguimiento de tu orden." noindex />
      <Header />
      <main id="contenido" className="mx-auto min-h-svh max-w-4xl px-4 pb-20 pt-28">
        <h1 className="font-display text-4xl text-ink">Mis pedidos</h1>
        <p className="mt-2 text-sm text-clay">
          Puedes cancelar un pedido solo mientras esté en <span className="font-medium text-ink">Nuevo</span>. Si ya
          está en preparación, escribe al local por WhatsApp.
        </p>
        {loading ? <p className="mt-6 text-clay">Cargando…</p> : null}
        {!loading && user && orders.length === 0 ? (
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
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.id}`}>
                      {item.qty}× {item.name}
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
        body="Entra con Google para ver el historial y el estado de tus pedidos. No hace falta pasar por el login del equipo."
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
