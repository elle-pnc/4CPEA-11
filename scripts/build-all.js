#!/usr/bin/env node
/**
 * Combined build script for CPE11-AFCS
 * Builds Commuter, Admin, and Driver apps and merges into dist/
 * 
 * Usage: node scripts/build-all.js
 * Or: npm run build:all (from root)
 */

import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST_COMBINED = join(ROOT, 'dist-combined')

function runBuild(cwd) {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd,
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    throw new Error(`Build failed in ${cwd}`)
  }
}

async function main() {
  console.log('🏗️  Building CPE11-AFCS (Commuter, Admin, Driver)...\n')

  // Clean combined dist
  if (existsSync(DIST_COMBINED)) {
    rmSync(DIST_COMBINED, { recursive: true })
  }
  mkdirSync(DIST_COMBINED, { recursive: true })

  // 1. Build Commuter
  console.log('📦 Building Commuter app...')
  runBuild(ROOT)
  cpSync(join(ROOT, 'dist'), join(DIST_COMBINED, 'Commuter'), { recursive: true })
  console.log('   ✓ Commuter → dist/Commuter/\n')

  // 2. Build Admin
  console.log('📦 Building Admin app...')
  runBuild(join(ROOT, '4CPEA-11-ADMIN'))
  cpSync(join(ROOT, '4CPEA-11-ADMIN', 'dist'), join(DIST_COMBINED, 'Admin'), { recursive: true })
  console.log('   ✓ Admin → dist/Admin/\n')

  // 3. Build Driver
  console.log('📦 Building Driver app...')
  runBuild(join(ROOT, '4CPEA-11-DRIVER'))
  cpSync(join(ROOT, '4CPEA-11-DRIVER', 'dist'), join(DIST_COMBINED, 'Driver'), { recursive: true })
  console.log('   ✓ Driver → dist/Driver/\n')

  // 4. Create root landing page
  const landingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CPE11-AFCS - Automated Fare Collection System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 2rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: rgba(255,255,255,0.8); margin-bottom: 2rem; }
    .apps {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    a {
      display: block;
      padding: 1rem 2rem;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }
    a:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <h1>CPE11-AFCS</h1>
  <p>Automated Fare Collection System</p>
  <div class="apps">
    <a href="/Commuter/">Commuter App</a>
    <a href="/Admin/">Admin Dashboard</a>
    <a href="/Driver/">Driver App</a>
  </div>
</body>
</html>`

  writeFileSync(join(DIST_COMBINED, 'index.html'), landingHtml)
  console.log('   ✓ Landing page → dist/index.html\n')

  // 5. Copy .htaccess for Hostinger (SPA fallback)
  try {
    cpSync(join(ROOT, 'htaccess-combined.txt'), join(DIST_COMBINED, '.htaccess'))
    console.log('   ✓ .htaccess (Hostinger SPA fallback) → dist-combined/\n')
  } catch (err) {
    console.warn('   ⚠ Could not copy htaccess-combined.txt:', err.message)
  }

  console.log('✅ Build complete! Output: dist-combined/')
  console.log('   - /Commuter/  → Commuter app')
  console.log('   - /Admin/    → Admin dashboard')
  console.log('   - /Driver/   → Driver app')
  console.log('   - /          → Landing page\n')
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
