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

    // Migrations que reconstroem uma tabela (padrão "cria tabela nova, copia
    // dados, dropa a antiga, renomeia") esbarram em foreign keys de dois
    // jeitos com `foreign_keys = ON`: um DROP TABLE que ainda é referenciado
    // por ON DELETE RESTRICT é bloqueado, e um DROP TABLE referenciado por ON
    // DELETE CASCADE apaga em cascata as linhas dependentes (perda de dados).
    // Só pode ser alternado fora de uma transação — por isso liga/desliga em
    // volta da transaction, nunca dentro dela.
    db.pragma('foreign_keys = OFF')
    try {
      apply()
    } finally {
      db.pragma('foreign_keys = ON')
    }
    console.log(`[db] migration aplicada: ${migration.name}`)
  }
}
