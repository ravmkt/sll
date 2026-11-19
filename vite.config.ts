import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: { format: 'es' },
  build: {
    cssMinify: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // Libs pesadas e raras: sem chunk manual, vao para o chunk de quem as importa
            if (/node_modules\/(@imgly|onnxruntime-[^/]+|xlsx|jszip)\//.test(id)) return;

            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (/node_modules\/@supabase\//.test(id)) return 'vendor-supabase';
            if (/node_modules\/lucide-react\//.test(id)) return 'vendor-icons';
            if (/node_modules\/(recharts|d3-[^/]+|victory-vendor)\//.test(id)) return 'vendor-charts';
          },
      },
    },
  },
});