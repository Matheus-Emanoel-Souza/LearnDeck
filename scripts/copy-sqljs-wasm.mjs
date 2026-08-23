// sql.js precisa do arquivo .wasm servido como um asset estático (não dá pra
// importar direto via bundler). Copia de node_modules pra src/web/public
// antes de qualquer dev/build web — ver vite.web.config.ts e
// src/web/db/sqljsDatabase.ts (locateFile).
//
// Copia os dois nomes (sql-wasm.wasm e sql-wasm-browser.wasm) porque o
// pacote sql.js expõe dois pontos de entrada JS diferentes (campo "browser"
// vs "default" do package.json) e cada um pede o .wasm com um nome — qual
// dos dois o bundler escolhe não é garantido, então servimos ambos.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const distDir = join(root, 'node_modules', 'sql.js', 'dist')
const destDir = join(root, 'src', 'web', 'public')

const wasmFiles = ['sql-wasm.wasm', 'sql-wasm-browser.wasm']

mkdirSync(destDir, { recursive: true })

for (const name of wasmFiles) {
  const source = join(distDir, name)
  if (!existsSync(source)) {
    console.error(`[copy-sqljs-wasm] node_modules/sql.js/dist/${name} não encontrado — rode "npm install" primeiro.`)
    process.exit(1)
  }
  copyFileSync(source, join(destDir, name))
}

console.log(`[copy-sqljs-wasm] ${wasmFiles.join(', ')} copiados para src/web/public/`)
