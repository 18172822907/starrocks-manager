import { NextRequest, NextResponse } from 'next/server';
import { clearConnectionFailure } from '@/lib/db';
import mysql from 'mysql2/promise';

/**
 * Lightweight health-check endpoint.
 * Bypasses the circuit breaker by using a direct connection (not the pool).
 * On success, clears the failure cache so other queries can proceed.
 * On failure, returns 503 without polluting logs.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Session ID required' }, { status: 400 });
  }

  // Parse host:port from sessionId
  const [host, portStr] = sessionId.split(':');
  if (!host || !portStr) {
    return NextResponse.json({ ok: false, error: 'Invalid sessionId' }, { status: 400 });
  }

  // Look up credentials from clusters table
  let username = 'root';
  let password = '';
  try {
    const { getLocalDb } = require('@/lib/local-db');
    const db = getLocalDb();
    const cluster = db.prepare(
      'SELECT username, password FROM clusters WHERE host = ? AND port = ? AND is_active = 1'
    ).get(host, parseInt(portStr, 10)) as { username: string; password: string } | undefined;
    if (cluster) {
      username = cluster.username;
      password = cluster.password;
    }
  } catch { /* use defaults */ }

  // Direct connection test — bypasses pool and circuit breaker
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: parseInt(portStr, 10),
      user: username,
      password,
      connectTimeout: 3000,
    });
    await connection.query('SELECT 1');
    // Success — clear the failure cache so queries can resume
    clearConnectionFailure(sessionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  } finally {
    if (connection) {
      try { await connection.end(); } catch { /* ignore */ }
    }
  }
}
