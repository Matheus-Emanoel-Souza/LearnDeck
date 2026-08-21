/**
 * sql.js (>=1.14) não publica tipos próprios nem no pacote `sql.js` nem em
 * `@types/sql.js`. Declaração mínima, só com a superfície usada por
 * `src/web/db/sqljsDatabase.ts`.
 */
declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export class Statement {
    bind(params?: unknown[] | Record<string, unknown>): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): boolean
  }

  export class Database {
    constructor(data?: Uint8Array)
    run(sql: string, params?: unknown[] | Record<string, unknown>): Database
    exec(sql: string, params?: unknown[] | Record<string, unknown>): QueryExecResult[]
    prepare(sql: string): Statement
    getRowsModified(): number
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: typeof Database
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
