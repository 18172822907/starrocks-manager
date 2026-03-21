'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useDataFetch } from '@/hooks/useDataFetch';
import { usePagination } from '@/hooks/usePagination';
import { str } from '@/lib/utils';
import { PageHeader, StatusBadge, DatabaseBadge, SearchToolbar, DataTable, ErrorBanner, SuccessToast, CacheTimeBadge } from '@/components/ui';
import { ListChecks } from 'lucide-react';

export default function TaskRunsPage() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const { data: runs, loading, refreshing, error, success, cachedAt, fromCache, refresh } = useDataFetch(
    {
      url: (sid, isRefresh) => `/api/tasks?sessionId=${encodeURIComponent(sid)}&type=task_runs${isRefresh ? '&refresh=true' : ''}`,
      extract: json => (json.runs || []) as Record<string, unknown>[],
    },
    [] as Record<string, unknown>[]
  );

  const allStates = Array.from(new Set(runs.map(r => str(r['STATE'] || r['State'] || '')))).filter(Boolean).sort();

  const filtered = runs.filter(r => {
    const name = str(r['TASK_NAME'] || r['TaskName'] || '').toLowerCase();
    const state = str(r['STATE'] || r['State'] || '');
    const matchSearch = name.includes(search.toLowerCase()) || state.toLowerCase().includes(search.toLowerCase());
    const matchState = stateFilter === 'all' || state === stateFilter;
    return matchSearch && matchState;
  });

  const pg = usePagination(filtered);
  useEffect(() => { pg.resetPage(); }, [search, stateFilter]);

  return (
    <>
      <PageHeader title="Task Runs" breadcrumb={[{ label: '任务管理' }, { label: 'Task Runs' }]} description={<>查看任务运行记录 · {runs.length} 条记录<CacheTimeBadge cachedAt={cachedAt} fromCache={fromCache} /></>}
        onRefresh={() => refresh(true)} refreshing={refreshing} loading={loading} logSource="tasks" />
      <div className="page-body">
        <ErrorBanner error={error} />
        <SuccessToast message={success} />
        <SearchToolbar search={search} onSearch={setSearch} placeholder="搜索任务名..."
          filters={{ value: stateFilter, onChange: setStateFilter, options: allStates.map(s => ({ value: s, label: s })) }}
        />
        <DataTable loading={loading} empty={filtered.length === 0} emptyIcon={<ListChecks size={48} />}
          emptyText={search || stateFilter !== 'all' ? '没有匹配的记录' : '暂无运行记录'}
          footerLeft={<>共 <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> 条记录</>}
          footerRight="SELECT * FROM information_schema.task_runs"
          pagination={{ page: pg.page, pageSize: pg.pageSize, totalPages: pg.totalPages, totalItems: pg.totalItems, onPageChange: pg.setPage, onPageSizeChange: pg.setPageSize }}>
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
            {pg.paginatedData.map((r, idx) => {
              const globalIdx = (pg.page - 1) * pg.pageSize + idx;
              const name = str(r['TASK_NAME'] || r['TaskName'] || '');
              const state = str(r['STATE'] || r['State'] || '');
              const start = str(r['CREATE_TIME'] || r['CreateTime'] || '');
              const end = str(r['FINISH_TIME'] || r['FinishTime'] || '');
              const duration = str(r['DURATION'] || r['Duration'] || '');
              const db = str(r['DATABASE'] || r['DbName'] || '');
              const errorMsg = str(r['ERROR_MESSAGE'] || r['ErrorMessage'] || '');

              return (
                <tr key={globalIdx}>
                  <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>{globalIdx + 1}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(234,179,8,0.08)', color: 'var(--warning-600)', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ListChecks size={13} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{name}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={state} /></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{start}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{end || '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{duration || '—'}</td>
                  <td><DatabaseBadge name={db} /></td>
                  <td>
                    {errorMsg ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--danger-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={errorMsg}>{errorMsg}</div>
                    ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}
