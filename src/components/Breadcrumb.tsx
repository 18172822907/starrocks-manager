'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.78rem',
        marginBottom: '2px',
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const iconEl = item.icon ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px', opacity: 0.7 }}>
            {item.icon}
          </span>
        ) : null;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <ChevronRight
                size={13}
                style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
              />
            )}
            {isLast || !item.href ? (
              <span
                style={{
                  color: isLast ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: isLast ? 600 : 400,
                  maxWidth: '280px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {iconEl}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                style={{
                  color: 'var(--primary-600)',
                  textDecoration: 'none',
                  fontWeight: 400,
                  maxWidth: '280px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-700)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--primary-600)')}
              >
                {iconEl}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
