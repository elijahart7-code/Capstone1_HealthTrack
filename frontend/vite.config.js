import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const staff = mode === "staff";
  return {
    resolve: {
      alias: {
        "@portal-app": fileURLToPath(new URL(staff ? "./src/utils/StaffApp.jsx" : "./src/utils/App.jsx", import.meta.url)),
      },
    },
    build: { outDir: staff ? "dist-staff" : "dist" },
    cacheDir: staff ? "node_modules/.vite-staff" : "node_modules/.vite-patient",
    plugins: [react(), tailwindcss()],
    server: {
      host: "127.0.0.1",
      port: staff ? 5174 : 5173,
      strictPort: true,
      fs: {
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", ...(staff
          ? ["**/src/users/patient/**", "**/src/utils/App.jsx"]
          : ["**/src/users/admin/**", "**/src/users/health_worker/**", "**/src/utils/StaffApp.jsx"])],
      },
      proxy: {
        "/api": {
          target: staff ? "http://127.0.0.1:5001" : "http://127.0.0.1:5000",
          changeOrigin: true,
        },
      },
    },
    preview: { host: "127.0.0.1", port: staff ? 4174 : 4173 },
  };
});
