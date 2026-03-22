'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import ClusterOfflineBanner from '@/components/ClusterOfflineBanner';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, ChevronDown, User, Check, Server } from 'lucide-react';

// Pages that don't require an active cluster to be selected
const CLUSTER_EXEMPT_PATHS = ['/cluster-manager', '/sys-users', '/design-system'];

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  editor: '编辑者',
  viewer: '只读者',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, clusters, activeCluster, clusterStatus, setClusterStatus, loading, logout, switchCluster } = useAuth();
  const pathname = usePathname();
  const [userMenu, setUserMenu] = useState(false);
  const [clusterMenu, setClusterMenu] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const clusterOffline = clusterStatus === 'offline';

  // Determine status dot color based on actual connection health
  const statusColor = !activeCluster
    ? 'var(--text-tertiary)'
    : clusterStatus === 'online'
      ? 'var(--success-500)'
      : clusterStatus === 'offline'
        ? 'var(--danger-500)'
        : 'var(--warning-500)'; // unknown

  const statusLabel = clusterStatus === 'online' ? '在线' : clusterStatus === 'offline' ? '离线' : '检测中';

  const handleRetry = useCallback(async () => {
    if (!activeCluster) return;
    setRetrying(true);
    try {
      const sid = `${activeCluster.host}:${activeCluster.port}`;
      const res = await fetch(`/api/health?sessionId=${encodeURIComponent(sid)}`);
      const data = await res.json();
      if (data.ok) {
        setClusterStatus('online');
        window.dispatchEvent(new CustomEvent('cluster-switched'));
      }
    } catch { /* still offline */ }
    finally { setRetrying(false); }
  }, [activeCluster, setClusterStatus]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/';
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  if (!user) return null;

  const isExempt = CLUSTER_EXEMPT_PATHS.some(p => pathname?.startsWith(p));

  // ====== Top-right header bar: Cluster switcher + User menu ======
  const headerBar = (
    <div className="topbar-header">
      {/* Cluster Switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setClusterMenu(!clusterMenu); setUserMenu(false); }}
          className="cluster-switcher-btn"
        >
          {/* Animated status dot */}
          <span className="cluster-status-dot-wrapper">
            {clusterStatus === 'online' && (
              <span className="cluster-status-pulse" style={{ backgroundColor: statusColor }} />
            )}
            <span className="cluster-status-dot" style={{
              backgroundColor: statusColor,
              boxShadow: clusterStatus === 'online' ? `0 0 8px ${statusColor}` : 'none',
            }} />
          </span>
          <span className="cluster-switcher-name">
            {activeCluster?.name || '选择集群'}
          </span>
          <span className={`cluster-status-badge cluster-status-badge--${clusterStatus}`}>
            {statusLabel}
          </span>
          <ChevronDown size={12} style={{
            color: 'var(--text-tertiary)',
            transition: 'transform 0.2s ease',
            transform: clusterMenu ? 'rotate(180deg)' : 'none',
          }} />
        </button>

        {clusterMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setClusterMenu(false)} />
            <div className="topbar-dropdown" style={{ minWidth: '260px' }}>
              {/* Active cluster detail */}
              {activeCluster && (
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                    <Server size={11} />
                    <span>当前集群</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {activeCluster.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {activeCluster.host}:{activeCluster.port}
                  </div>
                </div>
              )}
              {/* Cluster list */}
              <div style={{ padding: '4px' }}>
                <div style={{
                  padding: '6px 10px', fontSize: '0.68rem', fontWeight: 600,
                  color: 'var(--text-tertiary)', letterSpacing: '0.03em',
                }}>
                  切换集群
                </div>
                {clusters.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    暂无可用集群
                  </div>
                ) : (
                  clusters.map(c => {
                    const isActive = activeCluster?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { switchCluster(c.id); setClusterMenu(false); }}
                        className="cluster-dropdown-item"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                          padding: '8px 10px', border: 'none', borderRadius: 'var(--radius-md)',
                          backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                          color: isActive ? 'var(--primary-600)' : 'var(--text-secondary)',
                          fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{
                          width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: isActive ? statusColor : 'var(--text-quaternary)',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isActive ? 600 : 400, lineHeight: 1.3 }}>{c.name}</div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                            {c.host}:{c.port}
                          </div>
                        </div>
                        {isActive && <Check size={14} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="topbar-divider" />

      {/* User Menu */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setUserMenu(!userMenu); setClusterMenu(false); }} className="topbar-user-btn">
          <div className="topbar-avatar">
            <User size={14} />
          </div>
          <span className="topbar-user-name">{user.display_name || user.username}</span>
          <span className="topbar-role-badge">{ROLE_LABELS[user.role] || user.role}</span>
          <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: userMenu ? 'rotate(180deg)' : 'none' }} />
        </button>

        {userMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setUserMenu(false)} />
            <div className="topbar-dropdown">
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-secondary)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {user.display_name || user.username}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  @{user.username} · {ROLE_LABELS[user.role] || user.role}
                </div>
              </div>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>主题设置</div>
                <ThemeSwitcher />
              </div>
              <button onClick={() => { setUserMenu(false); logout(); }} className="topbar-dropdown-item">
                <LogOut size={14} />
                退出登录
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!activeCluster && !isExempt) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {headerBar}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, gap: '16px', color: 'var(--text-tertiary)',
          }}>
            <div style={{ fontSize: '3rem', opacity: 0.3 }}>📡</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>尚未选择集群</div>
            <div style={{ fontSize: '0.85rem' }}>
              {user.role === 'admin'
                ? '请前往「系统管理 → 集群管理」添加并激活集群'
                : '请联系管理员为您分配可用集群'}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Cluster offline: show full-page offline state instead of page children.
  if (clusterOffline && !isExempt) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {headerBar}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, gap: '20px', padding: '40px',
          }}>
            <ClusterOfflineBanner onRetry={handleRetry} retrying={retrying} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {headerBar}
        {children}
      </main>
    </div>
  );
}
