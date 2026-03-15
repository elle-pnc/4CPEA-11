import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  base: '/Commuter/',
  plugins: [
    react(),
    // Plugin to copy additional files after build
    {
      name: 'copy-additional-files',
      closeBundle() {
        const distDir = join(process.cwd(), 'dist')
        // Copy register.html
        try {
          copyFileSync('register.html', join(distDir, 'register.html'))
          console.log('✓ Copied register.html to dist/')
        } catch (err) {
          console.warn('⚠ Could not copy register.html:', err.message)
        }
        // Copy driver-simulation.html
        try {
          copyFileSync('driver-simulation.html', join(distDir, 'driver-simulation.html'))
          console.log('✓ Copied driver-simulation.html to dist/')
        } catch (err) {
          console.warn('⚠ Could not copy driver-simulation.html:', err.message)
        }
        // Copy .htaccess (try both .htaccess and htaccess.txt)
        try {
          copyFileSync('.htaccess', join(distDir, '.htaccess'))
          console.log('✓ Copied .htaccess to dist/')
        } catch (err) {
          // If .htaccess doesn't exist, try htaccess.txt
          try {
            copyFileSync('htaccess.txt', join(distDir, '.htaccess'))
            console.log('✓ Copied htaccess.txt as .htaccess to dist/')
          } catch (err2) {
            console.warn('⚠ Could not copy .htaccess:', err2.message)
          }
        }
      }
    }
  ],
  server: {
    port: 3000,
    open: true,
    hmr: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
})
