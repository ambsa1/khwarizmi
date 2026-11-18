import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Khawarizmi app. Content (skills, worlds, design tokens) is read from ../content so data stays the single source of truth.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'family/*'],
      manifest: {
        id: './',
        name: 'خوارزمي',
        short_name: 'خوارزمي',
        description: 'رحلة سراج عبر السودان: برمجة وتقنية وإنجليزية وألغاز ومدرسة، بدون إنترنت',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F4E3C1',
        theme_color: '#F4E3C1',
        categories: ['education', 'kids', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest,enc,bin}', 'worlds/**/*.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { fs: { allow: ['..'] } },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // three alone; the React Three Fiber family (it bundles its own zustand use); React; the rest stays in index.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules[\/]three[\/]/.test(id)) return 'three';
          if (/@react-three|three-stdlib|zustand|its-fine|suspend-react|camera-controls|maath|troika|meshline|stats/.test(id)) return 'r3f';
          if (/node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
