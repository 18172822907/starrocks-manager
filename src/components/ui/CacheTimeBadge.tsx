import React from 'react';
import { Clock } from 'lucide-react';

interface CacheTimeBadgeProps {
  cachedAt: string;
  fromCache: boolean;
}

export function CacheTimeBadge({ cachedAt, fromCache }: CacheTimeBadgeProps) {
  if (!cachedAt) return null;
  const ts = new Date(cachedAt).toLocaleString('zh-CN', { hour12: false });
  return (
    <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Clock size={11} /> {fromCache ? '缓存时间：' : '刷新时间：'}{ts}
      {fromCache && <span style={{ marginLeft: '4px', padding: '1px 6px', borderRadius: '999px', fontSize: '0.68rem', backgroundColor: 'rgba(234,179,8,0.12)', color: 'var(--warning-600)', fontWeight: 600 }}>CACHE</span>}
    </span>
  );
}
