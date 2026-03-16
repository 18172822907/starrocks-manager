'use client';

import React, { useState, useMemo } from 'react';

// SQL keywords to highlight
const SQL_KEYWORDS = new Set([
  'CREATE', 'EXTERNAL', 'CATALOG', 'DROP', 'ALTER', 'TABLE', 'DATABASE',
  'PROPERTIES', 'COMMENT', 'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO',
  'VALUES', 'UPDATE', 'DELETE', 'SET', 'SHOW', 'GRANT', 'REVOKE', 'ON',
  'TO', 'ALL', 'IN', 'AS', 'IF', 'NOT', 'EXISTS', 'OR', 'AND', 'REPLACE',
  'WITH', 'LIKE', 'PARTITION', 'BY', 'ORDER', 'GROUP', 'HAVING', 'LIMIT',
  'OFFSET', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
  'UNION', 'EXCEPT', 'INTERSECT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'NULL', 'TRUE', 'FALSE', 'DEFAULT', 'PRIMARY', 'KEY', 'INDEX', 'UNIQUE',
  'CHECK', 'CONSTRAINT', 'FOREIGN', 'REFERENCES', 'CASCADE', 'RESTRICT',
  'ROLE', 'USER', 'USAGE', 'TABLES', 'DATABASES', 'SCHEMA',
  'MATERIALIZED', 'VIEW', 'REFRESH', 'ASYNC', 'EVERY', 'INTERVAL',
  'DISTRIBUTED', 'HASH', 'BUCKETS', 'AGGREGATE', 'DUPLICATE', 'RANGE',
  'SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'BETWEEN',
  'IS', 'OVER', 'ROWS', 'PRECEDING', 'FOLLOWING', 'UNBOUNDED', 'CURRENT',
  'ROW', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD',
  'COALESCE', 'IFNULL', 'NULLIF', 'CAST', 'CONVERT',
  'DATE', 'DATETIME', 'TIMESTAMP', 'INT', 'BIGINT', 'VARCHAR', 'CHAR',
  'DOUBLE', 'FLOAT', 'DECIMAL', 'BOOLEAN', 'TINYINT', 'SMALLINT',
  'ENGINE', 'USING', 'ENABLE', 'DISABLE', 'ACTIVE', 'INACTIVE',
  'ASC', 'DESC', 'TEMPORARY', 'FUNCTION', 'RETURNS', 'RETURN',
  'BEGIN', 'DECLARE', 'CALL', 'PROCEDURE', 'TRIGGER',
]);

// Major clause keywords that should start a new line
const NEWLINE_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'JOIN',
  'UNION', 'EXCEPT', 'INTERSECT', 'SET', 'VALUES', 'INTO',
  'PARTITION', 'DISTRIBUTED', 'REFRESH', 'PROPERTIES', 'COMMENT',
  'ON', 'USING', 'WHEN', 'THEN', 'ELSE', 'END', 'CASE',
  'AND', 'OR',
]);

// Keywords that increase indent
const INDENT_INCREASE = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING',
  'CASE', 'WHEN',
]);

// Keywords that decrease indent (relative to parent)
const INDENT_DECREASE = new Set([
  'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT',
  'END',
]);

interface SqlHighlighterProps {
  sql: string;
  style?: React.CSSProperties;
  showLineNumbers?: boolean;
  showFormatToggle?: boolean;
  maxHeight?: string;
}

