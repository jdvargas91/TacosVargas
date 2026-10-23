/**
 * Debe importarse ANTES que el cliente de Supabase.
 * Si el callback PKCE cae en / (u otra ruta) con ?code=, reenviamos a /cuenta
 * con recarga completa para que el exchange ocurra en el destino correcto.
 */
const params = new URLSearchParams(window.location.search);
const hash = window.location.hash;
const isOauthCallback =
  params.has("code") ||
  params.has("error") ||
  params.has("error_description") ||
  hash.includes("access_token") ||
  /(?:^|[&#])error(?:_description)?=/.test(hash);

if (window.location.pathname !== "/cuenta" && isOauthCallback) {
  window.location.replace(`/cuenta${window.location.search}${window.location.hash}`);
}
