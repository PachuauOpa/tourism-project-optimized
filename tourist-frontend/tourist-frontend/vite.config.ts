import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = mode === 'analyze' || process.env.ANALYZE === 'true';

  return {
    plugins: [
      react(),
      shouldAnalyze
      ? visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false
      })
      : null
    ].filter(Boolean),
    build: {
      assetsInlineLimit: 2048,
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('react-leaflet') || id.includes('leaflet')) return 'vendor-maps';
            if (id.includes('html2canvas')) return 'vendor-html2canvas';
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';

            return 'vendor-misc';
          }
        }
      },
      chunkSizeWarningLimit: 500
    }
  };
});