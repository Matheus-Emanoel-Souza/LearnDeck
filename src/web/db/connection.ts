/**
 * Equivalente web de `src/main/db/connection.ts`: em vez de um arquivo em
 * %APPDATA%, o banco vive todo em memória (sql.js) e é persistido, em bytes,
 * no IndexedDB do navegador — grava sozinho, com debounce, a cada escrita
 * (ver `scheduleWrite`). Chamado uma única vez no bootstrap (`web/main.tsx`).
 */
import type Database from 'better-sqlite3'
import { runMigrations } from '../../main/db/migrate'
import { createSqljsDatabase, type SqljsDatabaseAdapter } from './sqljsDatabase'
import { idbGet, idbSet, STORE_KV } from './idbStore'

/** `SqljsDatabaseAdapter` implementa, em runtime, o subconjunto de
 * `Database.Database` que repositórios/serviços usam — não a interface
 * inteira do better-sqlite3, por isso o cast explícito no ponto de entrada
 * único (aqui) em vez de espalhar `any` pelo resto do código web. */
function asBetterSqlite3(db: SqljsDatabaseAdapter): Database.Database {
  return db as unknown as Database.Database
}

const DB_BYTES_KEY = 'learndeck.sqlite'
const WRITE_DEBOUNCE_MS = 400

let dbInstance: SqljsDatabaseAdapter | null = null
let dbReadyPromise: Promise<SqljsDatabaseAdapter> | null = null
let writeTimer: number | null = null

function scheduleWrite(): void {
  if (!dbInstance) return
  if (writeTimer) window.clearTimeout(writeTimer)
  writeTimer = window.setTimeout(() => {
    writeTimer = null
    void idbSet(STORE_KV, DB_BYTES_KEY, dbInstance!.export())
  }, WRITE_DEBOUNCE_MS)
}

/** Força a gravação imediata (usado no `beforeunload`, ver web/main.tsx). */
export function flushPendingWrite(): void {
  if (!dbInstance) return
  if (writeTimer) {
    window.clearTimeout(writeTimer)
    writeTimer = null
  }
  void idbSet(STORE_KV, DB_BYTES_KEY, dbInstance.export())
}

export async function getDatabase(): Promise<SqljsDatabaseAdapter> {
  if (dbInstance) return dbInstance
  if (dbReadyPromise) return dbReadyPromise

  dbReadyPromise = (async () => {
    const existingBytes = await idbGet<Uint8Array>(STORE_KV, DB_BYTES_KEY)
    const db = await createSqljsDatabase(existingBytes, scheduleWrite)
    runMigrations(asBetterSqlite3(db))
    dbInstance = db
    // Primeira gravação: garante que uma instalação nova já persiste o
    // schema recém-criado mesmo que o usuário feche a aba sem editar nada.
    scheduleWrite()
    return db
  })()

  return dbReadyPromise
}
