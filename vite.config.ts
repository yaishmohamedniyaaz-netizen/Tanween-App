import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        pageScaleProof: fileURLToPath(new URL("./outputs/mushaf-scale-proof/index.html", import.meta.url)),
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
});
