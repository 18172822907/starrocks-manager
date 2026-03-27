'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { Modal } from './Modal';
import { Search, Trash2, CheckCircle2, XCircle, Clock, Database, RefreshCw, ClipboardList, Copy, Check } from 'lucide-react';
import { apiFetch } from '@/lib/fetch-patch';

interface LogEntry {
  id: number;
  source: string;
  sql_text: string;
  status: string;
  error_message: string | null;
  row_count: number;
  duration_ms: number;
  created_at: string;
}

interface CommandLogModalProps {
  open: boolean;
  onClose: () => void;
  source: string;
  title?: string;
}

export function CommandLogModal({ open, onClose, source, title }: CommandLogModalProps) {
  const { session } = useSession();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!session || !open) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/command-log?sessionId=${encodeURIComponent(session.sessionId)}&source=${encodeURIComponent(source)}&limit=100`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [session, source, open]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (!open) { setExpandedId(null); setCopiedId(null); } }, [open]);

  async function handleClear() {
    if (!session) return;
    try {
      await apiFetch('/api/command-log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, source }),
      });
      setLogs([]);
    } catch { /* ignore */ }
  }

  function handleCopy(id: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = logs.filter(l =>
    l.sql_text.toLowerCase().includes(search.toLowerCase())
  );

  const displayLogs = filtered;

  function formatTime(iso: string) {
    try {
      const d = new Date(iso.endsWith('Z') ? iso : iso.replace(' ', 'T') + 'Z');
      return d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return iso; }
  }

  function formatDuration(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  return (
    <Modal open={open} onClose={onClose} title={title || '执行记录'} maxWidth="900px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            共 {filtered.length} 条记录
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> 刷新
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleClear} disabled={logs.length === 0}>
              <Trash2 size={14} /> 清空
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>关闭</button>
          </div>
        </div>
      }
    >
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <Search />
          <input className="input" placeholder="搜索 SQL 命令..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="loading-overlay" style={{ minHeight: '120px' }}><div className="spinner" /> 加载中...</div>
      ) : displayLogs.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '120px' }}>
          <Database size={36} />
          <div className="empty-state-text">{search ? '没有匹配的记录' : '暂无执行记录'}</div>
        </div>
      ) : (
        <div style={{ maxHeight: '60vh', overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
          <table style={{ width: '100%', fontSize: '0.82rem', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '42px' }} />
              <col style={{ width: '120px' }} />
              <col />
              <col style={{ width: '68px' }} />
              <col style={{ width: '52px' }} />
              <col style={{ width: '48px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}>#</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}>时间</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}>SQL 命令</th>
                <th style={{ textAlign: 'right', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}>耗时</th>
                <th style={{ textAlign: 'right', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}>行数</th>
                <th style={{ textAlign: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {displayLogs.map((log, idx) => {
                const isError = log.status === 'error';
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      style={{
                        cursor: 'pointer',
                        ...(isError ? { backgroundColor: 'rgba(239,68,68,0.04)' } : {}),
                        ...(isExpanded ? { backgroundColor: 'rgba(37,99,235,0.04)' } : {}),
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          {formatTime(log.created_at)}
                        </span>
                      </td>
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <code style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.78rem',
                          color: isError ? 'var(--danger-500)' : 'var(--text-primary)',
                        }}>
                          {log.sql_text}
                        </code>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", color: log.duration_ms > 1000 ? 'var(--warning-600)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDuration(log.duration_ms)}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {log.row_count}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isError ? (
                          <XCircle size={16} style={{ color: 'var(--danger-500)' }} />
                        ) : (
                          <CheckCircle2 size={16} style={{ color: 'var(--success-600)' }} />
                        )}
                      </td>
                    </tr>
                    {/* Expanded SQL detail row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, borderTop: 'none' }}>
                          <div style={{
                            padding: '10px 14px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderTop: '1px dashed var(--border-secondary)',
                            borderBottom: '1px dashed var(--border-secondary)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <pre style={{
                                flex: 1,
                                margin: 0,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.78rem',
                                color: isError ? 'var(--danger-500)' : 'var(--text-primary)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                lineHeight: 1.5,
                              }}>
                                {log.sql_text}
                              </pre>
                              <button
                                className="btn-action"
                                style={{
                                  flexShrink: 0,
                                  padding: '4px',
                                  borderRadius: 'var(--radius-sm)',
                                  color: copiedId === log.id ? 'var(--success-600)' : 'var(--text-tertiary)',
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: 'none',
                                }}
                                title="复制 SQL"
                                onClick={(e) => { e.stopPropagation(); handleCopy(log.id, log.sql_text); }}
                              >
                                {copiedId === log.id ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            {isError && log.error_message && (
                              <div style={{
                                marginTop: '6px',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.15)',
                                fontSize: '0.75rem',
                                color: 'var(--danger-500)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}>
                                ❌ {log.error_message}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/* ── Self-Contained Button + Modal ── */
export function CommandLogButton({ source, title }: { source: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)} title="查看执行记录">
        <ClipboardList size={16} /> 执行记录
      </button>
      <CommandLogModal open={open} onClose={() => setOpen(false)} source={source} title={`${title} · 执行记录`} />
    </>
  );
}
