// Lista de migrations, em ordem. Cada entrada é o SQL bruto, importado como texto
// (o sufixo `?raw` faz o Vite/electron-vite embutir o conteúdo do arquivo como string
// no bundle do processo main, sem precisar copiar .sql soltos para a pasta `out/`).
import m001 from './001_init.sql?raw'

export interface Migration {
  version: number
  name: string
  sql: string
}

export const migrations: Migration[] = [{ version: 1, name: '001_init', sql: m001 }]
