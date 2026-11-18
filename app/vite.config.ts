import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Khawarizmi app. The curriculum arrives as content packs (tools/content-packs.mjs); design tokens are read from ../content.
// Offline: the app shell and the core content pack are installed with the app; each 3D world is downloaded on demand into
// its own cache ('worlds') and served from it; a new version waits and is announced in the parents' corner.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
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
        globPatterns: ['**/*.{js,css,html,woff2,svg,webmanifest,enc}', 'icons/*.png', 'family/*.bin', 'fallback/*.jpg', 'content/manifest.json', 'content/core.json'],
        globIgnores: ['worlds/**'],
        runtimeCaching: [
          // a downloaded world is served from its cache (the app fills it on download; see src/data/packs.ts)
          { urlPattern: ({ url }) => url.pathname.includes('/worlds/') && !url.pathname.endsWith('/worlds/index.json'), handler: 'CacheFirst', options: { cacheName: 'worlds' } },
          { urlPattern: ({ url }) => url.pathname.includes('/content/') || url.pathname.endsWith('/worlds/index.json'), handler: 'StaleWhileRevalidate', options: { cacheName: 'content' } },
        ],
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
