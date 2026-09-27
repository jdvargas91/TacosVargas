import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { RequireRole } from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { useSiteContent } from "@/context/SiteContentContext";
import { PedidosPanel } from "@/components/sistema/PedidosPanel";
import { MostradorPanel } from "@/components/sistema/MostradorPanel";
import { EquipoPanel } from "@/components/sistema/EquipoPanel";
import { CatalogoPanel } from "@/components/sistema/CatalogoPanel";
import { SitioPanel } from "@/components/sistema/SitioPanel";
import { ResenasPanel } from "@/components/sistema/ResenasPanel";

type Tab = "pedidos" | "mostrador" | "equipo" | "catalogo" | "sitio" | "resenas";

export function Sistema() {
  return (
    <RequireRole roles={["admin", "vendedor"]} fallback="/login">
      <SistemaShell />
    </RequireRole>
  );
}

function SistemaShell() {
  const { isAdmin, role, signOut, displayName } = useAuth();
  const { business } = useSiteContent();
  const tabs = useMemo(() => {
    const base: { id: Tab; label: string }[] = [
      { id: "pedidos", label: "Pedidos" },
      { id: "mostrador", label: "Mostrador" },
    ];
    if (isAdmin) {
      base.push(
        { id: "catalogo", label: "Productos" },
        { id: "sitio", label: "Sitio" },
        { id: "resenas", label: "Reseñas" },
        { id: "equipo", label: "Equipo" },
      );
    }
    return base;
  }, [isAdmin]);

  const [tab, setTab] = useState<Tab>("pedidos");

  useEffect(() => {
    if (!tabs.some((item) => item.id === tab)) setTab("pedidos");
  }, [tab, tabs]);

  return (
    <>
      <Seo title={`Sistema · ${business.name}`} description="Panel operativo." noindex />
      <Header />
      <main id="contenido" className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-ink">Sistema</h1>
            <p className="mt-2 text-sm text-clay">
              {displayName ?? "Equipo"} · {role === "admin" ? "Administrador" : "Vendedor"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="h-11 rounded-full border border-ink/15 px-4 leading-11 text-ink">
              Ver sitio
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="h-11 rounded-full border border-ink/15 px-4 text-ink"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`h-11 rounded-full px-4 ${
                tab === item.id ? "bg-terracotta text-ink" : "border border-ink/15 text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "pedidos" ? <PedidosPanel /> : null}
        {tab === "mostrador" ? <MostradorPanel /> : null}
        {tab === "equipo" && isAdmin ? <EquipoPanel /> : null}
        {tab === "catalogo" && isAdmin ? <CatalogoPanel /> : null}
        {tab === "sitio" && isAdmin ? <SitioPanel /> : null}
        {tab === "resenas" && isAdmin ? <ResenasPanel /> : null}
      </main>
    </>
  );
}
