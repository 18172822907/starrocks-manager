'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import {
  PageHeader,
  ErrorBanner,
  SuccessToast,
  CommandLogButton,
} from '@/components/ui';
import {
  Microscope,
  RefreshCw,
  ArrowLeft,
  Search,
  Download,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { apiFetch } from '@/lib/fetch-patch';
import {
  PROC_PATHS,
  PROC_GROUPS,
  getProcMeta,
  ALLOWED_PROC_PATHS,
  type ProcPathMeta,
} from '@/lib/proc-metadata';

// ── Drill-down hierarchy (from official StarRocks 3.5 docs) ──────────
//
// Hierarchy rules:
//   /dbs                              → /dbs/<db_id>                   (depth 1→2)
//   /dbs/<db_id>                      → /dbs/<db_id>/<table_id>        (depth 2→3, skip VIEWs)
//   /dbs/<db_id>/<table_id>           → partitions|temp_partitions|index_schema (depth 3→4, fixed children)
//   /dbs/<db_id>/<table_id>/partitions → LEAF
//   /jobs                             → /jobs/<db_id>                  (depth 1→2)
//   /jobs/<db_id>                     → LEAF
//   /statistic                        → /statistic/<db_id>             (depth 1→2)
//   /statistic/<db_id>                → LEAF
//   /transactions                     → /transactions/<db_id>          (depth 1→2)
//   /transactions/<db_id>             → LEAF
//   /cluster_balance                  → /cluster_balance/<item>        (depth 1→2)
//   /cluster_balance/<item>           → LEAF
//   All other roots                   → LEAF (no drill-down)
//

/** Max segment depth at which drill-down is still allowed for each root */
const DRILL_MAX_DEPTH: Record<string, number> = {
  '/dbs':             3,  // can drill at depth 1,2,3 (up to 4 segments total)
  '/jobs':            1,  // can drill at depth 1 only
  '/statistic':       1,
  '/transactions':    2,
  '/cluster_balance': 1,
};

/** At /dbs/<id>/<table_id> (depth 3), only these fixed child nodes are valid */
const DBS_TABLE_CHILDREN = new Set(['partitions', 'temp_partitions', 'index_schema']);

/** Determine if a path supports drill-down into children */
function isDrillable(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  const depth = segments.length;
  const root = '/' + segments[0];
  const maxDepth = DRILL_MAX_DEPTH[root];
  if (maxDepth === undefined) return false;
  return depth <= maxDepth;
}

/** For /dbs/<id>/<table_id>, returns the fixed set of child nodes instead of row-based drill */
function getFixedChildren(path: string): string[] | null {
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'dbs' && segments.length === 3) {
    return Array.from(DBS_TABLE_CHILDREN);
  }
  return null;
}

// ── Directory View component ─────────────────────────────────────────

