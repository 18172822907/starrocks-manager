// Server-side auth utilities

import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getLocalDb } from './local-db';

// ---- Types ----

export type SysRole = 'admin' | 'editor' | 'viewer';

export interface SysUser {
  id: number;
  username: string;
  display_name: string;
  role: SysRole;
  is_active: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface SysSession {
  token: string;
  user_id: number;
  cluster_id: number | null;
  created_at: string;
  expires_at: string;
}

export interface ClusterInfo {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  default_db: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ---- Password ----

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// ---- Session ----

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(userId: number, clusterId?: number | null): string {
  const db = getLocalDb();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO sys_sessions (token, user_id, cluster_id, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, userId, clusterId ?? null, expiresAt);
  return token;
}

export function validateSession(token: string): { user: SysUser; session: SysSession } | null {
  const db = getLocalDb();
  const session = db.prepare(
    'SELECT * FROM sys_sessions WHERE token = ?'
  ).get(token) as SysSession | undefined;

  if (!session) return null;

  // Check expiry
  const expiresAt = session.expires_at.endsWith('Z') ? session.expires_at : session.expires_at.replace(' ', 'T') + 'Z';
  if (new Date(expiresAt).getTime() < Date.now()) {
    db.prepare('DELETE FROM sys_sessions WHERE token = ?').run(token);
    return null;
  }

  const user = db.prepare(
    'SELECT id, username, display_name, role, is_active, created_at, updated_at, last_login_at FROM sys_users WHERE id = ? AND is_active = 1'
  ).get(session.user_id) as SysUser | undefined;

  if (!user) {
    db.prepare('DELETE FROM sys_sessions WHERE token = ?').run(token);
    return null;
  }

  return { user, session };
}

export function destroySession(token: string): void {
  const db = getLocalDb();
  db.prepare('DELETE FROM sys_sessions WHERE token = ?').run(token);
}

export function switchCluster(token: string, clusterId: number): void {
  const db = getLocalDb();
  db.prepare('UPDATE sys_sessions SET cluster_id = ? WHERE token = ?').run(clusterId, token);
}

// ---- Auth helper for API routes ----

export function getAuthFromRequest(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Try cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/sys_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

export function requireAuth(request: Request): { user: SysUser; session: SysSession } {
  const token = getAuthFromRequest(request);
  if (!token) {
    throw new AuthError('未登录', 401);
  }
  const result = validateSession(token);
  if (!result) {
    throw new AuthError('会话已过期，请重新登录', 401);
  }
  return result;
}

export function requireRole(request: Request, ...roles: SysRole[]): { user: SysUser; session: SysSession } {
  const result = requireAuth(request);
  if (!roles.includes(result.user.role)) {
    throw new AuthError('权限不足', 403);
  }
  return result;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

// ---- Cluster access helpers ----

export function getUserClusters(userId: number, role: SysRole): ClusterInfo[] {
  const db = getLocalDb();
  if (role === 'admin') {
    // Admin sees all clusters
    return db.prepare('SELECT * FROM clusters WHERE is_active = 1 ORDER BY name').all() as ClusterInfo[];
  }
  return db.prepare(`
    SELECT c.* FROM clusters c
    INNER JOIN user_cluster_access uca ON c.id = uca.cluster_id
    WHERE uca.user_id = ? AND c.is_active = 1
    ORDER BY c.name
  `).all(userId) as ClusterInfo[];
}

export function getCluster(clusterId: number): ClusterInfo | null {
  const db = getLocalDb();
  return db.prepare('SELECT * FROM clusters WHERE id = ? AND is_active = 1').get(clusterId) as ClusterInfo | null;
}
