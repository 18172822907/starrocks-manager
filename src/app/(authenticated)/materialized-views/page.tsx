'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  Box, RefreshCw, Search, Clock, Eye, Trash2, Play, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Filter, Database,
} from 'lucide-react';

type SortKey = 'TABLE_NAME' | 'TABLE_SCHEMA' | 'LAST_REFRESH_START_TIME' | 'TABLE_ROWS';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} style={{ opacity: 0.35 }} />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} style={{ color: 'var(--primary-500)' }} />
    : <ChevronDown size={12} style={{ color: 'var(--primary-500)' }} />;
}

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  SUCCESS: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: 'var(--success-600)' },
  FAILED: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', color: 'var(--danger-500)' },
  RUNNING: { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: 'var(--primary-600)' },
  PENDING: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)' },
};

export default function MaterializedViewsPage() {
  const { session } = useSession();
  const [views, setViews] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('TABLE_NAME');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dbFilter, setDbFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDef, setShowDef] = useState<{ name: string; db: string; def: string } | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);

  const fetchViews = useCallback(async (forceRefresh = false) => {
    if (!session) return;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const url = `/api/materialized-views?sessionId=${encodeURIComponent(session.sessionId)}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setViews(data.views || []);
        const ts = data.cachedAt
          ? new Date(data.cachedAt).toLocaleString('zh-CN', { hour12: false })
          : new Date().toLocaleString('zh-CN', { hour12: false });
        setLastRefreshed(ts);
        setFromCache(!!data.fromCache);
      }
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [session]);

  useEffect(() => { if (session) fetchViews(); }, [session, fetchViews]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  // Helpers
  const str = (v: unknown) => String(v ?? '');

  async function handleRefreshMV(db: string, name: string) {
    if (!session) return;
    try {
      const res = await fetch('/api/materialized-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action: 'refresh', dbName: db, mvName: name }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`已触发刷新 ${db}.${name}`); }
    } catch (err) { setError(String(err)); }
  }

  async function handleDropMV(db: string, name: string) {
    if (!session || !confirm(`确定要删除物化视图 ${db}.${name} 吗？此操作不可恢复！`)) return;
    try {
      const res = await fetch('/api/materialized-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action: 'drop', dbName: db, mvName: name }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`物化视图 ${db}.${name} 已删除`); fetchViews(true); }
    } catch (err) { setError(String(err)); }
  }

  async function handleShowDef(db: string, name: string) {
    if (!session) return;
    setLoadingDef(true);
    try {
      const res = await fetch('/api/materialized-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action: 'show_create', dbName: db, mvName: name }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setShowDef({ name, db, def: data.definition || '' });
    } catch (err) { setError(String(err)); }
    finally { setLoadingDef(false); }
  }

  // Unique databases
  const allDbs = Array.from(new Set(views.map(v => str(v.TABLE_SCHEMA)))).sort();
  const allStatuses = Array.from(new Set(views.map(v => str(v.LAST_REFRESH_STATE)))).filter(Boolean).sort();

  const filtered = views
    .filter(v => {
      const name = str(v.TABLE_NAME).toLowerCase();
      const db = str(v.TABLE_SCHEMA).toLowerCase();
      const matchSearch = name.includes(search.toLowerCase()) || db.includes(search.toLowerCase());
      const matchDb = dbFilter === 'all' || str(v.TABLE_SCHEMA) === dbFilter;
      const matchStatus = statusFilter === 'all' || str(v.LAST_REFRESH_STATE) === statusFilter;
      return matchSearch && matchDb && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'TABLE_ROWS') {
        cmp = Number(a.TABLE_ROWS ?? 0) - Number(b.TABLE_ROWS ?? 0);
      } else if (sortKey === 'LAST_REFRESH_START_TIME') {
        cmp = str(a.LAST_REFRESH_START_TIME).localeCompare(str(b.LAST_REFRESH_START_TIME));
      } else {
        cmp = str(a[sortKey]).localeCompare(str(b[sortKey]));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">物化视图管理</h1>
            <p className="page-description">
              管理 StarRocks 物化视图 · {views.length} 个视图
              {lastRefreshed && (
                <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} /> {fromCache ? '缓存时间：' : '刷新时间：'}{lastRefreshed}
                  {fromCache && <span style={{ marginLeft: '4px', padding: '1px 6px', borderRadius: '999px', fontSize: '0.68rem', backgroundColor: 'rgba(234,179,8,0.12)', color: 'var(--warning-600)', fontWeight: 600 }}>CACHE</span>}
                </span>
              )}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => fetchViews(true)} disabled={loading || refreshing}>
            <RefreshCw size={16} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} /> {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div style={{ color: 'var(--danger-500)', marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        {success && <div className="toast toast-success">{success}</div>}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <Search />
            <input className="input" placeholder="搜索物化视图..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
            <select className="input" style={{ width: 'auto', minWidth: '120px', fontSize: '0.82rem' }} value={dbFilter} onChange={e => setDbFilter(e.target.value)}>
              <option value="all">全部数据库</option>
              {allDbs.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="input" style={{ width: 'auto', minWidth: '120px', fontSize: '0.82rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">全部状态</option>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> 加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Box size={48} /><div className="empty-state-text">{search || dbFilter !== 'all' ? '没有匹配的物化视图' : '暂无物化视图'}</div></div>
        ) : (
          <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none', minWidth: '150px' }} onClick={() => toggleSort('TABLE_NAME')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      名称 <SortIcon col="TABLE_NAME" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none', minWidth: '100px' }} onClick={() => toggleSort('TABLE_SCHEMA')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Database size={12} /> 数据库 <SortIcon col="TABLE_SCHEMA" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th style={{ minWidth: '80px' }}>刷新类型</th>
                  <th style={{ minWidth: '64px' }}>状态</th>
                  <th style={{ minWidth: '90px' }}>最近刷新</th>
                  <th style={{ minWidth: '64px' }}>耗时</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none', minWidth: '80px' }} onClick={() => toggleSort('TABLE_ROWS')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      行数 <SortIcon col="TABLE_ROWS" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th style={{ minWidth: '64px' }}>活跃</th>
                  <th style={{ minWidth: '100px' }}>创建者</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((mv, idx) => {
                  const name = str(mv.TABLE_NAME);
                  const db = str(mv.TABLE_SCHEMA);
                  const refreshType = str(mv.REFRESH_TYPE);
                  const isActive = str(mv.IS_ACTIVE) === 'true';
                  const lastState = str(mv.LAST_REFRESH_STATE);
                  const lastTime = str(mv.LAST_REFRESH_START_TIME);
                  const duration = str(mv.LAST_REFRESH_DURATION);
                  const rows = Number(mv.TABLE_ROWS ?? 0);
                  const creator = str(mv.CREATOR);
                  const statusStyle = STATUS_STYLE[lastState] || STATUS_STYLE.PENDING;

                  return (
                    <tr key={`${db}.${name}`}>
                      <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(139,92,246,0.08)', color: 'var(--accent-600)',
                            border: '1px solid rgba(139,92,246,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Box size={13} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: 600,
                          backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary-600)',
                          border: '1px solid rgba(37,99,235,0.15)',
                        }}>
                          {db}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: 600,
                          backgroundColor: refreshType === 'ASYNC' ? 'rgba(22,163,74,0.08)' : 'rgba(234,179,8,0.08)',
                          color: refreshType === 'ASYNC' ? 'var(--success-600)' : 'var(--warning-600)',
                          border: `1px solid ${refreshType === 'ASYNC' ? 'rgba(22,163,74,0.2)' : 'rgba(234,179,8,0.2)'}`,
                        }}>
                          {refreshType}
                        </span>
                      </td>
                      <td>
                        {lastState ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                            backgroundColor: statusStyle.bg, color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                          }}>
                            ● {lastState}
                          </span>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {lastTime && lastTime !== 'NULL' ? lastTime : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {duration && duration !== 'NULL' ? `${duration}s` : '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                        {rows > 0 ? rows.toLocaleString() : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isActive ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-600)' }}>✓ Active</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger-500)' }}>✗ Inactive</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{creator}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-icon" onClick={() => handleShowDef(db, name)} title="查看定义" disabled={loadingDef}>
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--success-600)' }} onClick={() => handleRefreshMV(db, name)} title="手动刷新">
                            <Play size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger-500)' }} onClick={() => handleDropMV(db, name)} title="删除">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--border-secondary)',
              fontSize: '0.78rem', color: 'var(--text-tertiary)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>
                共 <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> 个物化视图
                {(search || dbFilter !== 'all' || statusFilter !== 'all') && ` (过滤自 ${views.length} 个)`}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Box size={12} /> information_schema.materialized_views
              </span>
            </div>
          </div>
        )}

        {/* Definition Modal */}
        {showDef && (
          <div className="modal-overlay" onClick={() => setShowDef(null)}>
            <div className="modal" style={{ maxWidth: '820px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">物化视图定义 — {showDef.db}.{showDef.name}</div>
                <button className="btn-ghost btn-icon" onClick={() => setShowDef(null)}><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <pre style={{
                  margin: 0, padding: '16px', overflow: 'auto', maxHeight: '60vh',
                  fontSize: '0.8rem', lineHeight: 1.6,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 0,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {showDef.def || '无法获取定义'}
                </pre>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDef(null)}>关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
