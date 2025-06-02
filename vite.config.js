import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Permette accesso da rete locale (utile per test mobile)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ottimizzazioni per app mobile
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
  // PWA configuration (opzionale)
  // plugins: [
  //   react(),
  //   VitePWA({
  //     registerType: 'autoUpdate',
  //     manifest: {
  //       name: 'SmartSplit',
  //       short_name: 'SmartSplit',
  //       theme_color: '#5b21b6',
  //       icons: [
  //         {
  //           src: '/icon-192.png',
  //           sizes: '192x192',
  //           type: 'image/png'
  //         },
  //         {
  //           src: '/icon-512.png',
  //           sizes: '512x512',
  //           type: 'image/png'
  //         }
  //       ]
  //     }
  //   })
  // ]
});
