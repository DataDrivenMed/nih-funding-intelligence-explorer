import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev  → base '/'  (default, no env var needed)
// GitHub Pages → VITE_BASE_PATH='/nih-funding-intelligence-explorer/' set in CI env
// Live URL: https://datadrivenmed.github.io/nih-funding-intelligence-explorer/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
