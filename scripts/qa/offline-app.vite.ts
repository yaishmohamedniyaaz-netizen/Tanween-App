import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: {
  outDir: 'outputs/offline-validation/build', emptyOutDir: true,
  rollupOptions: { input: 'scripts/qa/offline-app.html' },
} });
