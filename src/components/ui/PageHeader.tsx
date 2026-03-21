'use client';

import React, { ReactNode, useState } from 'react';
import { RefreshCw, ClipboardList } from 'lucide-react';
import { CommandLogModal } from './CommandLogModal';
import Breadcrumb, { BreadcrumbItem } from '@/components/Breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  actions?: ReactNode;
  logSource?: string;
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({ title, description, onRefresh, refreshing, loading, actions, logSource, breadcrumb }: PageHeaderProps) {
  const [showLog, setShowLog] = useState(false);

  return (
    <>
      <div className="page-header">
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>
          <div className="flex gap-2">
            {logSource && (
              <button className="btn btn-secondary" onClick={() => setShowLog(true)} title="查看执行记录">
                <ClipboardList size={16} />
                执行记录
              </button>
            )}
            {onRefresh && (
              <button className="btn btn-secondary" onClick={onRefresh} disabled={loading || refreshing}>
                <RefreshCw size={16} style={{ animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none' }} />
                {refreshing ? '刷新中...' : '刷新'}
              </button>
            )}
            {actions}
          </div>
        </div>
      </div>
      {logSource && (
        <CommandLogModal
          open={showLog}
          onClose={() => setShowLog(false)}
          source={logSource}
          title={`${title} · 执行记录`}
        />
      )}
    </>
  );
}
