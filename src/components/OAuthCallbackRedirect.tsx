import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Si Supabase no tiene /cuenta en Redirect URLs, cae al Site URL (/) con ?code= (PKCE).
 * Reenviamos ese callback a /cuenta para que el enrutado por rol (staff → /sistema) ocurra.
 */
export function OAuthCallbackRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/cuenta") return;

    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const isOauthCallback =
      params.has("code") ||
      params.has("error") ||
      params.has("error_description") ||
      hash.has("access_token") ||
      hash.has("error") ||
      hash.has("error_description");

    if (!isOauthCallback) return;

    navigate(`/cuenta${location.search}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}
