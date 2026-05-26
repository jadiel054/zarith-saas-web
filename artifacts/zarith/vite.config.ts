import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
// CORREÇÃO: verifica REPL_ID *antes* de tentar importar plugins Replit.
// No Vercel, REPL_ID é undefined — importar os plugins causaria crash no build.
const isReplit = Boolean(process.env.REPL_ID);

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
const basePath = process.env.BASE_PATH ?? "/";

// Helper seguro para importar plugins opcionais (não falha se o pacote não estiver disponível)
async function tryImport<T>(moduleId: string, getter: (mod: T) => unknown): Promise<unknown> {
  try {
    const mod = await import(moduleId) as T;
    return getter(mod);
  } catch {
    return null;
  }
}

export default defineConfig(async () => {
  const plugins: unknown[] = [react(), tailwindcss()];

  // Plugins de desenvolvimento Replit — só carregados em dev E dentro do Replit
  if (!isProduction && isReplit) {
    const runtimeModal = await tryImport(
      "@replit/vite-plugin-runtime-error-modal",
      (m: { default: () => unknown }) => m.default()
    );
    if (runtimeModal) plugins.push(runtimeModal);

    const cartographer = await tryImport(
      "@replit/vite-plugin-cartographer",
      (m: { cartographer: (opts: { root: string }) => unknown }) =>
        m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
    );
    if (cartographer) plugins.push(cartographer);

    const devBanner = await tryImport(
      "@replit/vite-plugin-dev-banner",
      (m: { devBanner: () => unknown }) => m.devBanner()
    );
    if (devBanner) plugins.push(devBanner);
  }

  return {
    base: basePath,
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      // Aumenta o aviso de chunk para não poluir os logs do Vercel com warnings
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Separa as bibliotecas grandes em chunks para melhor caching no CDN
          manualChunks: {
            vendor: ["react", "react-dom"],
            motion: ["framer-motion"],
            ui: ["@radix-ui/react-dialog", "cmdk", "lucide-react"],
            supabase: ["@supabase/supabase-js", "@supabase/ssr"],
          },
        },
      },
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
