/**
 * Rutas conocidas de la app (deben coincidir con src/App.tsx).
 * El Worker las usa para devolver 200 (shell SPA) vs 404 real.
 */
const EXACT = new Set([
  "/",
  "/terminos",
  "/privacidad",
  "/pedido",
  "/pedir",
  "/mis-pedidos",
  "/cuenta",
  "/login",
  "/sistema",
  "/admin",
]);

const PATTERNS: RegExp[] = [
  /^\/producto\/[^/]+\/?$/,
  /^\/sistema\/[^/]+\/?$/,
];

/** Normaliza pathname: sin query/hash, sin barra final (excepto "/"). */
export function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

/** True si la ruta es una página de la app (no un 404). */
export function isKnownSpaRoute(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (EXACT.has(path)) return true;
  return PATTERNS.some((re) => re.test(path));
}

/** True si parece un archivo estático (extensión), no una ruta de la SPA. */
export function looksLikeStaticAsset(pathname: string): boolean {
  const path = normalizePath(pathname);
  const base = path.split("/").pop() || "";
  // index.html de rutas prerenderizadas no cuenta como “asset suelto” aquí.
  if (!base.includes(".")) return false;
  // Evitar tratar IDs con punto raro; solo extensiones típicas de asset.
  return /\.(?:js|css|map|json|xml|txt|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|mp4|webm|avif|pdf)$/i.test(
    base,
  );
}

/** Redirects permanentes (mismo destino que Navigate en App.tsx). */
export const PERMANENT_REDIRECTS: Record<string, string> = {
  "/pedir": "/pedido",
  "/admin": "/sistema",
};
