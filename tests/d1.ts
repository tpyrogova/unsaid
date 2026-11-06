/**
 * Minimal D1Database implementation backed by Node's built-in SQLite, so API
 * handlers can be tested against the real migration SQL. Implements only the
 * subset of the D1 API that the app uses.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'

class Statement {
  private readonly db: DatabaseSync
  private readonly sql: string
  private readonly params: SQLInputValue[]

  constructor(db: DatabaseSync, sql: string, params: SQLInputValue[] = []) {
    this.db = db
    this.sql = sql
    this.params = params
  }

  bind(...params: SQLInputValue[]): Statement {
    return new Statement(this.db, this.sql, params)
  }

  first<T>(): Promise<T | null> {
    return Promise.resolve((this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null)
  }

  all<T>(): Promise<{ results: T[]; success: true }> {
    return Promise.resolve({ results: this.db.prepare(this.sql).all(...this.params) as T[], success: true })
  }

  run(): Promise<{ success: true; meta: { changes: number } }> {
    return Promise.resolve(this.runSync())
  }

  runSync() {
    const { changes } = this.db.prepare(this.sql).run(...this.params)
    return { success: true as const, meta: { changes: Number(changes) } }
  }
}

export function createTestDb(): D1Database {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  const dir = join(import.meta.dirname, '..', 'migrations')
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(dir, file), 'utf8'))
  }

  const d1 = {
    prepare: (sql: string) => new Statement(db, sql),
    // D1 batches are transactional.
    batch: (statements: Statement[]) => {
      db.exec('BEGIN')
      try {
        const results = statements.map((statement) => statement.runSync())
        db.exec('COMMIT')
        return Promise.resolve(results)
      } catch (error) {
        db.exec('ROLLBACK')
        return Promise.reject(error)
      }
    },
  }
  return d1 as unknown as D1Database
}
