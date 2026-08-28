import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
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

/**
 * Identificador do build web, usado pela checagem de atualização do PWA (ver
 * src/web/updaterWeb.ts): o hash curto do commit muda só quando o conteúdo
 * realmente muda, o que faz dele um "número de versão" melhor que um
 * timestamp pra esse fim. Cai pra timestamp só se não houver um repo git à
 * mão (ex.: build a partir de um tarball, sem histórico).
 */
function computeWebBuildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return String(Date.now())
  }
}

const WEB_BUILD_ID = computeWebBuildId()

// Grava ANTES do build pra ir junto pro publicDir → out-web/version.json,
// servido estático na raiz do site. O app já rodando busca esse arquivo
// (bypassando cache) e compara com o id embutido no seu próprio bundle via
// `define` abaixo — os dois vêm do mesmo `WEB_BUILD_ID`, calculado uma única
// vez aqui, então nunca podem divergir por causa de timing.
writeFileSync(resolve('src/web/public/version.json'), JSON.stringify({ buildId: WEB_BUILD_ID }))

export default defineConfig({
  base: BASE_PATH,
  root: 'src/web',
  publicDir: 'public',
  define: {
    __WEB_BUILD_ID__: JSON.stringify(WEB_BUILD_ID)
  },
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
