'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  RefreshCw, Search, Clock, Pause, Play, Trash2, Filter,
  Database, GitBranch,
} from 'lucide-react';

const STATE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  RUNNING:   { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: 'var(--success-600)' },
  SUSPEND:   { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)' },
  SUSPENDED: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)' },
  ERROR:     { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', color: 'var(--danger-500)' },
  FINISHED:  { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', color: 'var(--text-tertiary)' },
};

export default function PipesPage() {
  const { session } = useSession();
  const [pipes, setPipes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const str = (v: unknown) => String(v ?? '');

  const fetchPipes = useCallback(async (forceRefresh = false) => {
    if (!session) return;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pipes?sessionId=${encodeURIComponent(session.sessionId)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setPipes(data.pipes || []);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [session]);

  useEffect(() => { if (session) fetchPipes(); }, [session, fetchPipes]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  async function handleAction(action: string, db: string, name: string) {
    if (!session) return;
    if (action === 'drop' && !confirm(`确定要删除 Pipe ${name} 吗？`)) return;
    const labels: Record<string, string> = { suspend: '暂停', resume: '恢复', drop: '删除' };
    try {
      const res = await fetch('/api/pipes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action, dbName: db, pipeName: name }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`${labels[action] || action} ${name} 成功`); fetchPipes(true); }
    } catch (err) { setError(String(err)); }
  }

  const filtered = pipes.filter(p => {
    const name = str(p['PIPE_NAME'] || p['Name'] || p['name'] || '').toLowerCase();
    const db = str(p['_db']).toLowerCase();
    return name.includes(search.toLowerCase()) || db.includes(search.toLowerCase());
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Pipes 管理</h1>
            <p className="page-description">管理持续导入 Pipe · {pipes.length} 个 Pipe</p>
          </div>
          <button className="btn btn-secondary" onClick={() => fetchPipes(true)} disabled={loading || refreshing}>
            <RefreshCw size={16} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} /> {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div style={{ color: 'var(--danger-500)', marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div className="toast toast-success">{success}</div>}

        <div className="search-bar mb-4">
          <Search /><input className="input" placeholder="搜索 Pipe..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> 加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><GitBranch size={48} /><div className="empty-state-text">{search ? '没有匹配的 Pipe' : '暂无 Pipe'}</div></div>
        ) : (
          <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: '120px' }}>名称</th>
                  <th style={{ minWidth: '90px' }}><Database size={12} /> 数据库</th>
                  <th style={{ minWidth: '80px' }}>状态</th>
                  <th style={{ minWidth: '100px' }}>目标表</th>
                  <th style={{ minWidth: '80px' }}>已加载文件</th>
                  <th style={{ minWidth: '80px' }}>已加载行</th>
                  <th style={{ minWidth: '130px' }}>创建时间</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const name = str(p['PIPE_NAME'] || p['Name'] || p['name'] || '');
                  const db = str(p['_db']);
                  const state = str(p['STATE'] || p['State'] || p['state'] || '');
                  const table = str(p['TABLE_NAME'] || p['TableName'] || '');
                  const files = str(p['LOADED_FILES'] || p['LoadedFiles'] || '');
                  const rows = str(p['LOADED_ROWS'] || p['LoadedRows'] || '');
                  const created = str(p['CREATED_TIME'] || p['CreatedTime'] || p['CreateTime'] || '');
                  const ss = STATE_STYLE[state.toUpperCase()] || STATE_STYLE.RUNNING;

                  return (
                    <tr key={`${db}.${name}.${idx}`}>
                      <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(139,92,246,0.08)', color: 'var(--accent-600)',
                            border: '1px solid rgba(139,92,246,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <GitBranch size={13} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</span>
                        </div>
                      </td>
                      <td><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary-600)', border: '1px solid rgba(37,99,235,0.15)' }}>{db}</span></td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                          backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                        }}>
                          {state}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{table || '—'}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>{files ? Number(files).toLocaleString() : '—'}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>{rows ? Number(rows).toLocaleString() : '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{created || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                          {state.toUpperCase() === 'RUNNING' && (
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--warning-600)' }} onClick={() => handleAction('suspend', db, name)} title="暂停"><Pause size={14} /></button>
                          )}
                          {(state.toUpperCase() === 'SUSPEND' || state.toUpperCase() === 'SUSPENDED') && (
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--success-600)' }} onClick={() => handleAction('resume', db, name)} title="恢复"><Play size={14} /></button>
                          )}
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger-500)' }} onClick={() => handleAction('drop', db, name)} title="删除"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-secondary)', fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>共 <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> 个 Pipe</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> SHOW PIPES</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
