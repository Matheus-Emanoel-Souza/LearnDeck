// Lista de migrations, em ordem. Cada entrada é o SQL bruto, importado como texto
// (o sufixo `?raw` faz o Vite/electron-vite embutir o conteúdo do arquivo como string
// no bundle do processo main, sem precisar copiar .sql soltos para a pasta `out/`).
import m001 from './001_init.sql?raw'
import m002 from './002_board_columns.sql?raw'
import m003 from './003_column_color.sql?raw'
import m004 from './004_attachments.sql?raw'
import m005 from './005_deadlines_subtasks_notifications.sql?raw'
import m006 from './006_columns_per_group.sql?raw'

export interface Migration {
  version: number
  name: string
  sql: string
}

export const migrations: Migration[] = [
  { version: 1, name: '001_init', sql: m001 },
  { version: 2, name: '002_board_columns', sql: m002 },
  { version: 3, name: '003_column_color', sql: m003 },
  { version: 4, name: '004_attachments', sql: m004 },
  { version: 5, name: '005_deadlines_subtasks_notifications', sql: m005 },
  { version: 6, name: '006_columns_per_group', sql: m006 }
]
