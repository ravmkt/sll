import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Lista os JS/CSS do build para o service worker guardar (uso offline do PDV).
// Fora da lista: arquivos muito pesados e de IA/WASM.
function precacheManifest(): Plugin {
  return {
    name: 'sll-precache-manifest',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files: string[] = [];
      for (const [name, f] of Object.entries(bundle)) {
        if (!/\.(js|css)$/.test(name)) continue;
        if (/imgly|onnx|ort-|wasm/i.test(name)) continue;
        const size = f.type === 'chunk' ? f.code.length : typeof f.source === 'string' ? f.source.length : f.source.byteLength;
        if (size > 1_500_000) continue;
        files.push('/' + name);
      }
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    precacheManifest()
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