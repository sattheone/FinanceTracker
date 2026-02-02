import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['vite.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Finance Tracker',
        short_name: 'Finance Tracker',
        description: 'Personal Finance Tracking App',
        theme_color: '#ffffff',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [], // Explicitly empty to prevent API/Firestore caching
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 // Increase limit to 4MB
      }
    })
  ],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/nse': {
        target: 'https://archives.nseindia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nse/, ''),
        headers: {
          // Mimic a browser to avoid 403 Forbidden from NSE
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.nseindia.com/'
        }
      },
      '/api/amfi': {
        target: 'https://portal.amfiindia.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/amfi/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})