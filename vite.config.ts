import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core do React e Router
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Supabase client e auth
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Ícones e UI utilitários
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Gráficos (se houver recharts / chart.js / d3)
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Outros pacotes de terceiros
            return 'vendor-libs';
          }
        },
      },
    },
  },
});
