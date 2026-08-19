import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Config mínima pra rodar os testes unitários (lógica de repositório e das
// funções puras do caderno) — mesmos aliases usados nos processos main/
// renderer (electron.vite.config.ts), sem precisar do Electron em si.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
