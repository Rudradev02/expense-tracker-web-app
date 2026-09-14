import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = process.env.VITE_BACKEND_URL || 
                      process.env.BACKEND_URL || 
                      (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : 'http://127.0.0.1:5000');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: true,
    proxy: {
      '/summary': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/transactions': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/categories': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  }
})
