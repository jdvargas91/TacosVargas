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

/** True si parece un archivo estático / módulo (no una ruta HTML de la SPA). */
export function looksLikeStaticAsset(pathname: string): boolean {
  const path = normalizePath(pathname);
  // Rutas internas de Vite / Cloudflare en desarrollo local.
  if (
    path.startsWith("/@") ||
    path.startsWith("/src/") ||
    path.startsWith("/node_modules/") ||
    path.startsWith("/__vite") ||
    path.startsWith("/.vite")
  ) {
    return true;
  }
  const base = path.split("/").pop() || "";
  if (!base.includes(".")) return false;
  return /\.(?:js|mjs|cjs|ts|tsx|jsx|css|map|json|xml|txt|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|mp4|webm|avif|pdf|wasm)$/i.test(
    base,
  );
}

/**
 * Solo las navegaciones de documento (HTML) deben pasar por la lógica 200/404.
 * Scripts, CSS, fetch, HMR, etc. van directo a ASSETS (imprescindible en `vite` local).
 */
export function isDocumentNavigation(request: Request): boolean {
  const mode = request.headers.get("Sec-Fetch-Mode");
  const dest = request.headers.get("Sec-Fetch-Dest");
  // Sin cabeceras (curl/bots antiguos): tratar como navegación.
  if (!mode && !dest) return true;
  if (dest === "document") return true;
  if (mode === "navigate" && (dest === "document" || !dest)) return true;
  return false;
}

/** Redirects permanentes (mismo destino que Navigate en App.tsx). */
export const PERMANENT_REDIRECTS: Record<string, string> = {
  "/pedir": "/pedido",
  "/admin": "/sistema",
};
