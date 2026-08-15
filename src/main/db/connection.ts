import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

/**
 * Abre (ou cria) o arquivo SQLite em %APPDATA%/LearnDeck/learndeck.db.
 * Chamado uma única vez no bootstrap (src/main/index.ts). Reaproveita a mesma
 * conexão em todo o processo main — better-sqlite3 é síncrono e thread-safe
 * o suficiente para o uso single-process do Electron.
 */
export function getDatabase(): Database.Database {
  if (db) return db

  const userDataDir = app.getPath('userData')
  fs.mkdirSync(userDataDir, { recursive: true })
  const dbPath = path.join(userDataDir, 'learndeck.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
