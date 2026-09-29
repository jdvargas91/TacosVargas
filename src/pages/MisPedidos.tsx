import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { useAuth } from "@/context/AuthContext";
import { formatMxn, shortFolio } from "@/lib/format";
import { formatFulfillment, supabase, type OrderRow } from "@/lib/supabase";
import { useSiteContent } from "@/context/SiteContentContext";

const labels: Record<OrderRow["status"], string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function MisPedidos() {
  const { user, loading, isStaff, signInGoogle } = useAuth();
  const { business } = useSiteContent();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  if (!loading && isStaff) {
    return <Navigate to="/sistema" replace />;
  }

  return (
    <>
      <Seo title={`Mis pedidos · ${business.name}`} description="Seguimiento de tu orden." noindex />
      <Header />
      <main id="contenido" className="mx-auto min-h-svh max-w-4xl px-4 pb-20 pt-28">
        <h1 className="font-display text-4xl text-ink">Mis pedidos</h1>
        {loading ? <p className="mt-6 text-clay">Cargando…</p> : null}
        {!loading && user && orders.length === 0 ? (
          <p className="mt-6 text-clay">Aún no tienes pedidos.</p>
        ) : null}
        {error ? <p className="mt-4 text-terracotta">{error}</p> : null}
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="card-shadow rounded-2xl bg-smoke p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-2xl text-ink">{shortFolio(order.id)}</p>
                <p className="text-terracotta">{labels[order.status]}</p>
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
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <GoogleGateModal
        open={!loading && !user}
        title="Tu cuenta Vargas"
        body="Entra con Google para ver el historial y el estado de tus pedidos. No hace falta pasar por el login del equipo."
        onClose={() => {
          window.location.href = "/";
        }}
        onConfirm={() => {
          void signInGoogle(`${window.location.origin}/cuenta`);
        }}
      />
    </>
  );
}
