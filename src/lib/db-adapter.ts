/**
 * Database adapter — unified interface for SQLite and MySQL.
 * All local-db operations use this interface, making the storage backend swappable.
 */

// better-sqlite3 is loaded dynamically in SqliteAdapter to avoid
// Turbopack static resolution failures when the native module is absent (e.g. MySQL-only Docker builds).
import mysql from 'mysql2/promise';
import { config } from './config';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';

// ─── Unified interface ───

export interface DbAdapter {
  /** Execute a write statement (INSERT/UPDATE/DELETE). Returns { changes, lastInsertRowid }. */
  run(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  /** Query a single row */
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;
  /** Query multiple rows */
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  /** Execute raw SQL (for DDL, multi-statement) */
  exec(sql: string): void;
  /** Run a function inside a transaction */
  transaction<T>(fn: () => T): T;
  /** Prepare a reusable statement (for perf-critical paths) */
  prepare(sql: string): PreparedStatement;
  /** Close the connection */
  close(): void;
  /** Which dialect */
  readonly dialect: 'sqlite' | 'mysql';
}

export interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

// ─── SQLite adapter ───

export class SqliteAdapter implements DbAdapter {
  readonly dialect = 'sqlite' as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor(dbPath: string) {
    const absPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // eval('require') completely hides the module from Turbopack/webpack static analysis
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
    const BetterSqlite3 = eval('require')('better-sqlite3');
    this.db = new BetterSqlite3(absPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    logger.info(`[DB] SQLite connected: ${absPath}`);
  }

  run(sql: string, params: unknown[] = []) {
    const result = this.db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  exec(sql: string) {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params: unknown[]) => {
        const r = stmt.run(...params);
        return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
      },
      get: (...params: unknown[]) => stmt.get(...params) as Record<string, unknown> | undefined,
      all: (...params: unknown[]) => stmt.all(...params) as Record<string, unknown>[],
    };
  }

  close() {
    this.db.close();
  }
}

// ─── MySQL adapter ───
// Wraps mysql2 pool. Since local-db uses synchronous-style calls,
// we use a "cached pool" approach where queries are async under the hood
// but we provide a synchronous-looking API via the adapter.
// NOTE: For Next.js API routes (all async), this works fine.
// The `prepare` method returns a wrapper that builds parameterized queries.

export class MysqlAdapter implements DbAdapter {
  readonly dialect = 'mysql' as const;
  private pool: mysql.Pool;

  constructor(cfg: { host: string; port: number; user: string; password: string; database: string }) {
    this.pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 5000,
      multipleStatements: true,
    });
    logger.info(`[DB] MySQL pool created: ${cfg.host}:${cfg.port}/${cfg.database}`);
  }

  // MySQL adapter methods are ASYNC internally but we need a sync interface.
  // Since local-db.ts was designed for sync sqlite, we use a "sync-over-async" shim
  // via a module-level query cache + initialization pattern.
  // For actual usage, callers should use the async variants.

  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number | bigint } {
    throw new Error(`[MysqlAdapter] Use runAsync() instead of run() for MySQL. SQL: ${sql.slice(0, 80)}`);
  }

  get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    throw new Error(`[MysqlAdapter] Use getAsync() instead of get() for MySQL. SQL: ${sql.slice(0, 80)}`);
  }

  all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    throw new Error(`[MysqlAdapter] Use allAsync() instead of all() for MySQL. SQL: ${sql.slice(0, 80)}`);
  }

  exec(sql: string) {
    throw new Error(`[MysqlAdapter] Use execAsync() instead of exec() for MySQL.`);
  }

  transaction<T>(fn: () => T): T {
    throw new Error(`[MysqlAdapter] Use transactionAsync() for MySQL.`);
  }

  prepare(sql: string): PreparedStatement {
    throw new Error(`[MysqlAdapter] Use async methods for MySQL.`);
  }

  // ─── Async methods (MySQL native) ───

  async runAsync(sql: string, params: unknown[] = []) {
    const [result] = await this.pool.execute(sql, params as (string | number | null)[]);
    const r = result as mysql.ResultSetHeader;
    return { changes: r.affectedRows || 0, lastInsertRowid: r.insertId || 0 };
  }

  async getAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const [rows] = await this.pool.execute(sql, params as (string | number | null)[]);
    return (rows as T[])[0];
  }

  async allAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.pool.execute(sql, params as (string | number | null)[]);
    return rows as T[];
  }

  async execAsync(sql: string) {
    await this.pool.query(sql);
  }

  async transactionAsync<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  close() {
    this.pool.end();
  }
}

// ─── Factory ───

export function createAdapter(): DbAdapter {
  if (config.database.type === 'mysql') {
    return new MysqlAdapter(config.database.mysql);
  }
  return new SqliteAdapter(config.database.sqlite.path);
}
