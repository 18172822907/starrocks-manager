import { NextRequest, NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/local-db';
import { verifyPassword, createSession, validateSession, destroySession, getAuthFromRequest, getUserClusters } from '@/lib/auth';
import type { SysUser } from '@/lib/auth';

interface SysUserRow extends SysUser {
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const { action, username, password } = await request.json();

    // --- Login ---
    if (!action || action === 'login') {
      if (!username || !password) {
        return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
      }

      const db = getLocalDb();
      const user = db.prepare(
        'SELECT * FROM sys_users WHERE username = ?'
      ).get(username) as SysUserRow | undefined;

      if (!user) {
        return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
      }

      if (!user.is_active) {
        return NextResponse.json({ error: '账号已被禁用，请联系管理员' }, { status: 403 });
      }

      if (!verifyPassword(password, user.password_hash)) {
        return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
      }

      // Get user's accessible clusters
      const clusters = getUserClusters(user.id, user.role);
      const defaultCluster = clusters.length > 0 ? clusters[0].id : null;

      // Create session
      const token = createSession(user.id, defaultCluster);

      // Update last login time
      db.prepare('UPDATE sys_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
        },
        clusters: clusters.map(c => ({ id: c.id, name: c.name, host: c.host, port: c.port, description: c.description })),
        activeClusterId: defaultCluster,
        token,
      });

      // Set cookie
      response.cookies.set('sys_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });

      return response;
    }

    // --- Logout ---
    if (action === 'logout') {
      const token = getAuthFromRequest(request);
      if (token) {
        destroySession(token);
      }
      const response = NextResponse.json({ success: true });
      response.cookies.delete('sys_token');
      return response;
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// --- GET /api/auth  (get current user info, "me") ---
export async function GET(request: NextRequest) {
  try {
    const token = getAuthFromRequest(request);
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const result = validateSession(token);
    if (!result) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('sys_token');
      return response;
    }

    const { user, session } = result;
    const clusters = getUserClusters(user.id, user.role);

    // Get active cluster details
    let activeCluster = null;
    if (session.cluster_id) {
      activeCluster = clusters.find(c => c.id === session.cluster_id) || null;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
      clusters: clusters.map(c => ({ id: c.id, name: c.name, host: c.host, port: c.port, description: c.description })),
      activeCluster: activeCluster ? {
        id: activeCluster.id,
        name: activeCluster.name,
        host: activeCluster.host,
        port: activeCluster.port,
      } : null,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
