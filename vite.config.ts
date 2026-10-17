import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { PUBLIC_STATIC_ROUTES, publicProductRoutes } from "./src/lib/publicRoutes";

const SITE_URL = (process.env.VITE_SITE_URL || "https://vargastacos.com").replace(/\/+$/, "");

/** Genera sitemap.xml en el build del cliente con URLs absolutas y productos. */
function sitemapPlugin(): Plugin {
  return {
    name: "generate-sitemap",
    apply: "build",
    writeBundle(options, bundle) {
      if (!bundle["index.html"] || !options.dir) return;

      const entries = [
        ...PUBLIC_STATIC_ROUTES.map((loc) => ({
          loc,
          changefreq: loc === "/" ? "weekly" : "yearly",
          priority: loc === "/" ? "1.0" : "0.3",
        })),
        ...publicProductRoutes().map((loc) => ({
          loc,
          changefreq: "weekly",
          priority: "0.8",
        })),
      ];

      const urls = entries
        .map(
          (url) =>
            `  <url>\n    <loc>${SITE_URL}${url.loc === "/" ? "/" : url.loc}</loc>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`,
        )
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      writeFileSync(join(options.dir, "sitemap.xml"), xml, "utf8");

      // Lista de rutas para scripts/prerender.ts (sin depender de aliases TS en el script).
      writeFileSync(
        join(options.dir, "prerender-routes.json"),
        JSON.stringify(
          entries.map((e) => e.loc),
          null,
          2,
        ),
        "utf8",
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "worker" } }),
    sitemapPlugin(),
  ],
  environments: {
    worker: { build: { sourcemap: true } },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
