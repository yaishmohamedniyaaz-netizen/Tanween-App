import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ["scripts/qa/fixed-mushaf.html"] },
  server: { host: "127.0.0.1", port: 5295, strictPort: true,
    watch: { ignored: ["**/outputs/mushaf-review-site/**", "**/tmp/**", "**/.private/**"] } },
});
