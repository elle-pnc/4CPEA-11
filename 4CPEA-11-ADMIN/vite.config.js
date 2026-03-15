import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Admin/',
  plugins: [react()],
  server: {
    port: 5174,
    host: 'localhost',
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
