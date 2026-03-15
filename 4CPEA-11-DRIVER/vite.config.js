import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Driver/',
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
