'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  RefreshCw, Search, Clock, Trash2, Filter, ListChecks,
  ChevronDown, ChevronRight,
} from 'lucide-react';

const STATE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  SUCCESS: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: 'var(--success-600)' },
  FAILED:  { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', color: 'var(--danger-500)' },
  RUNNING: { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: 'var(--primary-600)' },
  PENDING: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', color: 'var(--warning-600)' },
};

export default function TasksPage() {
  const { session } = useSession();
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [runs, setRuns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'tasks' | 'runs'>('tasks');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const str = (v: unknown) => String(v ?? '');

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!session) return;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [tasksRes, runsRes] = await Promise.all([
        fetch(`/api/tasks?sessionId=${encodeURIComponent(session.sessionId)}&type=tasks`),
        fetch(`/api/tasks?sessionId=${encodeURIComponent(session.sessionId)}&type=task_runs`),
      ]);
      const tasksData = await tasksRes.json();
      const runsData = await runsRes.json();
      if (tasksData.error) setError(tasksData.error);
      else setTasks(tasksData.tasks || []);
      if (!tasksData.error && runsData.error) setError(runsData.error);
      else setRuns(runsData.runs || []);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  async function handleDrop(name: string) {
    if (!session || !confirm(`确定要删除任务 ${name} 吗？`)) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, action: 'drop', taskName: name }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setSuccess(`任务 ${name} 已删除`); fetchData(true); }
    } catch (err) { setError(String(err)); }
  }

  // Get task runs for a specific task
  function getRunsForTask(taskName: string) {
    return runs.filter(r => str(r['TASK_NAME']).includes(taskName) || str(r['TaskName']).includes(taskName));
  }

  const filteredTasks = tasks.filter(t => {
    const name = str(t['TASK_NAME'] || t['TaskName'] || '').toLowerCase();
    const db = str(t['DATABASE'] || t['DbName'] || '').toLowerCase();
    return name.includes(search.toLowerCase()) || db.includes(search.toLowerCase());
  });

  const filteredRuns = runs.filter(r => {
    const name = str(r['TASK_NAME'] || r['TaskName'] || '').toLowerCase();
    const state = str(r['STATE'] || r['State'] || '').toLowerCase();
    return name.includes(search.toLowerCase()) || state.includes(search.toLowerCase());
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">任务管理</h1>
            <p className="page-description">管理定时任务 · {tasks.length} 个任务 · {runs.length} 条运行记录</p>
          </div>
          <button className="btn btn-secondary" onClick={() => fetchData(true)} disabled={loading || refreshing}>
            <RefreshCw size={16} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} /> {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div style={{ color: 'var(--danger-500)', marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div className="toast toast-success">{success}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0' }}>
          {(['tasks', 'runs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 20px', fontSize: '0.85rem', fontWeight: 600,
              border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--primary-500)' : 'transparent'}`,
              background: 'none', cursor: 'pointer', marginBottom: '-2px',
              color: tab === t ? 'var(--primary-600)' : 'var(--text-tertiary)',
            }}>
              {t === 'tasks' ? `任务列表 (${tasks.length})` : `运行记录 (${runs.length})`}
            </button>
          ))}
        </div>

        <div className="search-bar mb-4">
          <Search /><input className="input" placeholder="搜索任务..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> 加载中...</div>
        ) : tab === 'tasks' ? (
          filteredTasks.length === 0 ? (
            <div className="empty-state"><ListChecks size={48} /><div className="empty-state-text">{search ? '没有匹配的任务' : '暂无定时任务'}</div></div>
          ) : (
            <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '30px' }}></th>
                    <th style={{ minWidth: '150px' }}>任务名</th>
                    <th style={{ minWidth: '90px' }}>数据库</th>
                    <th style={{ minWidth: '80px' }}>调度</th>
                    <th style={{ minWidth: '80px' }}>状态</th>
                    <th style={{ minWidth: '130px' }}>创建时间</th>
                    <th style={{ minWidth: '200px' }}>定义</th>
                    <th style={{ textAlign: 'center', width: '64px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t, idx) => {
                    const name = str(t['TASK_NAME'] || t['TaskName'] || '');
                    const db = str(t['DATABASE'] || t['DbName'] || '');
                    const schedule = str(t['SCHEDULE'] || t['Schedule'] || '');
                    const state = str(t['STATE'] || t['State'] || '');
                    const created = str(t['CREATE_TIME'] || t['CreateTime'] || '');
                    const definition = str(t['DEFINITION'] || t['Definition'] || '');
                    const isExpanded = expandedTask === name;
                    const taskRuns = getRunsForTask(name);
                    const ss = STATE_STYLE[state] || STATE_STYLE.PENDING;

                    return (
                      <React.Fragment key={`${name}.${idx}`}>
                        <tr>
                          <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                          <td>
                            {taskRuns.length > 0 && (
                              <button onClick={() => setExpandedTask(isExpanded ? null : name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
                                backgroundColor: 'rgba(234,179,8,0.08)', color: 'var(--warning-600)',
                                border: '1px solid rgba(234,179,8,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                <ListChecks size={13} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{name}</span>
                            </div>
                          </td>
                          <td><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary-600)', border: '1px solid rgba(37,99,235,0.15)' }}>{db || '—'}</span></td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{schedule || 'MANUAL'}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                              backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                            }}>
                              {state || '—'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{created || '—'}</td>
                          <td>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={definition}>
                              {definition || '—'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger-500)' }} onClick={() => handleDrop(name)} title="删除"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                        {/* Expandable task runs */}
                        {isExpanded && taskRuns.map((r, ri) => {
                          const runState = str(r['STATE'] || r['State'] || '');
                          const runSS = STATE_STYLE[runState] || STATE_STYLE.PENDING;
                          return (
                            <tr key={ri} style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              <td></td>
                              <td></td>
                              <td colSpan={2} style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingLeft: '36px' }}>
                                运行 #{ri + 1}
                              </td>
                              <td></td>
                              <td>
                                <span style={{
                                  padding: '1px 6px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 600,
                                  backgroundColor: runSS.bg, color: runSS.color, border: `1px solid ${runSS.border}`,
                                }}>
                                  {runState}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                {str(r['CREATE_TIME'] || r['CreateTime'] || '')}
                              </td>
                              <td style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                耗时: {str(r['DURATION'] || r['Duration'] || '—')}
                              </td>
                              <td></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-secondary)', fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>共 <strong style={{ color: 'var(--text-secondary)' }}>{filteredTasks.length}</strong> 个任务</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> information_schema.tasks</span>
              </div>
            </div>
          )
        ) : (
          /* Task Runs tab */
          filteredRuns.length === 0 ? (
            <div className="empty-state"><ListChecks size={48} /><div className="empty-state-text">{search ? '没有匹配的记录' : '暂无运行记录'}</div></div>
          ) : (
            <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '130px' }}>任务名</th>
                    <th style={{ minWidth: '80px' }}>状态</th>
                    <th style={{ minWidth: '120px' }}>开始时间</th>
                    <th style={{ minWidth: '120px' }}>完成时间</th>
                    <th style={{ minWidth: '80px' }}>耗时</th>
                    <th style={{ minWidth: '100px' }}>数据库</th>
                    <th style={{ minWidth: '150px' }}>错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((r, idx) => {
                    const name = str(r['TASK_NAME'] || r['TaskName'] || '');
                    const state = str(r['STATE'] || r['State'] || '');
                    const start = str(r['CREATE_TIME'] || r['CreateTime'] || '');
                    const end = str(r['FINISH_TIME'] || r['FinishTime'] || '');
                    const duration = str(r['DURATION'] || r['Duration'] || '');
                    const db = str(r['DATABASE'] || r['DbName'] || '');
                    const errorMsg = str(r['ERROR_MESSAGE'] || r['ErrorMessage'] || '');
                    const ss = STATE_STYLE[state] || STATE_STYLE.PENDING;

                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{name}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                            backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                          }}>
                            {state}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{start}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{end || '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{duration || '—'}</td>
                        <td><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: 600, backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary-600)', border: '1px solid rgba(37,99,235,0.15)' }}>{db || '—'}</span></td>
                        <td>
                          {errorMsg ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--danger-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={errorMsg}>{errorMsg}</div>
                          ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-secondary)', fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>共 <strong style={{ color: 'var(--text-secondary)' }}>{filteredRuns.length}</strong> 条记录</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> information_schema.task_runs</span>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
