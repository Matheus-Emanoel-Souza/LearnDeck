import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Config Vite separada para o build web (PWA, sem Electron) — ver
 * docs/WEBAPP.md. `electron.vite.config.ts` continua intocado e serve só o
 * build desktop; os dois lêem o mesmo `src/renderer/src` e `src/main`
 * (repositórios/serviços), sem duplicar UI ou regra de negócio.
 */
export default defineConfig({
  root: 'src/web',
  publicDir: 'public',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),
      'node:crypto': resolve('src/web/shims/nodeCrypto.ts')
    }
  },
  optimizeDeps: {
    exclude: ['sql.js']
  },
  build: {
    outDir: resolve('out-web'),
    emptyOutDir: true
  },
  plugins: [react()]
})
