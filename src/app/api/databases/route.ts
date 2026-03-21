import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { upsertDbCache, getDbCache } from '@/lib/local-db';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // ── Serve from cache unless explicitly refreshing ──
    if (!refresh) {
      const cached = getDbCache(sessionId);
      if (cached.length > 0) {
        return NextResponse.json({
          databases: cached.map(c => ({
            name: c.db_name,
            tableCount: c.table_count,
            viewCount: c.view_count ?? 0,
            mvCount: c.mv_count ?? 0,
            tables: [],
          })),
          cachedAt: cached[0].cached_at,
          fromCache: true,
        });
      }
    }

    // ── Fetch fresh from StarRocks (optimized: 3 queries instead of 2N) ──

    // 1) Get all database names
    const dbResult = await executeQuery(sessionId, 'SHOW DATABASES', undefined, 'databases');
    const dbNames = dbResult.rows.map((r: Record<string, unknown>) =>
      String(r['Database'] || r['database'] || Object.values(r)[0])
    );

    // 2) Aggregated table/view counts per schema (single query for ALL databases)
    const [tableAgg, mvAgg] = await Promise.all([
      executeQuery(
        sessionId,
        `SELECT TABLE_SCHEMA, TABLE_TYPE, COUNT(*) AS cnt
         FROM information_schema.tables
         GROUP BY TABLE_SCHEMA, TABLE_TYPE`,
        undefined, 'databases'
      ).catch(() => ({ rows: [], fields: [] })),

      // MV names per schema (StarRocks stores MVs as BASE TABLE in tables, need MV table to distinguish)
      executeQuery(
        sessionId,
        `SELECT TABLE_SCHEMA, COUNT(*) AS cnt
         FROM information_schema.materialized_views
         GROUP BY TABLE_SCHEMA`,
        undefined, 'databases'
      ).catch(() => ({ rows: [], fields: [] })),
    ]);

    // 3) Build counts map from aggregated results
    // tableCountMap[schema] = { tables: N, views: N }
    const countMap = new Map<string, { tables: number; views: number }>();
    for (const row of tableAgg.rows as Record<string, unknown>[]) {
      const schema = String(row['TABLE_SCHEMA'] || '');
      const tableType = String(row['TABLE_TYPE'] || '').toUpperCase();
      const cnt = Number(row['cnt'] || 0);
      if (!countMap.has(schema)) countMap.set(schema, { tables: 0, views: 0 });
      const entry = countMap.get(schema)!;
      if (tableType === 'VIEW' || tableType === 'SYSTEM VIEW') {
        entry.views += cnt;
      } else {
        entry.tables += cnt;
      }
    }

    // mvCountMap[schema] = N
    const mvCountMap = new Map<string, number>();
    for (const row of mvAgg.rows as Record<string, unknown>[]) {
      const schema = String(row['TABLE_SCHEMA'] || '');
      const cnt = Number(row['cnt'] || 0);
      mvCountMap.set(schema, cnt);
    }

    // 4) Assemble final result (subtract MV count from table count since MVs show as BASE TABLE)
    const dbDetails = dbNames.map(name => {
      const counts = countMap.get(name) || { tables: 0, views: 0 };
      const mvCount = mvCountMap.get(name) || 0;
      return {
        name,
        tableCount: Math.max(0, counts.tables - mvCount), // MVs are counted as BASE TABLE, subtract
        viewCount: counts.views,
        mvCount,
        tables: [],
      };
    });

    // Persist to SQLite cache
    let cachedAt: string | undefined;
    try {
      upsertDbCache(sessionId, dbDetails.map(d => ({ name: d.name, tableCount: d.tableCount, viewCount: d.viewCount, mvCount: d.mvCount })));
      const cached = getDbCache(sessionId);
      cachedAt = cached[0]?.cached_at;
    } catch {
      // non-fatal
    }

    return NextResponse.json({ databases: dbDetails, cachedAt, fromCache: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

