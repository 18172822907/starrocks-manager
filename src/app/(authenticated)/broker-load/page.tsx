'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  RefreshCw, Search, Clock, XCircle, Filter, Database, HardDrive,
} from 'lucide-react';

const STATE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  PENDING:   { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)' },
  ETL:       { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: 'var(--primary-600)' },
  LOADING:   { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: 'var(--primary-600)' },
  FINISHED:  { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: 'var(--success-600)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', color: 'var(--danger-500)' },
};

export default function BrokerLoadPage() {
  const { session } = useSession();
  const [loads, setLoads] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const str = (v: unknown) => String(v ?? '');

  const fetchLoads = useCallback(async (forceRefresh = false) => {
    if (!session) return;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/broker-load?sessionId=${encodeURIComponent(session.sessionId)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setLoads(data.loads || []);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [session]);

  useEffect(() => { if (session) fetchLoads(); }, [session, fetchLoads]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  async function handleCancel(db: string, label: string) {
    if (!session || !confirm(`确定要取消导入任务 ${label} 吗？`)) return;
    try {
      const res = await fetch('/api/broker-load', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action: 'cancel', dbName: db, label }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`任务 ${label} 已取消`); fetchLoads(true); }
    } catch (err) { setError(String(err)); }
  }

  const allStates = Array.from(new Set(loads.map(l => str(l['State'])))).filter(Boolean).sort();

  const filtered = loads.filter(l => {
    const label = str(l['Label']).toLowerCase();
    const db = str(l['_db']).toLowerCase();
    const matchSearch = label.includes(search.toLowerCase()) || db.includes(search.toLowerCase());
    const matchState = stateFilter === 'all' || str(l['State']) === stateFilter;
    return matchSearch && matchState;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Broker Load 管理</h1>
            <p className="page-description">管理批量导入任务 · {loads.length} 条记录</p>
          </div>
          <button className="btn btn-secondary" onClick={() => fetchLoads(true)} disabled={loading || refreshing}>
            <RefreshCw size={16} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} /> {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div style={{ color: 'var(--danger-500)', marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div className="toast toast-success">{success}</div>}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <Search /><input className="input" placeholder="搜索 Label 或数据库..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
            <select className="input" style={{ width: 'auto', minWidth: '120px', fontSize: '0.82rem' }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
              <option value="all">全部状态</option>
              {allStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> 加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><HardDrive size={48} /><div className="empty-state-text">{search || stateFilter !== 'all' ? '没有匹配的任务' : '暂无 Broker Load 任务'}</div></div>
        ) : (
          <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: '160px' }}>Label</th>
                  <th style={{ minWidth: '90px' }}><Database size={12} /> 数据库</th>
                  <th style={{ minWidth: '80px' }}>状态</th>
                  <th style={{ minWidth: '80px' }}>类型</th>
                  <th style={{ minWidth: '80px' }}>进度</th>
                  <th style={{ minWidth: '120px' }}>创建时间</th>
                  <th style={{ minWidth: '120px' }}>完成时间</th>
                  <th style={{ minWidth: '100px' }}>URL / 详情</th>
                  <th style={{ textAlign: 'center', width: '64px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, idx) => {
                  const label = str(l['Label']);
                  const db = str(l['_db']);
                  const state = str(l['State']);
                  const type = str(l['Type'] || l['EtlInfo'] || '');
                  const progress = str(l['Progress'] || '');
                  const createTime = str(l['CreateTime'] || '');
                  const finishTime = str(l['LoadFinishTime'] || l['FinishTime'] || '');
                  const url = str(l['URL'] || l['TrackingUrl'] || '');
                  const ss = STATE_STYLE[state] || STATE_STYLE.PENDING;
                  const canCancel = ['PENDING', 'ETL', 'LOADING'].includes(state);

                  return (
                    <tr key={`${db}.${label}.${idx}`}>
                      <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--primary-600)',
                            border: '1px solid rgba(37,99,235,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <HardDrive size={13} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
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
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{type || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{progress || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{createTime}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{finishTime || '—'}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={url}>{url || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {canCancel && (
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger-500)' }} onClick={() => handleCancel(db, label)} title="取消"><XCircle size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-secondary)', fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>共 <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> 条</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> SHOW LOAD</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
