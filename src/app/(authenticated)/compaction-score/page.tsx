'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  PageHeader,
  ErrorBanner,
  Pagination,
  CommandLogButton,
} from '@/components/ui';
import {
  HardDriveDownload,
  RefreshCw,
  Search,
  Download,
  ArrowUpDown,
} from 'lucide-react';
import { apiFetch } from '@/lib/fetch-patch';
import SearchableSelect from '@/components/SearchableSelect';

// ── Compaction Score Page ─────────────────────────────────────────────

export default function CompactionScorePage() {
  const { session } = useSession();
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dbFilter, setDbFilter] = useState('');
  const [dbList, setDbList] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState('MAX_CS');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const isLoading = initialLoading || refreshing;

  const fetchData = useCallback(async (isInitial = false) => {
    if (!session) return;
    if (isInitial) setInitialLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams({
        sessionId: session.sessionId,
        page: String(page),
        pageSize: String(pageSize),
        orderBy,
        order,
      });
      if (dbFilter) params.set('dbName', dbFilter);
      const res = await apiFetch(`/api/compaction-score?${params.toString()}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setColumns(json.columns || []);
        setRows(json.rows || []);
        setTotalRows(json.total || 0);
        setTotalPages(json.totalPages || 0);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [session, page, pageSize, orderBy, order, dbFilter]);

  // Initial load
  useEffect(() => { fetchData(true); }, [fetchData]);

  // Fetch DB list via SHOW DATABASES on mount
  useEffect(() => {
    if (!session) return;
    const SYSTEM_DBS = ['information_schema', '_statistics_', 'sys'];
    (async () => {
      try {
        const res = await apiFetch(`/api/databases?sessionId=${encodeURIComponent(session.sessionId)}`);
        const json = await res.json();
        if (json.databases && Array.isArray(json.databases)) {
          const names = (json.databases as { name: string }[])
            .map(d => d.name)
            .filter(n => !SYSTEM_DBS.includes(n.toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
          setDbList(names);
        }
      } catch { /* silent */ }
    })();
  }, [session]);

  // Client-side search filter within current page
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(needle))
    );
  }, [rows, search]);

  function handleSort(col: string) {
    if (orderBy === col) {
      setOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setOrderBy(col);
      setOrder('desc');
    }
    setPage(1);
  }

  function handleDbFilter(db: string) {
    setDbFilter(db);
    setPage(1);
  }

  function handlePageChange(p: number) {
    setPage(p);
  }

  function handlePageSizeChange(s: number) {
    setPageSize(s);
    setPage(1);
  }

  // CSV export
  function handleExport() {
    const cols = getDisplayCols();
    if (cols.length === 0 || filteredRows.length === 0) return;
    const header = cols.join(',');
    const body = filteredRows.map(row =>
      cols.map(col => {
        const val = String(row[col] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compaction_score_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getDisplayCols() {
    const priority = [
      'DB_NAME', 'TABLE_NAME', 'PARTITION_NAME',
      'AVG_CS', 'P50_CS', 'MAX_CS',
      'DATA_SIZE', 'ROW_COUNT', 'BUCKETS',
      'COMPACT_VERSION', 'VISIBLE_VERSION', 'VISIBLE_VERSION_TIME',
      'REPLICATION_NUM', 'STORAGE_MEDIUM',
    ];
    return priority.filter(c => columns.includes(c));
  }

  // ── Cell formatting ────────────────────────────────────────────────

  function formatCSCell(value: unknown): React.ReactNode {
    const num = parseFloat(String(value ?? ''));
    if (isNaN(num)) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
    let color = 'var(--success-600)', bg = 'rgba(22,163,74,0.06)', border = 'rgba(22,163,74,0.15)';
    if (num >= 100) { color = 'var(--danger-500)'; bg = 'rgba(239,68,68,0.06)'; border = 'rgba(239,68,68,0.15)'; }
    else if (num >= 50) { color = 'var(--warning-600)'; bg = 'rgba(234,179,8,0.06)'; border = 'rgba(234,179,8,0.15)'; }
    else if (num >= 10) { color = 'var(--primary-600)'; bg = 'rgba(37,99,235,0.06)'; border = 'rgba(37,99,235,0.15)'; }
    return (
      <span style={{
        display: 'inline-block', padding: '1px 7px', borderRadius: '999px',
        fontSize: '0.78rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
        color, backgroundColor: bg, border: `1px solid ${border}`,
      }}>{num.toFixed(2)}</span>
    );
  }

  function formatCell(col: string, value: unknown): React.ReactNode {
    const str = String(value ?? '');
    if (str === '' || str === 'null' || str === 'undefined') return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
    if (col === 'AVG_CS' || col === 'P50_CS' || col === 'MAX_CS') return formatCSCell(value);
    if (col === 'TABLE_NAME') return <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{str}</span>;
    if (['DATA_SIZE', 'ROW_COUNT', 'BUCKETS', 'COMPACT_VERSION', 'VISIBLE_VERSION', 'REPLICATION_NUM'].includes(col)) {
      return <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{str}</code>;
    }
    return <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{str}</span>;
  }

  const colLabels: Record<string, string> = {
    DB_NAME: '数据库', TABLE_NAME: '表名', PARTITION_NAME: '分区',
    AVG_CS: 'AvgCS', P50_CS: 'P50CS', MAX_CS: 'MaxCS',
    DATA_SIZE: '数据量', ROW_COUNT: '行数', BUCKETS: 'Buckets',
    COMPACT_VERSION: 'CompactVer', VISIBLE_VERSION: 'VisibleVer',
    VISIBLE_VERSION_TIME: '版本时间', REPLICATION_NUM: '副本数', STORAGE_MEDIUM: '存储介质',
  };

  const sortableCols = new Set([
    'DB_NAME', 'TABLE_NAME', 'AVG_CS', 'P50_CS', 'MAX_CS',
    'DATA_SIZE', 'ROW_COUNT', 'BUCKETS', 'COMPACT_VERSION', 'VISIBLE_VERSION', 'REPLICATION_NUM',
  ]);

  const displayCols = getDisplayCols();

  // Frozen columns (first 2 data columns: DB_NAME, TABLE_NAME)
  const frozenCount = 2;
  const frozenCols = displayCols.slice(0, frozenCount);
  const scrollCols = displayCols.slice(frozenCount);
  const stickyWidths = [44, 120, 160];

  function getStickyLeft(colIdx: number): number {
    let left = 0;
    for (let i = 0; i < colIdx; i++) left += stickyWidths[i] || 120;
    return left;
  }

  const stickyTd = (idx: number): React.CSSProperties => ({
    position: 'sticky', left: getStickyLeft(idx), zIndex: 2,
    backgroundColor: 'var(--bg-elevated)',
  });

  const stickyTh = (idx: number): React.CSSProperties => ({
    position: 'sticky', left: getStickyLeft(idx), zIndex: 3,
    backgroundColor: 'var(--bg-secondary)',
  });

  return (
    <>
      <PageHeader
        title="合并诊断"
        breadcrumb={[
          { label: '集群运维' },
          { label: '高级诊断', href: '/show-proc' },
          { label: '合并诊断' },
        ]}
        description="查看各分区 Compaction Score，识别需要合并优化的分区"
      />

      <div className="page-body">
        <ErrorBanner error={error} />

        {/* Toolbar — same pattern as materialized-views page */}
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={15} className="table-search-icon" />
            <input
              placeholder="搜索表名、分区..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '160px', flexShrink: 0 }}>
              <SearchableSelect
                value={dbFilter}
                onChange={v => handleDbFilter(v)}
                options={[
                  { label: '全部数据库', value: '' },
                  ...dbList.map(db => ({ label: db, value: db })),
                ]}
                placeholder="全部数据库"
                searchPlaceholder="搜索数据库..."
              />
            </div>
          </div>
          <div className="toolbar-actions">
            <CommandLogButton source="compaction-score" title="合并诊断" />
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={filteredRows.length === 0}
            >
              <Download size={16} /> 导出
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => fetchData(false)}
              disabled={isLoading}
            >
              <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? '刷新中...' : '刷新'}
            </button>
          </div>
        </div>

        {/* Table */}
        {initialLoading ? (
          <div className="loading-overlay"><div className="spinner" /> 加载中...</div>
        ) : rows.length === 0 && !refreshing ? (
          <div className="empty-state">
            <HardDriveDownload size={48} />
            <div className="empty-state-text">暂无合并诊断数据</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              仅存算分离集群支持此功能
            </div>
          </div>
        ) : (
          <div className="table-container fade-in" ref={tableRef} style={{ position: 'relative' }}>
            {/* Refresh overlay (prevents jitter by keeping table in place) */}
            {refreshing && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                backgroundColor: 'var(--bg-elevated)', opacity: 0.6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div className="spinner" />
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ ...stickyTh(0), width: `${stickyWidths[0]}px`, textAlign: 'center', minWidth: `${stickyWidths[0]}px` }}>#</th>
                    {frozenCols.map((col, i) => (
                      <th
                        key={col}
                        style={{
                          ...stickyTh(i + 1),
                          whiteSpace: 'nowrap',
                          minWidth: `${stickyWidths[i + 1]}px`,
                          cursor: sortableCols.has(col) ? 'pointer' : undefined,
                          userSelect: 'none',
                          borderRight: i === frozenCount - 1 ? '2px solid var(--border-secondary)' : undefined,
                        }}
                        onClick={sortableCols.has(col) ? () => handleSort(col) : undefined}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {colLabels[col] || col}
                          {sortableCols.has(col) && (
                            <ArrowUpDown size={11} style={{
                              color: orderBy === col ? 'var(--primary-600)' : 'var(--text-quaternary)',
                              transform: orderBy === col && order === 'asc' ? 'scaleY(-1)' : undefined,
                            }} />
                          )}
                        </span>
                      </th>
                    ))}
                    {scrollCols.map(col => (
                      <th
                        key={col}
                        style={{
                          whiteSpace: 'nowrap',
                          cursor: sortableCols.has(col) ? 'pointer' : undefined,
                          userSelect: 'none',
                        }}
                        onClick={sortableCols.has(col) ? () => handleSort(col) : undefined}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {colLabels[col] || col}
                          {sortableCols.has(col) && (
                            <ArrowUpDown size={11} style={{
                              color: orderBy === col ? 'var(--primary-600)' : 'var(--text-quaternary)',
                              transform: orderBy === col && order === 'asc' ? 'scaleY(-1)' : undefined,
                            }} />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ ...stickyTd(0), textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.78rem', minWidth: `${stickyWidths[0]}px` }}>
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      {frozenCols.map((col, i) => (
                        <td
                          key={col}
                          style={{
                            ...stickyTd(i + 1),
                            whiteSpace: 'nowrap',
                            minWidth: `${stickyWidths[i + 1]}px`,
                            borderRight: i === frozenCount - 1 ? '2px solid var(--border-secondary)' : undefined,
                          }}
                        >
                          {formatCell(col, row[col])}
                        </td>
                      ))}
                      {scrollCols.map(col => (
                        <td key={col} style={{ whiteSpace: 'nowrap' }}>
                          {formatCell(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer — same layout as databases page */}
            <div className="table-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>
                  共 <strong style={{ color: 'var(--text-secondary)' }}>{totalRows.toLocaleString()}</strong> 个分区
                  {search && ` (当前页过滤: ${filteredRows.length} / ${rows.length})`}
                </span>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalItems={totalRows}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
