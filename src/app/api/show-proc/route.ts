import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getBlobCache, setBlobCache } from '@/lib/local-db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ALLOWED_PROC_PATHS } from '@/lib/proc-metadata';

/**
 * GET /api/show-proc?sessionId=xxx&path=/backends&refresh=true
 *
 * Executes SHOW PROC '<path>' against the StarRocks cluster.
 * - Validates path against a whitelist to prevent injection
 * - Supports blob cache for performance (keyed by sessionId::path)
 * - Returns { columns, rows, path, cachedAt, fromCache }
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, PERMISSIONS.SHOW_PROC);

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const path = request.nextUrl.searchParams.get('path');
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: 'PROC path required' }, { status: 400 });
    }

    // ── Whitelist validation (prevents SQL injection) ──
    // Allow sub-paths like '/dbs/12345' as long as the root '/dbs' is whitelisted.
    // Block anything containing SQL-dangerous characters.
    if (/[;'"\\]/.test(path)) {
      return NextResponse.json(
        { error: `非法路径字符: ${path}` },
        { status: 400 },
      );
    }
    const rootPath = '/' + path.split('/').filter(Boolean)[0];
    if (!ALLOWED_PROC_PATHS.includes(rootPath)) {
      return NextResponse.json(
        { error: `不支持的 PROC 路径: ${path}` },
        { status: 400 },
      );
    }

    // Use show_proc_cache table with composite key: sessionId::path
    const cacheConnectionId = `${sessionId}::${path}`;

    // ── Cache check ──
    if (!refresh) {
      const cached = await getBlobCache('show_proc_cache', cacheConnectionId);
      if (cached) {
        return NextResponse.json({
          ...(cached.data as object),
          cachedAt: cached.cachedAt,
          fromCache: true,
        });
      }
    }

    // ── Execute SHOW PROC ──
    const result = await executeQuery(
      sessionId,
      `SHOW PROC '${path}'`,
      undefined,
      'show-proc',
    );

    const rows = Array.isArray(result.rows) ? result.rows : [];

    // Derive column names from field metadata (preferred) or from first row keys
    let columns: string[] = [];
    if (result.fields && Array.isArray(result.fields) && result.fields.length > 0) {
      columns = result.fields.map(f => f.name);
    } else if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    }

    const payload = { columns, rows, path };

    // ── Cache store ──
    let cachedAt: string | undefined;
    try {
      cachedAt = await setBlobCache('show_proc_cache', cacheConnectionId, payload);
    } catch { /* non-fatal */ }

    return NextResponse.json({ ...payload, cachedAt, fromCache: false });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status },
    );
  }
}
