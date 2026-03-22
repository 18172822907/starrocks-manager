import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, switchCluster, getCluster, getUserClusters } from '@/lib/auth';
import { createPool } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, session } = requireAuth(request);
    const { id } = await params;
    const clusterId = parseInt(id, 10);

    if (isNaN(clusterId)) {
      return NextResponse.json({ error: 'Invalid cluster ID' }, { status: 400 });
    }

    // Check if user has access to this cluster
    const accessibleClusters = getUserClusters(user.id, user.role);
    const target = accessibleClusters.find(c => c.id === clusterId);
    if (!target) {
      return NextResponse.json({ error: '无权访问此集群' }, { status: 403 });
    }

    // Verify cluster exists and is active
    const cluster = getCluster(clusterId);
    if (!cluster) {
      return NextResponse.json({ error: '集群不存在或已禁用' }, { status: 404 });
    }

    // Switch the session's active cluster
    switchCluster(session.token, clusterId);

    // Proactively create connection pool
    try {
      await createPool({
        host: cluster.host,
        port: cluster.port,
        user: cluster.username,
        password: cluster.password,
        database: cluster.default_db || undefined,
      });
    } catch (connErr) {
      return NextResponse.json({
        success: true,
        activeCluster: { id: cluster.id, name: cluster.name, host: cluster.host, port: cluster.port },
        warning: `已切换但连接失败: ${connErr instanceof Error ? connErr.message : String(connErr)}`,
      });
    }

    return NextResponse.json({
      success: true,
      activeCluster: {
        id: cluster.id,
        name: cluster.name,
        host: cluster.host,
        port: cluster.port,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status }
    );
  }
}
