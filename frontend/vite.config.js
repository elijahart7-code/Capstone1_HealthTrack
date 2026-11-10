import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  if (mode === "staff") throw new Error("The shared staff app was removed. Use --mode admin or --mode health-worker.");
  const portal = mode === "admin" ? "admin" : mode === "health-worker" ? "health_worker" : "patient";
  const portals = {
    patient: { entry: "App.jsx", outDir: "dist", web: 5173, api: 5000, preview: 4173 },
    admin: { entry: "AdminApp.jsx", outDir: "dist-admin", web: 5174, api: 5001, preview: 4174 },
    health_worker: { entry: "HealthWorkerApp.jsx", outDir: "dist-health-worker", web: 5175, api: 5002, preview: 4175 },
  };
  const selected = portals[portal];
  const otherPortals = Object.entries(portals).filter(([role]) => role !== portal);
  // Anchor build restrictions to this frontend directory. A glob such as
  // **/dist/** also blocks Vite's node_modules/vite/dist runtime.
  const buildPattern = directory => `${fileURLToPath(new URL(`./${directory}/`, import.meta.url)).replaceAll("\\", "/")}**`;
  return {
    resolve: {
      alias: {
        "@portal-app": fileURLToPath(new URL(`./src/utils/${selected.entry}`, import.meta.url)),
      },
    },
    define: { "import.meta.env.VITE_PORTAL": JSON.stringify(portal) },
    build: { outDir: selected.outDir },
    cacheDir: `node_modules/.vite-${portal}`,
    plugins: [react(), tailwindcss()],
    server: {
      host: "127.0.0.1",
      port: selected.web,
      strictPort: true,
      fs: {
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", buildPattern("dist-staff"), ...otherPortals.flatMap(([role, config]) => [
          `**/src/users/${role}/**`, `**/src/utils/${config.entry}`, buildPattern(config.outDir),
        ])],
      },
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${selected.api}`,
          changeOrigin: true,
        },
      },
    },
    preview: { host: "127.0.0.1", port: selected.preview },
  };
});