function ProcDirectory({ onSelect }: { onSelect: (path: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {PROC_GROUPS.map(group => {
        const paths = PROC_PATHS.filter(p => p.group === group.key);
        if (paths.length === 0) return null;
        return (
          <div key={group.key}>
            {/* Group header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '12px', paddingLeft: '2px',
            }}>
              <div style={{
                width: '6px', height: '22px', borderRadius: '3px',
                background: group.iconColor,
              }} />
              <div>
                <div style={{
                  fontSize: '0.95rem', fontWeight: 700,
                  color: 'var(--text-primary)', lineHeight: 1.3,
                }}>
                  {group.label}
                </div>
                <div style={{
                  fontSize: '0.72rem', color: 'var(--text-tertiary)',
                  fontWeight: 500, marginTop: '1px',
                }}>
                  {group.description}
                </div>
              </div>
            </div>

            {/* Path cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
            }}>
              {paths.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.path}
                    onClick={() => onSelect(p.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-elevated)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    className="proc-card"
                  >
                    <div style={{
                      width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
                      background: group.gradient,
                      border: `1px solid ${group.iconColor}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, color: group.iconColor,
                    }}>
                      <Icon size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{
                        display: 'flex', alignItems: 'baseline', gap: '6px',
                      }}>
                        <span style={{
                          fontSize: '0.84rem', fontWeight: 600,
                          color: 'var(--text-primary)', whiteSpace: 'nowrap',
                        }}>
                          {p.label}
                        </span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.66rem', color: 'var(--text-quaternary)',
                          fontWeight: 500, whiteSpace: 'nowrap',
                        }}>
                          {p.path}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.7rem', color: 'var(--text-tertiary)',
                        marginTop: '2px', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: 1.4,
                      }}>
                        {p.description}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Detail Viewer component ──────────────────────────────────────────

function ProcViewer({
  sessionId,
  path,
  meta,
  onBack,
  onNavigate,
}: {
  sessionId: string;
  path: string;
  meta: ProcPathMeta | undefined;
  onBack: () => void;
  onNavigate: (newPath: string) => void;
}) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [cachedAt, setCachedAt] = useState('');

  const drillable = isDrillable(path);

  // Determine if we're at a sub-path (deeper than root)
  const pathSegments = path.split('/').filter(Boolean);
  const rootPath = '/' + pathSegments[0];
  const isSubPath = pathSegments.length > 1;

  const fetchData = React.useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const url = `/api/show-proc?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}${force ? '&refresh=true' : ''}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setColumns(json.columns || []);
        setRows(json.rows || []);
        if (json.cachedAt) setCachedAt(json.cachedAt);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId, path]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter rows by search text
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(needle))
    );
  }, [rows, search]);

  // CSV export
  function handleExport() {
    if (columns.length === 0 || filteredRows.length === 0) return;
    const header = columns.join(',');
    const body = filteredRows.map(row =>
      columns.map(col => {
        const val = String(row[col] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ).join('\n');
    const csv = `${header}\n${body}`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `show_proc${path.replace(/\//g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Non-drillable table types (VIEW, SCHEMA, etc. don't support SHOW PROC sub-paths)
  const NON_DRILLABLE_TYPES = new Set(['VIEW', 'SCHEMA', 'INLINE_VIEW', 'BROKER', 'SYSTEM VIEW']);

  /** Check if a specific row supports drill-down (e.g., skip VIEWs) */
  function isRowDrillable(row: Record<string, unknown>): boolean {
    if (!drillable) return false;
    // If row has a "Type" column, only drill into table-like types
    const typeVal = row['Type'] || row['type'] || row['TABLE_TYPE'];
    if (typeVal) {
      const t = String(typeVal).toUpperCase();
      if (NON_DRILLABLE_TYPES.has(t)) return false;
    }
    return true;
  }

  // Drill-down: click a row to navigate into sub-path
  function handleDrillDown(row: Record<string, unknown>) {
    if (!isRowDrillable(row) || columns.length === 0) return;
    // Use first column value as the sub-path segment
    const firstVal = String(row[columns[0]] ?? '');
    if (!firstVal) return;
    const newPath = `${path}/${firstVal}`;
    onNavigate(newPath);
  }

  // Navigate up one level in drill-down
  function handleGoUp() {
    if (!isSubPath) {
      onBack();
      return;
    }
    const parentPath = '/' + pathSegments.slice(0, -1).join('/');
    onNavigate(parentPath);
  }

  const Icon = meta?.icon || Microscope;
  const groupMeta = meta ? PROC_GROUPS.find(g => g.key === meta.group) : undefined;

  // Smart cell formatting
  function formatCell(col: string, value: unknown): React.ReactNode {
    const str = String(value ?? '');
    if (str === '' || str === 'null' || str === 'undefined') {
      return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
    }

    const colLower = col.toLowerCase();

    // Status columns
    if (colLower === 'alive' || colLower === 'isalive') {
      const alive = str.toLowerCase() === 'true';
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
          backgroundColor: alive ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
          color: alive ? 'var(--success-600)' : 'var(--danger-500)',
          border: `1px solid ${alive ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: alive ? 'var(--success-500)' : 'var(--danger-500)',
          }} />
          {alive ? '在线' : '离线'}
        </span>
      );
    }

    // Percentage columns
    if (colLower.includes('pct') || colLower.includes('percent') || str.endsWith('%')) {
      const num = parseFloat(str.replace(/%/, ''));
      if (!isNaN(num)) {
        const color = num > 80 ? 'var(--danger-500)' : num > 60 ? 'var(--warning-600)' : 'var(--success-600)';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
            <div style={{ flex: 1, height: '5px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(num, 100)}%`, height: '100%', borderRadius: '3px', backgroundColor: color, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color, minWidth: '36px', textAlign: 'right' }}>{num.toFixed(1)}%</span>
          </div>
        );
      }
    }

    // IP address columns
    if (colLower === 'ip' || colLower === 'host' || colLower.endsWith('ip') || colLower.endsWith('host')) {
      return (
        <code style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem',
          fontWeight: 600, color: 'var(--text-primary)',
        }}>
          {str}
        </code>
      );
    }

    // Port columns
    if (colLower.includes('port')) {
      return (
        <code style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem',
          color: 'var(--text-secondary)',
        }}>
          {str}
        </code>
      );
    }

    // ID / number columns
    if (colLower.endsWith('id') || colLower === 'id') {
      return (
        <code style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem',
          color: 'var(--text-secondary)', fontWeight: 500,
        }}>
          {str}
        </code>
      );
    }

    // Role column
    if (colLower === 'role') {
      const isLeader = str === 'LEADER';
      return (
        <span style={{
          padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
          backgroundColor: isLeader ? 'rgba(234,179,8,0.1)' : 'rgba(37,99,235,0.08)',
          color: isLeader ? 'var(--warning-600)' : 'var(--primary-600)',
          border: `1px solid ${isLeader ? 'rgba(234,179,8,0.25)' : 'rgba(37,99,235,0.2)'}`,
        }}>
          {str}
        </span>
      );
    }

    // Boolean columns
    if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
      return (
        <span style={{
          color: str.toLowerCase() === 'true' ? 'var(--success-600)' : 'var(--text-tertiary)',
          fontSize: '0.82rem', fontWeight: 500,
        }}>
          {str}
        </span>
      );
    }

    // Default
    return <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{str}</span>;
  }

  return (
    <>
      {/* Header Area */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '16px',
        marginBottom: '20px', padding: '16px 20px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: 'var(--radius-lg)',
              background: groupMeta?.gradient || 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: groupMeta?.iconColor || 'var(--text-secondary)',
            }}>
              <Icon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                  {meta?.label || rootPath}
                </h2>
                {drillable && !isSubPath && (
                  <span style={{
                    fontSize: '0.68rem', color: 'var(--primary-600)', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '999px',
                    backgroundColor: 'rgba(37,99,235,0.06)',
                    border: '1px solid rgba(37,99,235,0.15)',
                    letterSpacing: '0.02em',
                  }}>
                    支持下钻
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                <code style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                  SHOW PROC &apos;{path}&apos;
                </code>
                {cachedAt && <span>· 缓存于 {cachedAt}</span>}
              </div>
            </div>
          </div>
          
          <button
            className="btn btn-secondary btn-sm"
            onClick={isSubPath ? handleGoUp : onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
          >
            <ArrowLeft size={14} /> {isSubPath ? '返回上级' : '返回目录'}
          </button>
        </div>

        {/* Drill-down breadcrumb trail */}
        {isSubPath && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-secondary)',
            fontSize: '0.78rem', flexWrap: 'wrap',
          }}>
            <FolderOpen size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            {pathSegments.map((seg, i) => {
              const isLast = i === pathSegments.length - 1;
              const segPath = '/' + pathSegments.slice(0, i + 1).join('/');
              return (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={12} style={{ color: 'var(--border-strong)', flexShrink: 0 }} />}
                  {isLast ? (
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {seg}
                    </span>
                  ) : (
                    <button
                      onClick={() => onNavigate(segPath)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: 'var(--primary-600)', fontWeight: 500,
                        fontFamily: "'JetBrains Mono', monospace",
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-500)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--primary-600)'}
                    >
                      {seg}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div className="table-search" style={{ minWidth: '240px', maxWidth: '320px' }}>
            <Search size={15} className="table-search-icon" />
            <input
              placeholder="在当前结果中搜索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {filteredRows.length === rows.length
              ? `共 ${rows.length} 行`
              : `筛选出 ${filteredRows.length} / ${rows.length} 行`}
          </div>
        </div>
        <div className="toolbar-actions">
          <CommandLogButton source="show-proc" title="SHOW PROC" />
          <button className="btn btn-secondary" onClick={handleExport} disabled={filteredRows.length === 0}>
            <Download size={14} /> 导出 CSV
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={14} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* Error */}
      <ErrorBanner error={error} />

      {/* Table */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /> 加载中...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <Microscope size={48} />
          <div className="empty-state-text">暂无数据</div>
        </div>
      ) : (
        <div className="table-container fade-in" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                {columns.map(col => (
                  <th key={col} style={{ whiteSpace: 'nowrap' }}>{col}</th>
                ))}
                {drillable && <th style={{ width: '36px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const rowCanDrill = isRowDrillable(row);
                return (
                <tr
                  key={idx}
                  onClick={rowCanDrill ? () => handleDrillDown(row) : undefined}
                  style={{
                    cursor: rowCanDrill ? 'pointer' : undefined,
                  }}
                  className={rowCanDrill ? 'proc-drill-row' : undefined}
                >
                  <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col} style={{ whiteSpace: 'nowrap' }}>
                      {formatCell(col, row[col])}
                    </td>
                  ))}
                  {drillable && (
                    <td style={{ textAlign: 'center' }}>
                      {rowCanDrill && <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ShowProcPage() {
  const { session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error] = useState('');
  const [success] = useState('');

  const activePath = searchParams.get('path');
  const rootPath = activePath ? '/' + activePath.split('/').filter(Boolean)[0] : null;
  const activeMeta = rootPath ? getProcMeta(rootPath) : undefined;

  function handleSelect(path: string) {
    router.push(`/show-proc?path=${encodeURIComponent(path)}`);
  }

  function handleBack() {
    router.push('/show-proc');
  }

  function handleNavigate(newPath: string) {
    router.push(`/show-proc?path=${encodeURIComponent(newPath)}`);
  }

  // Build breadcrumb segments
  const breadcrumb = [
    { label: '集群运维' },
    { label: '高级诊断', href: activePath ? '/show-proc' : undefined },
  ];
  if (activePath) {
    // For sub-paths, show the full path trail
    const segments = activePath.split('/').filter(Boolean);
    if (segments.length === 1) {
      breadcrumb.push({ label: activeMeta?.label || activePath });
    } else {
      breadcrumb.push({ label: activeMeta?.label || segments[0], href: `/show-proc?path=/${segments[0]}` });
      for (let i = 1; i < segments.length; i++) {
        const isLast = i === segments.length - 1;
        breadcrumb.push({
          label: segments[i],
          href: isLast ? undefined : `/show-proc?path=/${segments.slice(0, i + 1).join('/')}`,
        });
      }
    }
  }

  return (
    <>
      <PageHeader
        title={activePath ? (activeMeta?.label || activePath) : '高级诊断'}
        breadcrumb={breadcrumb}
        description={activePath
          ? (activeMeta?.description || `SHOW PROC '${activePath}'`)
          : '查看 StarRocks 内部运行状态 · 19 个诊断路径'}
      />

      <div className="page-body">
        <ErrorBanner error={error} />
        <SuccessToast message={success} />

        {activePath && session ? (
          <ProcViewer
            sessionId={session.sessionId}
            path={activePath}
            meta={activeMeta}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        ) : (
          <ProcDirectory onSelect={handleSelect} />
        )}
      </div>

      {/* Card & drill-down hover styles */}
      <style jsx global>{`
        .proc-card:hover {
          border-color: var(--primary-300) !important;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
          transform: translateY(-1px);
        }
        [data-theme="dark"] .proc-card:hover {
          border-color: var(--primary-600) !important;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
        }
        .proc-drill-row:hover {
          background-color: rgba(37, 99, 235, 0.03) !important;
        }
        [data-theme="dark"] .proc-drill-row:hover {
          background-color: rgba(37, 99, 235, 0.08) !important;
        }
      `}</style>
    </>
  );
}
