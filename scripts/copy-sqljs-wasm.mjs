// sql.js precisa do arquivo .wasm servido como um asset estático (não dá pra
// importar direto via bundler). Copia de node_modules pra src/web/public
// antes de qualquer dev/build web — ver vite.web.config.ts e
// src/web/db/sqljsDatabase.ts (locateFile).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const source = join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const destDir = join(root, 'src', 'web', 'public')
const dest = join(destDir, 'sql-wasm.wasm')

if (!existsSync(source)) {
  console.error(
    '[copy-sqljs-wasm] node_modules/sql.js/dist/sql-wasm.wasm não encontrado — rode "npm install" primeiro.'
  )
  process.exit(1)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(source, dest)
console.log('[copy-sqljs-wasm] sql-wasm.wasm copiado para src/web/public/')
