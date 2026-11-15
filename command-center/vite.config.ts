import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), "VITE_");
  return {
    define: Object.fromEntries(
      Object.entries(environment).map(([key, value]) => [
        "import.meta.env." + key,
        JSON.stringify(value),
      ]),
    ),
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
    },
    server: {
      host: "127.0.0.1",
      port: 8081,
      strictPort: true,
      proxy: { "/api/archive": "http://127.0.0.1:8021" },
    },
    plugins: [
      tailwindcss(),
      tanstackStart({ server: { entry: "server" } }),
      ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
      react(),
    ],
  };
});
