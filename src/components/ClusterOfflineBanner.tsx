'use client';

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * Banner displayed when the active cluster is unreachable.
 * Blocks the page content area and offers a retry button.
 */
export default function ClusterOfflineBanner({ onRetry, retrying }: Props) {
  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(239,68,68,0.2)',
      background: 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(239,68,68,0.08) 100%)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: 'rgba(239,68,68,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <WifiOff size={22} style={{ color: 'var(--danger-500)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--danger-500)', marginBottom: '4px' }}>
          集群连接不可用
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          无法连接到集群，数据查询已暂停。集群恢复后将自动重新连接。
        </div>
      </div>
      {onRetry && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          disabled={retrying}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <RefreshCw size={14} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
          {retrying ? '检测中...' : '重试连接'}
        </button>
      )}
    </div>
  );
}
