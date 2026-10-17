/**
 * Prerender de rutas públicas tras el build.
 * Sirve dist/client con fallback SPA, visita cada ruta con Playwright
 * y guarda HTML estático para que Cloudflare Assets lo sirva antes del SPA.
 *
 * Las rutas se leen de dist/client/prerender-routes.json (generado en el build).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "client");
const PORT = Number(process.env.PRERENDER_PORT || 4179);
const BASE = `http://127.0.0.1:${PORT}`;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

function safePath(urlPath: string) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const cleaned = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return join(DIST, cleaned);
}

async function tryFile(path: string) {
  try {
    const info = await stat(path);
    if (info.isFile()) return path;
    if (info.isDirectory()) {
      const index = join(path, "index.html");
      const indexInfo = await stat(index);
      if (indexInfo.isFile()) return index;
    }
  } catch {
    /* missing */
  }
  return null;
}

async function resolveAsset(urlPath: string) {
  const base = safePath(urlPath);
  return (
    (await tryFile(base)) ||
    (await tryFile(`${base}.html`)) ||
    (await tryFile(join(base, "index.html"))) ||
    // Fallback SPA: React Router resuelve la ruta en el cliente.
    (await tryFile(join(DIST, "index.html")))
  );
}

async function startServer() {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url || "/", BASE);
      const file = await resolveAsset(url.pathname);
      if (!file) {
        res.writeHead(404).end("Not found");
        return;
      }
      const body = await readFile(file);
      const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(body);
    } catch (error) {
      console.error(error);
      res.writeHead(500).end("Error");
    }
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolveListen());
  });

  return server;
}

function outFileForRoute(route: string) {
  if (route === "/") return join(DIST, "index.html");
  return join(DIST, route.replace(/^\//, ""), "index.html");
}

function relativeOut(path: string) {
  return path.replace(ROOT, "").replace(/^[\\/]/, "");
}

async function waitForSeo(page: Page, route: string) {
  // Los <script> no son "visibles"; basta con que estén en el DOM (Helmet).
  await page.waitForSelector('script[type="application/ld+json"]', {
    state: "attached",
    timeout: 20_000,
  });
  await page.waitForFunction(
    () => {
      const title = document.title?.trim() || "";
      return title.length > 0 && !title.toLowerCase().includes("cargando");
    },
    { timeout: 15_000 },
  );
  if (route.startsWith("/producto/")) {
    await page.waitForSelector("#contenido h1", { state: "attached", timeout: 15_000 });
  } else {
    await page.waitForSelector("#contenido", { state: "attached", timeout: 15_000 });
  }
}

async function prerenderRoute(page: Page, route: string) {
  const url = `${BASE}${route}`;
  // `load` (no networkidle): Supabase/fonts/vídeo pueden mantener conexiones abiertas.
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await waitForSeo(page, route);

  // Home: desplazar un poco para que IntersectionObserver cargue secciones cercanas.
  // Usamos string (no función) para que tsx/esbuild no inyecte helpers (__name) en el browser.
  if (route === "/") {
    await page.evaluate(`(async () => {
      const step = 500;
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const max = Math.min(document.body.scrollHeight, 3500);
      for (let y = 0; y < max; y += step) {
        window.scrollTo(0, y);
        await delay(80);
      }
      window.scrollTo(0, 0);
    })()`);
    await new Promise((r) => setTimeout(r, 400));
  }

  const html = await page.content();
  const out = outFileForRoute(route);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html, "utf8");
  console.log(`  ✓ ${route} → ${relativeOut(out)}`);
}

async function prerenderNotFound(page: Page) {
  const fakeRoute = "/__prerender_404__";
  await page.goto(`${BASE}${fakeRoute}`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForFunction(
    () => (document.title?.trim() || "").toLowerCase().includes("no encontrada"),
    { timeout: 15_000 },
  );
  await page.waitForSelector("#contenido h1", { state: "attached", timeout: 15_000 });
  const html = await page.content();
  const out = join(DIST, "404.html");
  await writeFile(out, html, "utf8");
  console.log(`  ✓ 404 → ${relativeOut(out)}`);
}

async function loadRoutes(): Promise<string[]> {
  const routesPath = join(DIST, "prerender-routes.json");
  const raw = await readFile(routesPath, "utf8");
  const routes = JSON.parse(raw) as string[];
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error("prerender-routes.json vacío o inválido");
  }
  return routes;
}

async function main() {
  if (process.env.SKIP_PRERENDER === "1" || process.env.SKIP_PRERENDER === "true") {
    console.log("SKIP_PRERENDER activo: se omite el prerender.");
    return;
  }

  const routes = await loadRoutes();
  console.log(`Prerender: ${routes.length} rutas públicas en ${relativeOut(DIST)}`);

  const indexPath = join(DIST, "index.html");
  try {
    await stat(indexPath);
  } catch {
    throw new Error(`No existe ${indexPath}. Ejecuta el build antes del prerender.`);
  }

  const server = await startServer();
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    // Sin carrito ni preferencias: HTML limpio para bots.
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });

    for (const route of routes) {
      await prerenderRoute(page, route);
    }

    // Página 404 real (HTTP 404 + HTML NotFound) para el Worker.
    await prerenderNotFound(page);
  } finally {
    await browser.close();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }

  console.log("Prerender listo.");
}

main().catch((error) => {
  console.error("Prerender falló:", error);
  process.exit(1);
});
