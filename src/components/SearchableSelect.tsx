'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Min items before search input is shown (default: 6) */
  searchThreshold?: number;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索...',
  disabled = false,
  searchThreshold = 6,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase()) ||
    opt.value.toLowerCase().includes(query.toLowerCase())
  );

  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const showSearch = options.length >= searchThreshold;

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  return (
    <div className="ss-container" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        className={`ss-trigger${open ? ' ss-open' : ''}${disabled ? ' ss-disabled' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className={`ss-value${!value ? ' ss-placeholder' : ''}`}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown size={14} className={`ss-chevron${open ? ' ss-rotated' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="ss-dropdown">
          {showSearch && (
            <div className="ss-search-wrap">
              <Search size={13} className="ss-search-icon" />
              <input
                ref={inputRef}
                className="ss-search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
              />
              {query && (
                <button className="ss-clear" onClick={() => setQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <div className="ss-list">
            {filtered.length === 0 ? (
              <div className="ss-empty">无匹配项</div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  className={`ss-option${opt.value === value ? ' ss-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className="ss-option-label">{opt.label}</span>
                  {opt.value === value && <Check size={14} className="ss-check" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
