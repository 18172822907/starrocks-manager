'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SingleSelectProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
  multiValue?: never;
  onMultiChange?: never;
}

interface MultiSelectProps {
  multiple: true;
  multiValue: Set<string>;
  onMultiChange: (values: Set<string>) => void;
  value?: never;
  onChange?: never;
}

type SearchableSelectProps = (SingleSelectProps | MultiSelectProps) & {
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  searchThreshold?: number;
};

export default function SearchableSelect(props: SearchableSelectProps) {
  const {
    options,
    placeholder = '请选择...',
    searchPlaceholder = '搜索...',
    disabled = false,
    searchThreshold = 6,
    multiple = false,
  } = props;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    document.addEventListener('scroll', handler, true);
    return () => document.removeEventListener('scroll', handler, true);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase()) ||
    opt.value.toLowerCase().includes(query.toLowerCase())
  );

  const showSearch = options.length >= searchThreshold;

  // Single-select helpers
  const singleValue = multiple ? '' : (props as SingleSelectProps).value;
  const singleOnChange = multiple ? undefined : (props as SingleSelectProps).onChange;

  // Multi-select helpers
  const multiValue = multiple ? (props as MultiSelectProps).multiValue : new Set<string>();
  const multiOnChange = multiple ? (props as MultiSelectProps).onMultiChange : undefined;

  const isSelected = useCallback((val: string) => {
    return multiple ? multiValue.has(val) : singleValue === val;
  }, [multiple, multiValue, singleValue]);

  const handleSelect = useCallback((val: string) => {
    if (multiple && multiOnChange) {
      const next = new Set(multiValue);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      multiOnChange(next);
      // Don't close on multi-select
    } else if (singleOnChange) {
      singleOnChange(val);
      setOpen(false);
      setQuery('');
    }
  }, [multiple, multiValue, multiOnChange, singleOnChange]);

  // Display text for trigger
  let displayText = '';
  if (multiple) {
    const count = multiValue.size;
    if (count === 0) displayText = '';
    else if (count <= 2) {
      displayText = Array.from(multiValue).map(v => options.find(o => o.value === v)?.label || v).join(', ');
    } else {
      displayText = `已选 ${count} 项`;
    }
  } else {
    displayText = options.find(o => o.value === singleValue)?.label || '';
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className="ss-dropdown"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 10000,
      }}
    >
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
      {multiple && multiValue.size > 0 && (
        <div className="ss-multi-bar">
          <span>已选 {multiValue.size} 项</span>
          <button className="ss-clear-all" onClick={() => multiOnChange?.(new Set())}>清空</button>
        </div>
      )}
      <div className="ss-list">
        {filtered.length === 0 ? (
          <div className="ss-empty">无匹配项</div>
        ) : (
          filtered.map(opt => (
            <div
              key={opt.value}
              className={`ss-option${isSelected(opt.value) ? ' ss-selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {multiple && (
                <span className={`ss-checkbox${isSelected(opt.value) ? ' ss-checked' : ''}`}>
                  {isSelected(opt.value) && <Check size={11} />}
                </span>
              )}
              <span className="ss-option-label">{opt.label}</span>
              {!multiple && isSelected(opt.value) && <Check size={14} className="ss-check" />}
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="ss-container">
      <button
        ref={triggerRef}
        type="button"
        className={`ss-trigger${open ? ' ss-open' : ''}${disabled ? ' ss-disabled' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className={`ss-value${!displayText ? ' ss-placeholder' : ''}`}>
          {displayText || placeholder}
        </span>
        <ChevronDown size={14} className={`ss-chevron${open ? ' ss-rotated' : ''}`} />
      </button>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}
