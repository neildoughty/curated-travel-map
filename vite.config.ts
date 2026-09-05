import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Curated Travel Map',
        short_name: 'Travel Map',
        description:
          'A small, trusted, curated map of places you and your travel partner actually want to go.',
        theme_color: '#111527',
        background_color: '#f2f1ee',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // App shell cache-first; map tiles / API calls get their own
        // strategies once those pieces exist (Epic 2, Epic 3).
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
})
