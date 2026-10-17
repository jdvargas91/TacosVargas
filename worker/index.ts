import {
  isDocumentNavigation,
  isKnownSpaRoute,
  looksLikeStaticAsset,
  normalizePath,
  PERMANENT_REDIRECTS,
} from "./knownRoutes";

function redirect(to: string, request: Request, status: 301 | 302 = 301): Response {
  const url = new URL(to, request.url);
  return Response.redirect(url.toString(), status);
}

async function fetchAsset(env: Env, request: Request, path: string): Promise<Response> {
  const url = new URL(path, request.url);
  return env.ASSETS.fetch(new Request(url, request));
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

/**
 * Busca HTML estático (prerender) sin devolver el 307 de barra final al cliente.
 * Así `/terminos` responde 200 con el mismo HTML que `/terminos/`.
 */
async function resolveHtmlAsset(env: Env, request: Request, path: string): Promise<Response | null> {
  const candidates =
    path === "/"
      ? ["/", "/index.html"]
      : [path, `${path}/`, `${path}/index.html`];

  for (const candidate of candidates) {
    const res = await fetchAsset(env, request, candidate);
    if (res.ok) return res;

    if (isRedirect(res.status)) {
      const location = res.headers.get("Location");
      if (!location) continue;
      const nextPath = new URL(location, request.url).pathname;
      const followed = await fetchAsset(env, request, nextPath);
      if (followed.ok) return followed;
      const asIndex = await fetchAsset(env, request, `${nextPath.replace(/\/$/, "")}/index.html`);
      if (asIndex.ok) return asIndex;
    }
  }
  return null;
}

/** Sigue un redirect interno del binding ASSETS (p. ej. /index.html → /). */
async function fetchHtmlFile(env: Env, request: Request, file: string): Promise<Response> {
  let res = await fetchAsset(env, request, file);
  if (!res.ok && isRedirect(res.status)) {
    const location = res.headers.get("Location");
    if (location) {
      res = await fetchAsset(env, request, new URL(location, request.url).pathname);
    }
  }
  return res;
}

/** Sirve el shell SPA (index.html) o 404.html con el status indicado. */
async function serveHtml(
  env: Env,
  request: Request,
  file: "/index.html" | "/404.html",
  status: number,
): Promise<Response> {
  let bodyRes = await fetchHtmlFile(env, request, file);
  if (!bodyRes.ok && file === "/404.html") {
    bodyRes = await fetchHtmlFile(env, request, "/index.html");
  }
  if (!bodyRes.ok) {
    bodyRes = await fetchHtmlFile(env, request, "/");
  }

  const headers = new Headers(bodyRes.headers);
  if (status === 404) {
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return new Response(bodyRes.body, {
    status,
    statusText: status === 404 ? "Not Found" : "OK",
    headers,
  });
}

function withEdgeHeader(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-TV-Edge", "worker");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Cache-Control para estáticos (run_worker_first no aplica public/_headers solo). */
function cacheControlForAsset(path: string): string | null {
  if (path.startsWith("/assets/")) {
    return "public, max-age=31536000, immutable";
  }
  if (/\.(?:woff2?|ttf|otf)$/i.test(path)) {
    return "public, max-age=31536000, immutable";
  }
  if (/\.(?:webp|avif|jpe?g|png|gif|svg|ico|mp4|webm)$/i.test(path)) {
    return "public, max-age=2592000, stale-while-revalidate=86400";
  }
  if (/\.(?:js|mjs|css|map)$/i.test(path)) {
    return "public, max-age=31536000, immutable";
  }
  return null;
}

async function serveStaticAsset(
  env: Env,
  request: Request,
  path: string,
  opts?: { cache?: boolean },
): Promise<Response> {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  if (!opts?.cache) return asset;

  const cache = cacheControlForAsset(path);
  if (!cache) return withEdgeHeader(asset);

  const headers = new Headers(asset.headers);
  headers.set("Cache-Control", cache);
  headers.set("X-TV-Edge", "worker");
  return new Response(asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const host = url.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";

    // En local, no reescribimos respuestas (rompe el HTML transform de Vite).
    // Redirects sí; deep links SPA caen a index.html sin clonar el Response.
    if (isLocal) {
      if (looksLikeStaticAsset(path) || !isDocumentNavigation(request)) {
        return serveStaticAsset(env, request, path);
      }
      const localRedirect = PERMANENT_REDIRECTS[path];
      if (localRedirect) return withEdgeHeader(redirect(localRedirect, request, 301));

      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;

      // Hard refresh en /pedido, /producto/…, etc.
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }

    // Módulos / assets / fetch: nunca pasar por la lógica HTML 200/404.
    if (looksLikeStaticAsset(path) || !isDocumentNavigation(request)) {
      return serveStaticAsset(env, request, path, { cache: true });
    }

    const dest = PERMANENT_REDIRECTS[path];
    if (dest) return withEdgeHeader(redirect(dest, request, 301));

    // HTML prerenderizado (home, legales, productos) en la URL canónica sin barra final.
    const html = await resolveHtmlAsset(env, request, path);
    if (html) return withEdgeHeader(html);

    // Ruta conocida de la SPA sin HTML prerenderizado (pedido, login, sistema…).
    if (isKnownSpaRoute(path)) {
      return withEdgeHeader(await serveHtml(env, request, "/index.html", 200));
    }

    // Ruta desconocida: HTTP 404 real + página NotFound prerenderizada.
    return withEdgeHeader(await serveHtml(env, request, "/404.html", 404));
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const supabaseUrl = env.SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !key) {
      console.error(JSON.stringify({ ok: false, error: "Faltan secretos de Supabase" }));
      controller.noRetry();
      return;
    }

    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/reset_daily_availability`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(JSON.stringify({ ok: false, status: res.status, body }));
      throw new Error("reset_daily_availability failed");
    }

    console.log(JSON.stringify({ ok: true, cron: controller.cron }));
  },
} satisfies ExportedHandler<Env>;
