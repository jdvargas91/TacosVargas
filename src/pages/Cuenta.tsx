import { Navigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";
import { useSiteContent } from "@/context/SiteContentContext";

/**
 * Destino neutro tras Google OAuth.
 * Espera a que AuthContext reclame invitaciones de equipo y enruta por rol:
 * staff → /sistema · cliente → return path o /mis-pedidos · sin sesión → /login
 */
export function Cuenta() {
  const { user, loading, isStaff } = useAuth();
  const { business } = useSiteContent();

  if (loading) {
    return (
      <>
        <Seo title={`Cuenta · ${business.name}`} description="Redirigiendo…" noindex />
        <main className="mx-auto flex min-h-svh max-w-6xl items-center justify-center px-4">
          <p className="text-clay">Verificando tu cuenta…</p>
        </main>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isStaff) {
    sessionStorage.removeItem("vargas_post_login");
    return <Navigate to="/sistema" replace />;
  }

  const stored = sessionStorage.getItem("vargas_post_login");
  sessionStorage.removeItem("vargas_post_login");
  const allowed = stored === "/pedido" || stored === "/mis-pedidos" ? stored : "/mis-pedidos";
  return <Navigate to={allowed} replace />;
}
