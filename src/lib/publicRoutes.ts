import { productPath, seedProducts } from "../data/seedProducts";

/** Rutas públicas indexables (SEO). No incluye admin ni área del cliente. */
export const PUBLIC_STATIC_ROUTES = ["/", "/terminos", "/privacidad"] as const;

export function publicProductRoutes() {
  return seedProducts.map((product) => productPath(product.id));
}

/** Todas las URLs públicas a prerenderizar e incluir en el sitemap. */
export function publicRoutes(): string[] {
  return [...PUBLIC_STATIC_ROUTES, ...publicProductRoutes()];
}
