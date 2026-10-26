import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.DEV_API_PROXY_TARGET?.trim() || "http://192.168.11.94:8080";
  const agentProxyTarget = env.DEV_AGENT_PROXY_TARGET?.trim() || "http://192.168.60.65:9090";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        // Pintu 1: Gateway auditchain-api (Auth, Overview, Offchain Logs, Incidents, Merkle Verify)
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyRequest) => {
              proxyRequest.removeHeader("origin");
            });
          },
        },
        // Pintu 2: Agent auditchain-agent (Audit Live DB, Hash Compare, Recovery)
        "/agent-api": {
          target: agentProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent-api/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyRequest) => {
              proxyRequest.removeHeader("origin");
            });
          },
        },
      },
    },
  };
});
