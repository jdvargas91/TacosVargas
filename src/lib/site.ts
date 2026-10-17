/**
 * URL canónica del sitio en producción.
 * Se puede sobreescribir con la variable de build VITE_SITE_URL.
 * Se usa para construir URLs absolutas (canonical, Open Graph, sitemap, JSON-LD).
 */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) || "https://vargastacos.com"
).replace(/\/+$/, "");

/** Nombre del sitio para Open Graph (og:site_name). */
export const SITE_NAME = "Vargas Tacos";

/** Locale del sitio para Open Graph (og:locale). */
export const SITE_LOCALE = "es_MX";

/** Convierte una ruta o URL relativa en una URL absoluta con el dominio del sitio. */
export function absoluteUrl(path?: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
