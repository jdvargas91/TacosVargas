import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  Store,
  Users,
  X,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { BrandLogo } from "@/components/BrandLogo";
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

const tabMeta: Record<Tab, { label: string; icon: typeof ClipboardList }> = {
  pedidos: { label: "Pedidos", icon: ClipboardList },
  mostrador: { label: "Mostrador", icon: Store },
  catalogo: { label: "Menú", icon: Package },
  sitio: { label: "Página web", icon: LayoutGrid },
  resenas: { label: "Opiniones", icon: MessageSquareQuote },
  equipo: { label: "Equipo", icon: Users },
};

export function Sistema() {
  return (
    <RequireRole roles={["admin", "vendedor"]} fallback="/mis-pedidos">
      <SistemaShell />
    </RequireRole>
  );
}

function SistemaShell() {
  const { isAdmin, role, signOut, displayName } = useAuth();
  const { business } = useSiteContent();
  const [navOpen, setNavOpen] = useState(false);

  const tabs = useMemo(() => {
    const base: Tab[] = ["pedidos", "mostrador"];
    if (isAdmin) base.push("catalogo", "sitio", "resenas", "equipo");
    return base;
  }, [isAdmin]);

  const [tab, setTab] = useState<Tab>("pedidos");

  useEffect(() => {
    if (!tabs.includes(tab)) setTab("pedidos");
  }, [tab, tabs]);

  function selectTab(next: Tab) {
    setTab(next);
    setNavOpen(false);
  }

  const SidebarNav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Panel">
      {tabs.map((id) => {
        const meta = tabMeta[id];
        const Icon = meta.icon;
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium transition ${
              active ? "bg-terracotta text-white shadow-sm" : "text-clay hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Icon size={18} aria-hidden />
            {meta.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      <Seo title={`Sistema · ${business.name}`} description="Panel operativo." noindex />
      <div className="flex min-h-svh bg-[#F7F1E8] text-ink">
        {/* Desktop sidebar — fijo al hacer scroll */}
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col self-start overflow-y-auto border-r border-ink/10 bg-paper md:flex">
          <div className="border-b border-ink/10 px-5 py-5">
            <BrandLogo className="h-10 drop-shadow-none" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-clay">Sistema</p>
            <p className="mt-1 truncate text-sm text-ink">{displayName ?? "Equipo"}</p>
            <p className="text-xs text-clay">{role === "admin" ? "Administrador" : "Vendedor"}</p>
          </div>
          {SidebarNav}
          <div className="mt-auto space-y-2 border-t border-ink/10 p-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-clay transition hover:bg-ink/5 hover:text-ink"
            >
              <ExternalLink size={18} aria-hidden />
              Ver sitio
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-clay transition hover:bg-ink/5 hover:text-ink"
            >
              <LogOut size={18} aria-hidden />
              Salir
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {navOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-carbon/40"
              aria-label="Cerrar menú"
              onClick={() => setNavOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-paper shadow-xl">
              <div className="flex items-center justify-between border-b border-ink/10 px-4 py-4">
                <BrandLogo className="h-9 drop-shadow-none" />
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-[10px] border border-ink/15"
                  aria-label="Cerrar"
                  onClick={() => setNavOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="border-b border-ink/10 px-4 py-3">
                <p className="truncate text-sm font-medium text-ink">{displayName ?? "Equipo"}</p>
                <p className="text-xs text-clay">{role === "admin" ? "Administrador" : "Vendedor"}</p>
              </div>
              {SidebarNav}
              <div className="mt-auto space-y-2 border-t border-ink/10 p-3">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-clay"
                >
                  <ExternalLink size={18} aria-hidden />
                  Ver sitio
                </a>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-clay"
                >
                  <LogOut size={18} aria-hidden />
                  Salir
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-ink/10 bg-paper px-4 py-3 md:hidden">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-[10px] border border-ink/15"
              aria-label="Abrir menú"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{tabMeta[tab].label}</p>
              <p className="truncate text-xs text-clay">{role === "admin" ? "Administrador" : "Vendedor"}</p>
            </div>
          </header>

          <main id="contenido" className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 md:px-8 md:py-8">
            <div className="mb-6 hidden shrink-0 md:block">
              <h1 className="font-display text-3xl text-ink md:text-4xl">{tabMeta[tab].label}</h1>
              <p className="mt-1 text-sm text-clay">
                {business.name} · panel {role === "admin" ? "de administración" : "de ventas"}
              </p>
            </div>

            <div
              className={
                tab === "mostrador" ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto"
              }
            >
              {tab === "pedidos" ? <PedidosPanel /> : null}
              {tab === "mostrador" ? <MostradorPanel /> : null}
              {tab === "equipo" && isAdmin ? <EquipoPanel /> : null}
              {tab === "catalogo" && isAdmin ? <CatalogoPanel /> : null}
              {tab === "sitio" && isAdmin ? <SitioPanel /> : null}
              {tab === "resenas" && isAdmin ? <ResenasPanel /> : null}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
