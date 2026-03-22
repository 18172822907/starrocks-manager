import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Track individual errors to detect total connection failure
    let errorCount = 0;
    let lastError = '';

    const catchError = (err: unknown) => {
      errorCount++;
      lastError = err instanceof Error ? err.message : String(err);
      return { rows: [], fields: [] };
    };

    // Fetch FE, BE, CN, Broker info in parallel
    const [frontends, backends, computeNodes, brokers] = await Promise.all([
      executeQuery(sessionId, 'SHOW FRONTENDS', undefined, 'dashboard').catch(catchError),
      executeQuery(sessionId, 'SHOW BACKENDS', undefined, 'dashboard').catch(catchError),
      executeQuery(sessionId, 'SHOW COMPUTE NODES', undefined, 'dashboard').catch(catchError),
      executeQuery(sessionId, 'SHOW BROKER', undefined, 'dashboard').catch(catchError),
    ]);

    // If ALL queries failed, cluster is unreachable
    if (errorCount >= 4) {
      return NextResponse.json(
        { error: lastError, connectionFailed: true },
        { status: 503 }
      );
    }

    return NextResponse.json({
      frontends: frontends.rows,
      backends: backends.rows,
      computeNodes: computeNodes.rows,
      brokers: brokers.rows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