export default function SqlHighlighter({
  sql,
  style,
  showLineNumbers = true,
  showFormatToggle = true,
  maxHeight = '500px',
}: SqlHighlighterProps) {
  const [formatted, setFormatted] = useState(true);

  const displaySql = useMemo(() => {
    return formatted ? formatSql(sql) : sql;
  }, [sql, formatted]);

  const lines = displaySql.split('\n');
  const tokens = useMemo(() => tokenize(displaySql), [displaySql]);

  // Build line→tokens mapping for line-by-line rendering
  const lineTokens = useMemo(() => {
    const result: Token[][] = [];
    let currentLine: Token[] = [];

    for (const token of tokens) {
      if (token.type === 'whitespace' && token.value.includes('\n')) {
        // Split whitespace token on newlines
        const parts = token.value.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            currentLine.push({ type: 'whitespace', value: parts[i] });
          }
          if (i < parts.length - 1) {
            result.push(currentLine);
            currentLine = [];
          }
        }
      } else {
        currentLine.push(token);
      }
    }
    if (currentLine.length > 0) result.push(currentLine);
    return result;
  }, [tokens]);

  const lineNumWidth = String(lines.length).length;
  const gutterWidth = Math.max(lineNumWidth * 9 + 16, 36);

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Toolbar */}
      {showFormatToggle && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '4px',
          padding: '6px 10px',
          backgroundColor: '#181825',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={() => setFormatted(f => !f)}
            style={{
              padding: '3px 10px', borderRadius: '4px', fontSize: '0.72rem',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: formatted ? 'rgba(203,166,247,0.15)' : 'transparent',
              color: formatted ? '#cba6f7' : '#6c7086',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            {formatted ? '已美化' : '美化 SQL'}
          </button>
        </div>
      )}

      {/* Code area with line numbers */}
      <pre style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#1e1e2e',
        borderRadius: showFormatToggle ? '0 0 var(--radius-md) var(--radius-md)' : 'var(--radius-md)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: showFormatToggle ? 'none' : undefined,
        fontSize: '0.8rem',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#cdd6f4',
        maxHeight,
        overflowY: 'auto',
        overflowX: 'auto',
        lineHeight: 1.7,
        display: 'flex',
      }}>
        {/* Line numbers gutter */}
        {showLineNumbers && (
          <div
            aria-hidden="true"
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              width: `${gutterWidth}px`,
              minWidth: `${gutterWidth}px`,
              paddingTop: '14px',
              paddingBottom: '14px',
              backgroundColor: '#181825',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'right',
              color: '#45475a',
              userSelect: 'none',
              fontSize: '0.72rem',
              flexShrink: 0,
            }}
          >
            {lineTokens.map((_, i) => (
              <div key={i} style={{ paddingRight: '10px', height: `${1.7 * 0.8}rem` }}>
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code content */}
        <code style={{
          display: 'block',
          padding: '14px 16px',
          whiteSpace: 'pre',
          flex: 1,
          minWidth: 0,
        }}>
          {lineTokens.map((lineToks, lineIdx) => (
            <div key={lineIdx} style={{ height: `${1.7 * 0.8}rem`, display: 'flex', alignItems: 'center' }}>
              {lineToks.length === 0 ? '\u00A0' : lineToks.map((token, i) => (
                <span key={i} style={getTokenStyle(token.type)}>
                  {token.value}
                </span>
              ))}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// ==================== SQL Formatter ====================

function formatSql(raw: string): string {
  if (!raw || !raw.trim()) return raw;

  // Normalize whitespace first
  let sql = raw.replace(/\r\n/g, '\n').replace(/\t/g, '  ');

  // Tokenize into words, strings, punctuation etc for formatting
  const fmtTokens = tokenizeForFormat(sql);
  const result: string[] = [];
  let indent = 0;
  let lineStart = true;
  let parenDepth = 0;
  const indentStr = '  ';
  let prevToken = '';
  let afterSelect = false;

  for (let i = 0; i < fmtTokens.length; i++) {
    const tok = fmtTokens[i];
    const upper = tok.toUpperCase();
    const nextTok = i + 1 < fmtTokens.length ? fmtTokens[i + 1].toUpperCase() : '';

    // Skip pure whitespace tokens
    if (/^\s+$/.test(tok)) {
      if (!lineStart && result.length > 0) {
        // Preserve at most one space
        const last = result[result.length - 1];
        if (last && !last.endsWith(' ') && !last.endsWith('\n')) {
          result.push(' ');
        }
      }
      continue;
    }

    // Handle opening paren
    if (tok === '(') {
      if (!lineStart) result.push(' ');
      result.push('(');
      parenDepth++;
      // check if it's a function paren or subquery
      if (nextTok === 'SELECT') {
        result.push('\n');
        indent++;
        result.push(indentStr.repeat(indent));
        lineStart = true;
      }
      continue;
    }

    // Handle closing paren
    if (tok === ')') {
      if (parenDepth > 0) parenDepth--;
      // if the indent was increased for subquery, decrease
      const prevNonWs = prevToken.toUpperCase();
      if (indent > 0 && (prevNonWs === '' || !['('].includes(prevNonWs))) {
        // Check if this closes a subquery
        const lookback = result.join('').trim();
        if (lookback.includes('SELECT')) {
          indent = Math.max(0, indent - 1);
          result.push('\n');
          result.push(indentStr.repeat(indent));
        }
      }
      result.push(')');
      lineStart = false;
      prevToken = tok;
      continue;
    }

    // Handle commas - new line after comma in SELECT clause
    if (tok === ',') {
      result.push(',');
      if (afterSelect && parenDepth === 0) {
        result.push('\n');
        result.push(indentStr.repeat(indent + 1));
        lineStart = true;
      }
      prevToken = tok;
      continue;
    }

    // Handle semicolons
    if (tok === ';') {
      result.push(';\n');
      indent = 0;
      lineStart = true;
      afterSelect = false;
      prevToken = tok;
      continue;
    }

    // Major SQL keywords that start new lines
    if (NEWLINE_KEYWORDS.has(upper) && parenDepth === 0) {
      // Special handling for compound keywords: GROUP BY, ORDER BY, LEFT JOIN etc
      if ((upper === 'BY' && (prevToken.toUpperCase() === 'GROUP' || prevToken.toUpperCase() === 'ORDER' || prevToken.toUpperCase() === 'PARTITION' || prevToken.toUpperCase() === 'DISTRIBUTED'))) {
        result.push(' ');
        result.push(tok);
        prevToken = tok;
        lineStart = false;
        continue;
      }

      if ((upper === 'JOIN') && ['LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS'].includes(prevToken.toUpperCase())) {
        result.push(' ');
        result.push(tok);
        prevToken = tok;
        lineStart = false;
        continue;
      }

      if (upper === 'OUTER' && ['LEFT', 'RIGHT', 'FULL'].includes(prevToken.toUpperCase())) {
        result.push(' ');
        result.push(tok);
        prevToken = tok;
        lineStart = false;
        continue;
      }

      // Start new line for major clauses
      if (INDENT_DECREASE.has(upper)) {
        indent = Math.max(0, indent > 0 ? indent - 1 : 0);
      }

      if (!lineStart) {
        result.push('\n');
      }
      result.push(indentStr.repeat(indent));
      result.push(tok);
      lineStart = false;

      if (upper === 'SELECT') {
        afterSelect = true;
        indent = Math.max(indent, 0);
      } else if (['FROM', 'WHERE', 'SET'].includes(upper)) {
        afterSelect = false;
      }

      if (INDENT_INCREASE.has(upper)) {
        // indent will apply for the next content
      }

      prevToken = tok;
      continue;
    }

    // Regular tokens
    if (!lineStart) {
      result.push(' ');
    }
    result.push(tok);
    lineStart = false;
    prevToken = tok;
  }

  let formatted = result.join('');

  // Clean up: remove trailing spaces on lines, collapse multiple blank lines
  formatted = formatted
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return formatted;
}

function tokenizeForFormat(sql: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < sql.length) {
    // Whitespace
    if (/\s/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // String literals
    if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i];
      let j = i + 1;
      while (j < sql.length && sql[j] !== quote) {
        if (sql[j] === '\\') j++;
        j++;
      }
      j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Backtick identifiers
    if (sql[i] === '`') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '`') j++;
      j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Comments --
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Block comments
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === '*' && sql[j + 1] === '/')) j++;
      j += 2;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Punctuation
    if ('(),;.'.includes(sql[i])) {
      tokens.push(sql[i]);
      i++;
      continue;
    }

    // Operators
    if ('=<>!+-*/%'.includes(sql[i])) {
      let j = i;
      while (j < sql.length && '=<>!+-*/%'.includes(sql[j])) j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Words
    if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[\d.]/.test(sql[j])) j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }

    // Catch-all
    tokens.push(sql[i]);
    i++;
  }

  return tokens;
}

