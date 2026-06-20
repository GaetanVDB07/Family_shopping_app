import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
) as { version: string };

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  css: {
    postcss: path.resolve(__dirname, "postcss.config.js"),
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@dnd-kit")) {
            return "dnd";
          }
          if (id.includes("@supabase")) {
            return "supabase";
          }
          if (id.includes("@tanstack/react-query")) {
            return "query";
          }
          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "ui";
          }
          if (id.includes("react-dom") || id.includes("/react/")) {
            return "vendor";
          }
        },
      },
    },
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
