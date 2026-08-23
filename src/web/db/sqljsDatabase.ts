/**
 * Adaptador que faz um banco sql.js (SQLite compilado pra WASM) responder à
 * mesma superfície de `better-sqlite3` que repositórios/serviços usam:
 * `db.prepare(sql).get/.all/.run(...)`, `db.exec(sql)`, `db.pragma(...)`,
 * `db.transaction(fn)`. Com isso, TODO o código em `src/main/repositories` e
 * `src/main/services` roda sem nenhuma alteração também no navegador — ver
 * docs/WEBAPP.md.
 *
 * Diferença de convenção: better-sqlite3 aceita parâmetro nomeado como
 * `{id, name}` para um placeholder `@id`/`@name`; sql.js exige a chave já
 * com o prefixo (`{'@id': ..., '@name': ...}`). `normalizeParams` cobre isso.
 */
import initSqlJs, { type Database as SqlJsDatabaseInstance } from 'sql.js'

export interface RunResult {
  changes: number
  lastInsertRowid: number
}

type Row = Record<string, unknown>

function normalizeParams(params: unknown[]): unknown[] | Record<string, unknown> {
  if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
    const obj = params[0] as Record<string, unknown>
    const named: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) named[`@${key}`] = obj[key] as never
    return named
  }
  return params
}

class SqljsStatement {
  constructor(
    private readonly raw: SqlJsDatabaseInstance,
    private readonly sql: string,
    private readonly onWrite: () => void
  ) {}

  get(...params: unknown[]): Row | undefined {
    const stmt = this.raw.prepare(this.sql)
    try {
      stmt.bind(normalizeParams(params) as never)
      return stmt.step() ? (stmt.getAsObject() as Row) : undefined
    } finally {
      stmt.free()
    }
  }

  all(...params: unknown[]): Row[] {
    const stmt = this.raw.prepare(this.sql)
    const rows: Row[] = []
    try {
      stmt.bind(normalizeParams(params) as never)
      while (stmt.step()) rows.push(stmt.getAsObject() as Row)
      return rows
    } finally {
      stmt.free()
    }
  }

  run(...params: unknown[]): RunResult {
    const stmt = this.raw.prepare(this.sql)
    try {
      stmt.bind(normalizeParams(params) as never)
      stmt.step()
    } finally {
      stmt.free()
    }
    this.onWrite()
    return { changes: this.raw.getRowsModified(), lastInsertRowid: 0 }
  }
}

/** Subconjunto de `better-sqlite3.Database` que repositórios/serviços usam. */
export class SqljsDatabaseAdapter {
  constructor(
    private readonly raw: SqlJsDatabaseInstance,
    private readonly onWrite: () => void
  ) {}

  prepare(sql: string): SqljsStatement {
    return new SqljsStatement(this.raw, sql, this.onWrite)
  }

  exec(sql: string): void {
    this.raw.run(sql)
    this.onWrite()
  }

  pragma(_statement: string): void {
    // sql.js já roda com foreign_keys/journal_mode padrão adequados a um
    // banco single-user em memória; pragmas de arquivo (WAL) não se aplicam.
    // Mantido como no-op só para as chamadas existentes não quebrarem.
  }

  transaction<Args extends unknown[], Result>(fn: (...args: Args) => Result): (...args: Args) => Result {
    return (...args: Args): Result => {
      this.raw.run('BEGIN')
      try {
        const result = fn(...args)
        this.raw.run('COMMIT')
        this.onWrite()
        return result
      } catch (err) {
        this.raw.run('ROLLBACK')
        throw err
      }
    }
  }

  export(): Uint8Array {
    return this.raw.export()
  }

  close(): void {
    this.raw.close()
  }
}

let sqlJsModulePromise: ReturnType<typeof initSqlJs> | null = null

/** Carrega o runtime WASM do sql.js uma única vez (arquivo `sql-wasm.wasm`
 * servido da pasta `public/`, ver vite.web.config.ts). */
export function loadSqlJs(): ReturnType<typeof initSqlJs> {
  if (!sqlJsModulePromise) {
    // import.meta.env.BASE_URL cobre deploy fora da raiz do domínio (ex.:
    // GitHub Pages em /LearnDeck/) — ver vite.web.config.ts.
    sqlJsModulePromise = initSqlJs({ locateFile: (file) => `${import.meta.env.BASE_URL}${file}` })
  }
  return sqlJsModulePromise
}

export async function createSqljsDatabase(
  existingBytes: Uint8Array | undefined,
  onWrite: () => void
): Promise<SqljsDatabaseAdapter> {
  const SQL = await loadSqlJs()
  const raw = existingBytes ? new SQL.Database(existingBytes) : new SQL.Database()
  return new SqljsDatabaseAdapter(raw, onWrite)
}
