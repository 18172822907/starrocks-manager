import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ db: string }> }
) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const { db } = await params;

    const tables = await executeQuery(
      sessionId,
      `SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH,
              CREATE_TIME, UPDATE_TIME, TABLE_COMMENT
       FROM information_schema.tables
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [db], 'databases'
    );

    // Cross-reference with materialized_views to correctly label MVs
    // (StarRocks stores MVs as VIEW or BASE TABLE in information_schema.tables)
    let mvNames: Set<string> = new Set();
    try {
      const mvResult = await executeQuery(
        sessionId,
        `SELECT TABLE_NAME FROM information_schema.materialized_views WHERE TABLE_SCHEMA = ?`,
        [db], 'databases'
      );
      mvNames = new Set(mvResult.rows.map((r: Record<string, unknown>) =>
        String(r['TABLE_NAME'] || Object.values(r)[0])
      ));
    } catch {
      // materialized_views table might not exist in older versions
    }

    const enrichedTables = tables.rows.map((row: Record<string, unknown>) => {
      const tableName = String(row['TABLE_NAME'] || '');
      if (mvNames.has(tableName)) {
        return { ...row, TABLE_TYPE: 'MATERIALIZED VIEW' };
      }
      return row;
    });

    return NextResponse.json({ database: db, tables: enrichedTables });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
