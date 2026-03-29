import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

/**
 * GET /api/compaction-score?sessionId=xxx&page=1&pageSize=10&orderBy=MAX_CS&order=desc&dbName=xxx
 *
 * Queries information_schema.partitions_meta for Compaction Score data.
 * Uses a lightweight COUNT(*) for total, then paginated data query.
 * Returns { columns, rows, total, page, pageSize, totalPages }.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, PERMISSIONS.SHOW_PROC);

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const page = Math.max(parseInt(request.nextUrl.searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('pageSize') || '10', 10), 10), 200);
    const orderBy = request.nextUrl.searchParams.get('orderBy') || 'MAX_CS';
    const order = request.nextUrl.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
    const dbName = request.nextUrl.searchParams.get('dbName') || '';

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Whitelist of allowed ORDER BY columns
    const allowedOrderCols = new Set([
      'DB_NAME', 'TABLE_NAME', 'PARTITION_NAME', 'DATA_SIZE', 'ROW_COUNT',
      'AVG_CS', 'P50_CS', 'MAX_CS', 'COMPACT_VERSION', 'VISIBLE_VERSION',
      'BUCKETS', 'REPLICATION_NUM',
    ]);
    const safeOrderBy = allowedOrderCols.has(orderBy.toUpperCase()) ? orderBy : 'MAX_CS';

    let whereClause = '';
    const params: string[] = [];
    if (dbName && !/[;'"\\]/.test(dbName)) {
      whereClause = `WHERE DB_NAME = ?`;
      params.push(dbName);
    }

    // 1) Get total count (lightweight)
    const countSQL = `SELECT COUNT(*) AS cnt FROM information_schema.partitions_meta ${whereClause}`;
    const countResult = await executeQuery(
      sessionId, countSQL,
      params.length > 0 ? [...params] : undefined,
      'compaction-score',
    );
    const countRow = Array.isArray(countResult.rows) && countResult.rows.length > 0
      ? countResult.rows[0] as Record<string, unknown> : {};
    const total = parseInt(String(countRow.cnt ?? '0'), 10);

    // 2) Get paginated data
    const offset = (page - 1) * pageSize;
    const dataSQL = `
      SELECT
        DB_NAME, TABLE_NAME, PARTITION_NAME, PARTITION_ID,
        COMPACT_VERSION, VISIBLE_VERSION, VISIBLE_VERSION_TIME,
        BUCKETS, REPLICATION_NUM, DATA_SIZE, ROW_COUNT,
        STORAGE_MEDIUM, AVG_CS, P50_CS, MAX_CS
      FROM information_schema.partitions_meta
      ${whereClause}
      ORDER BY ${safeOrderBy} ${order}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const result = await executeQuery(
      sessionId, dataSQL,
      params.length > 0 ? [...params] : undefined,
      'compaction-score',
    );

    const rows = Array.isArray(result.rows) ? result.rows : [];
    let columns: string[] = [];
    if (result.fields && Array.isArray(result.fields) && result.fields.length > 0) {
      columns = result.fields.map(f => f.name);
    } else if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    }

    return NextResponse.json({
      columns, rows, total,
      page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status },
    );
  }
}