// ==================== Syntax Highlighter ====================

type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'operator' | 'punctuation' | 'identifier' | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    // Whitespace
    if (/\s/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      tokens.push({ type: 'whitespace', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Single-line comment --
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Block comment /* */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === '*' && sql[j + 1] === '/')) j++;
      j += 2;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // String (single or double quotes)
    if (sql[i] === '"' || sql[i] === "'") {
      const quote = sql[i];
      let j = i + 1;
      while (j < sql.length && sql[j] !== quote) {
        if (sql[j] === '\\') j++;
        j++;
      }
      j++; // closing quote
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Backtick identifiers
    if (sql[i] === '`') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '`') j++;
      j++;
      tokens.push({ type: 'identifier', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[\d.]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Words (keywords or identifiers)
    if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const type = SQL_KEYWORDS.has(word.toUpperCase()) ? 'keyword' : 'identifier';
      tokens.push({ type, value: word });
      i = j;
      continue;
    }

    // Operators & punctuation
    if ('=<>!+-*/%'.includes(sql[i])) {
      tokens.push({ type: 'operator', value: sql[i] });
      i++;
      continue;
    }

    if ('(),;.'.includes(sql[i])) {
      tokens.push({ type: 'punctuation', value: sql[i] });
      i++;
      continue;
    }

    // Catch-all
    tokens.push({ type: 'identifier', value: sql[i] });
    i++;
  }

  return tokens;
}

function getTokenStyle(type: TokenType): React.CSSProperties {
  switch (type) {
    case 'keyword':
      return { color: '#cba6f7', fontWeight: 600 }; // purple
    case 'string':
      return { color: '#a6e3a1' }; // green
    case 'number':
      return { color: '#fab387' }; // orange
    case 'comment':
      return { color: '#6c7086', fontStyle: 'italic' }; // gray
    case 'operator':
      return { color: '#89dceb' }; // cyan
    case 'punctuation':
      return { color: '#9399b2' }; // gray-blue
    case 'identifier':
      return { color: '#cdd6f4' }; // default light
    default:
      return {};
  }
}
