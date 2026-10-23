import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { OAUTH_PENDING_KEY, useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useSiteContent } from "@/context/SiteContentContext";
import { LOGIN_ERROR_KEY, readPendingCheckout } from "@/lib/pendingCheckout";

/**
 * Destino neutro tras Google OAuth.
 * Espera a que AuthContext reclame invitaciones de equipo y enruta por rol:
 * staff → /sistema · cliente → return path o /mis-pedidos · sin sesión → /login
 */
export function Cuenta() {
  const { user, loading, isStaff } = useAuth();
  const { business } = useSiteContent();
  const { clear } = useCart();
  const pendingOnLogin = Boolean(user && !isStaff && readPendingCheckout());
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasCodeInUrl = params.has("code") || hash.has("access_token");

  useEffect(() => {
    if (!pendingOnLogin) return;
    clear();
  }, [clear, pendingOnLogin]);

  // Esperar INITIAL_SESSION / exchange PKCE. Si aún hay ?code= en la URL, no salir a /login.
  if (loading || (hasCodeInUrl && !user)) {
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
    const stored = sessionStorage.getItem("vargas_post_login");
    const oauthError = params.get("error_description") || hash.get("error_description") || params.get("error");
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    if (stored === "/mis-pedidos" || stored === "/pedido" || oauthError) {
      sessionStorage.removeItem("vargas_post_login");
      sessionStorage.setItem(
        LOGIN_ERROR_KEY,
        oauthError
          ? "No se pudo iniciar sesión con Google. Tu pedido sigue en esta pantalla."
          : "No se completó el acceso con Google. Tu pedido sigue en esta pantalla.",
      );
      return <Navigate to="/pedido" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  sessionStorage.removeItem(OAUTH_PENDING_KEY);

  if (isStaff) {
    sessionStorage.removeItem("vargas_post_login");
    return <Navigate to="/sistema" replace />;
  }

  const stored = sessionStorage.getItem("vargas_post_login");
  sessionStorage.removeItem("vargas_post_login");
  const allowed = stored === "/pedido" || stored === "/mis-pedidos" ? stored : "/mis-pedidos";
  return <Navigate to={allowed} replace />;
}
