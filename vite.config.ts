import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // This manifest is what phones read to install the app
      manifest: {
        name: 'BillBlend',
        short_name: 'BillBlend',
        description: 'Mix the costs. Blend the bills. Settle up seamlessly.',
        theme_color: '#0f766e', // Matches our Ocean Blue Brand
        background_color: '#f8fafc', // Matches our App Background
        display: 'standalone', // Makes it look like a native app (no URL bar)
        orientation: 'portrait',
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
      }
    })
  ],
});