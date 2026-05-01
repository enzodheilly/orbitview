import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Toutes les requêtes /api → Symfony (port 8080)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path, // garder le préfixe /api
      },
    },
  },
  build: {
    outDir: '../backend/public/app', // build servi par Nginx
    emptyOutDir: true,
  },
})
