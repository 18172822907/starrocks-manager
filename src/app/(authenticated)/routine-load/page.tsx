'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  RefreshCw, Search, Clock, Pause, Play, Square, Filter,
  Database, Radio, AlertTriangle,
} from 'lucide-react';

const STATE_STYLE: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  RUNNING:   { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: 'var(--success-600)', icon: '▶' },
  PAUSED:    { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)', icon: '⏸' },
  STOPPED:   { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', color: 'var(--text-tertiary)', icon: '⏹' },
  CANCELLED: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', color: 'var(--danger-500)', icon: '✗' },
  NEED_SCHEDULE: { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: 'var(--primary-600)', icon: '⏳' },
  UNSTABLE:  { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)', icon: '⚠' },
};

export default function RoutineLoadPage() {
  const { session } = useSession();
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const str = (v: unknown) => String(v ?? '');

  const fetchJobs = useCallback(async (forceRefresh = false) => {
    if (!session) return;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/routine-load?sessionId=${encodeURIComponent(session.sessionId)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setJobs(data.jobs || []);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [session]);

  useEffect(() => { if (session) fetchJobs(); }, [session, fetchJobs]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  async function handleAction(action: string, db: string, name: string) {
    if (!session) return;
    const actionLabels: Record<string, string> = { pause: '暂停', resume: '恢复', stop: '停止' };
    if (action === 'stop' && !confirm(`确定要停止 Routine Load 任务 ${name} 吗？停止后不可恢复！`)) return;
    try {
      const res = await fetch('/api/routine-load', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action, dbName: db, jobName: name }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`${actionLabels[action] || action} ${name} 成功`); fetchJobs(true); }
    } catch (err) { setError(String(err)); }
  }

  const allStates = Array.from(new Set(jobs.map(j => str(j['State'])))).filter(Boolean).sort();

  const filtered = jobs.filter(j => {
    const name = str(j['Name']).toLowerCase();
    const db = str(j['_db']).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || db.includes(search.toLowerCase());
    const matchState = stateFilter === 'all' || str(j['State']) === stateFilter;
    return matchSearch && matchState;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Routine Load 管理</h1>
            <p className="page-description">管理 Kafka 持续导入任务 · {jobs.length} 个任务</p>
          </div>
          <button className="btn btn-secondary" onClick={() => fetchJobs(true)} disabled={loading || refreshing}>
            <RefreshCw size={16} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} /> {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div style={{ color: 'var(--danger-500)', marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div className="toast toast-success">{success}</div>}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <Search /><input className="input" placeholder="搜索任务..." value={search} onChange={e => setSearch(e.target.value)} />
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
          <div className="empty-state"><Radio size={48} /><div className="empty-state-text">{search || stateFilter !== 'all' ? '没有匹配的任务' : '暂无 Routine Load 任务'}</div></div>
        ) : (
          <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: '140px' }}>任务名</th>
                  <th style={{ minWidth: '90px' }}><Database size={12} /> 数据库</th>
                  <th style={{ minWidth: '100px' }}>目标表</th>
                  <th style={{ minWidth: '80px' }}>状态</th>
                  <th style={{ minWidth: '80px' }}>数据源</th>
                  <th style={{ minWidth: '120px' }}>创建时间</th>
                  <th style={{ minWidth: '60px' }}>统计</th>
                  <th style={{ minWidth: '100px' }}>错误信息</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j, idx) => {
                  const name = str(j['Name']);
                  const db = str(j['_db']);
                  const table = str(j['TableName']);
                  const state = str(j['State']);
                  const dataSource = str(j['DataSourceType']);
                  const createTime = str(j['CreateTime']);
                  const errorMsg = str(j['ReasonOfStateChanged'] || j['OtherMsg'] || '');
                  const loadedRows = str(j['LoadedRows'] || j['Statistics'] || '');
                  const ss = STATE_STYLE[state] || STATE_STYLE.RUNNING;

                  return (
                    <tr key={`${db}.${name}.${idx}`}>
                      <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(22,163,74,0.08)', color: 'var(--success-600)',
                            border: '1px solid rgba(22,163,74,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Radio size={13} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</span>
                        </div>
                      </td>
                      <td><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary-600)', border: '1px solid rgba(37,99,235,0.15)' }}>{db}</span></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{table}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                          backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                        }}>
                          {ss.icon} {state}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{dataSource || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{createTime || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{loadedRows ? loadedRows.substring(0, 40) : '—'}</td>
                      <td>
                        {errorMsg ? (
                          <div style={{ fontSize: '0.72rem', color: 'var(--danger-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={errorMsg}>
                            <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{errorMsg}
                          </div>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                          {state === 'RUNNING' && (
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--warning-600)' }} onClick={() => handleAction('pause', db, name)} title="暂停"><Pause size={14} /></button>
                          )}
                          {state === 'PAUSED' && (
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--success-600)' }} onClick={() => handleAction('resume', db, name)} title="恢复"><Play size={14} /></button>
                          )}
                          {(state === 'RUNNING' || state === 'PAUSED') && (
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger-500)' }} onClick={() => handleAction('stop', db, name)} title="停止"><Square size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-secondary)', fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>共 <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> 个任务</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> SHOW ALL ROUTINE LOAD</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
