import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Config Vite separada para o build web (PWA, sem Electron) — ver
 * docs/WEBAPP.md. `electron.vite.config.ts` continua intocado e serve só o
 * build desktop; os dois lêem o mesmo `src/renderer/src` e `src/main`
 * (repositórios/serviços), sem duplicar UI ou regra de negócio.
 */
// GitHub Pages de projeto serve em https://<usuario>.github.io/LearnDeck/,
// não na raiz — todo asset precisa desse prefixo. `BASE_PATH` deixa isso
// configurável (ex.: build local pra hospedar na raiz de outro domínio).
const BASE_PATH = process.env.BASE_PATH ?? '/LearnDeck/'

export default defineConfig({
  base: BASE_PATH,
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
