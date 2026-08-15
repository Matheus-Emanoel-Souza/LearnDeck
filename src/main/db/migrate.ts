import type Database from 'better-sqlite3'
import { migrations } from './migrations'

/**
 * Runner de migrations simples: aplica, em ordem e dentro de uma transação por
 * migration, todo script cuja `version` ainda não esteja em `schema_migrations`.
 * Ver docs/database.md > "Migrations".
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => (row as { version: number }).version)
  )

  for (const migration of migrations.sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) continue

    const apply = db.transaction(() => {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString()
      )
    })

    apply()
    console.log(`[db] migration aplicada: ${migration.name}`)
  }
}
