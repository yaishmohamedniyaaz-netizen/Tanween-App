import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "outputs/mushaf-integrated-public-build",
    emptyOutDir: true,
    rollupOptions: { input: "scripts/qa/fixed-mushaf.html" },
  },
  preview: { host: "127.0.0.1", port: 5296, strictPort: true },
});
