'use client';

import React, { useState } from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import {
  Palette,
  Type,
  MousePointer2,
  Table2,
  LayoutGrid,
  Layers,
  Search,
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  Play,
  Edit3,
  UserPlus,
  Trash2,
} from 'lucide-react';

/* ---- helpers ---- */
function CopyHex({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      onClick={copy}
      className="btn-ghost btn-icon"
      title="复制色值"
      style={{ padding: 2, marginLeft: 4, verticalAlign: 'middle' }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

/* ---- Color Swatch ---- */
function ColorSwatch({ name, cssVar, hex, desc }: { name: string; cssVar: string; hex: string; desc?: string }) {
  return (
    <div className="ds-swatch">
      <div className="ds-swatch-color" style={{ backgroundColor: hex }} />
      <div className="ds-swatch-info">
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {name}
          <CopyHex value={hex} />
        </div>
        <div className="text-xs text-secondary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {cssVar}
        </div>
        <div className="text-xs text-secondary">{hex}</div>
        {desc && <div className="text-xs text-secondary" style={{ marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  );
}

/* ---- Section Anchor ---- */
function Section({ id, icon: Icon, title, desc, children }: {
  id: string; icon: React.ElementType; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="ds-section">
      <div className="ds-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ds-section-icon"><Icon size={18} /></div>
          <div>
            <h2 className="ds-section-title">{title}</h2>
            <p className="ds-section-desc">{desc}</p>
          </div>
        </div>
      </div>
      <div className="ds-section-body">{children}</div>
    </section>
  );
}

/* ---- sub-card ---- */
function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ds-sub-card">
      <h4 className="ds-sub-card-title">{title}</h4>
      {children}
    </div>
  );
}

/* ============================== PAGE ============================== */
export default function DesignSystemPage() {
  const [activeSection, setActiveSection] = useState('colors');

  const toc = [
    { id: 'colors', icon: Palette, label: '色彩体系' },
    { id: 'typography', icon: Type, label: '文字排版' },
    { id: 'components', icon: MousePointer2, label: '组件库' },
    { id: 'table', icon: Table2, label: '表格样式' },
    { id: 'layout', icon: LayoutGrid, label: '布局 & 间距' },
    { id: 'elevation', icon: Layers, label: '阴影 & 圆角' },
  ];

  return (
    <>
      <div className="page-header">
        <Breadcrumb items={[{ label: '系统管理' }, { label: 'UI 规范' }]} />
        <div className="page-header-row">
          <div>
            <h1 className="page-title">UI 设计规范</h1>
            <p className="page-description">StarRocks Manager Design System — 前端开发样式参考手册</p>
          </div>
        </div>
        {/* quick nav */}
        <div className="ds-toc">
          {toc.map((t) => {
            const Icon = t.icon;
            return (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`ds-toc-item ${activeSection === t.id ? 'active' : ''}`}
                onClick={() => setActiveSection(t.id)}
              >
                <Icon size={14} />
                {t.label}
              </a>
            );
          })}
        </div>
      </div>

      <div className="page-body" style={{ paddingBottom: 60 }}>
        {/* ===== 1. Color Palette ===== */}
        <Section id="colors" icon={Palette} title="色彩体系 Color Palette" desc="基于语义变量的色彩系统，自动支持浅/深色主题">
          <SubCard title="主色 Primary">
            <div className="ds-swatches">
              <ColorSwatch name="Primary 400" cssVar="--primary-400" hex="#60a5fa" desc="辅助/Hover" />
              <ColorSwatch name="Primary 500" cssVar="--primary-500" hex="#3b82f6" desc="主操作按钮 / 激活态" />
              <ColorSwatch name="Primary 600" cssVar="--primary-600" hex="#2563eb" desc="链接 / 深色强调" />
              <ColorSwatch name="Primary 700" cssVar="--primary-700" hex="#1d4ed8" desc="按钮 Pressed" />
            </div>
          </SubCard>

          <SubCard title="强调色 Accent">
            <div className="ds-swatches">
              <ColorSwatch name="Accent 400" cssVar="--accent-400" hex="#a78bfa" />
              <ColorSwatch name="Accent 500" cssVar="--accent-500" hex="#8b5cf6" desc="品牌标识 / Logo 渐变" />
              <ColorSwatch name="Accent 600" cssVar="--accent-600" hex="#7c3aed" />
            </div>
          </SubCard>

          <SubCard title="语义色 Semantic">
            <div className="ds-swatches">
              <ColorSwatch name="Success 500" cssVar="--success-500" hex="#22c55e" desc="在线 / 成功" />
              <ColorSwatch name="Warning 500" cssVar="--warning-500" hex="#eab308" desc="警告" />
              <ColorSwatch name="Danger 500" cssVar="--danger-500" hex="#ef4444" desc="错误 / 离线 / 删除" />
            </div>
          </SubCard>

          <SubCard title="中性色 Neutral">
            <div className="ds-swatches">
              <ColorSwatch name="Gray 50" cssVar="--gray-50" hex="#f8fafc" desc="页面背景" />
              <ColorSwatch name="Gray 100" cssVar="--gray-100" hex="#f1f5f9" desc="次级背景" />
              <ColorSwatch name="Gray 200" cssVar="--gray-200" hex="#e2e8f0" desc="主边框" />
              <ColorSwatch name="Gray 400" cssVar="--gray-400" hex="#94a3b8" desc="占位文字" />
              <ColorSwatch name="Gray 600" cssVar="--gray-600" hex="#475569" desc="次级文字" />
              <ColorSwatch name="Gray 900" cssVar="--gray-900" hex="#0f172a" desc="主文字" />
            </div>
          </SubCard>
        </Section>

        {/* ===== 2. Typography ===== */}
        <Section id="typography" icon={Type} title="文字排版 Typography" desc="统一使用 Inter + JetBrains Mono，确保中英文混排美观">
          <SubCard title="字体家族 Font Family">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="text-xs text-secondary" style={{ marginBottom: 4, fontWeight: 600 }}>Sans-serif（正文）</div>
                <div style={{ fontSize: '0.9rem' }}>
                  &apos;Inter&apos;, -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, sans-serif
                </div>
              </div>
              <div>
                <div className="text-xs text-secondary" style={{ marginBottom: 4, fontWeight: 600 }}>Monospace（代码 / 数据）</div>
                <div style={{ fontSize: '0.9rem', fontFamily: "'JetBrains Mono', monospace" }}>
                  &apos;JetBrains Mono&apos;, &apos;Fira Code&apos;, Consolas, monospace
                </div>
              </div>
            </div>
          </SubCard>

          <SubCard title="标题层级 Headings">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="ds-typo-row">
                <div className="ds-typo-label">H1 · page-title</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>Cluster Overview / 集群概览</div>
                <div className="ds-typo-spec">1.35rem / 700</div>
              </div>
              <div className="ds-typo-row">
                <div className="ds-typo-label">H2 · card-title</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>Frontend 节点</div>
                <div className="ds-typo-spec">1rem / 600</div>
              </div>
              <div className="ds-typo-row">
                <div className="ds-typo-label">H3 · nav-section-label</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>数据管理</div>
                <div className="ds-typo-spec">0.68rem / 600 / uppercase</div>
              </div>
            </div>
          </SubCard>

          <SubCard title="正文 & 辅助 Body / Detail">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ds-typo-row">
                <div className="ds-typo-label">正文 Body</div>
                <div style={{ fontSize: '0.9rem' }}>默认正文样式 Body Text Default</div>
                <div className="ds-typo-spec">0.85–0.9rem / 400–500</div>
              </div>
              <div className="ds-typo-row">
                <div className="ds-typo-label">小号 Small</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>辅助信息 / 次要说明</div>
                <div className="ds-typo-spec">0.75–0.78rem / 400</div>
              </div>
              <div className="ds-typo-row">
                <div className="ds-typo-label">Monospace</div>
                <div className="text-mono" style={{ fontSize: '0.85rem' }}>SELECT * FROM table WHERE id = 1;</div>
                <div className="ds-typo-spec">0.85rem / JetBrains Mono</div>
              </div>
            </div>
          </SubCard>
        </Section>

        {/* ===== 3. Components ===== */}
        <Section id="components" icon={MousePointer2} title="组件库 Components" desc="按钮、输入框、状态标签等基础组件规范">
          <SubCard title="按钮 Buttons">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              圆角: var(--radius-md) = 8px · 内边距: 8px 16px · 字号: 0.85rem · 过渡: all 0.2s ease
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Primary</span>
                <button className="btn btn-primary"><RefreshCw size={14} /> 刷新</button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Secondary</span>
                <button className="btn btn-secondary">Ghost</button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Danger</span>
                <button className="btn btn-danger">删除</button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Ghost</span>
                <button className="btn btn-ghost">Action</button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Icon-only</span>
                <button className="btn btn-secondary btn-icon"><RefreshCw size={16} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Small</span>
                <button className="btn btn-primary btn-sm">小按钮</button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Disabled</span>
                <button className="btn btn-primary" disabled>禁用</button>
              </div>
            </div>
          </SubCard>

          <SubCard title="表格操作按钮 Action Buttons">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              用于表格行操作 · 28×28px 图标按钮 · 语义色分类 · 悬停提示 (title)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div className="ds-comp-group">
                <span className="ds-comp-label">View</span>
                <button className="btn-action btn-action-view" title="查看"><Eye size={14} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Grant</span>
                <button className="btn-action btn-action-grant" title="授权"><ShieldCheck size={14} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Success</span>
                <button className="btn-action btn-action-success" title="刷新"><Play size={14} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Primary</span>
                <button className="btn-action btn-action-primary" title="编辑"><Edit3 size={14} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Teal</span>
                <button className="btn-action btn-action-teal" title="用户"><UserPlus size={14} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Danger</span>
                <button className="btn-action btn-action-danger" title="删除"><Trash2 size={14} /></button>
              </div>
              <div className="ds-comp-group">
                <span className="ds-comp-label">Disabled</span>
                <button className="btn-action btn-action-danger" disabled title="禁用"><Trash2 size={14} /></button>
              </div>
            </div>
          </SubCard>

          <SubCard title="输入框 Input Fields">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              边框: 1px solid var(--border-primary) · 圆角: var(--radius-md) = 8px · 聚焦: 3px primary ring
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="form-group">
                  <label className="form-label">默认输入框</label>
                  <input className="input" placeholder="请输入..." />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="form-group">
                  <label className="form-label">搜索输入框</label>
                  <div className="search-bar">
                    <Search size={16} />
                    <input className="input" placeholder="Search..." />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="form-group">
                  <label className="form-label">下拉选择</label>
                  <select className="input">
                    <option>选项 A</option>
                    <option>选项 B</option>
                    <option>选项 C</option>
                  </select>
                </div>
              </div>
            </div>
          </SubCard>

          <SubCard title="状态标签 Badges">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              圆角: 999px (pill) · 字号: 0.72rem · 字重: 600 · 内边距: 3px 8px
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span className="badge badge-success"><span className="badge-dot green" /> 在线</span>
              <span className="badge badge-danger"><span className="badge-dot red" /> 离线</span>
              <span className="badge badge-warning"><span className="badge-dot yellow" /> 警告</span>
              <span className="badge badge-info">Leader</span>
              <span className="badge badge-neutral">Follower</span>
              <span className="badge badge-success">RUNNING</span>
              <span className="badge badge-danger">CANCELLED</span>
              <span className="badge badge-info">Query</span>
              <span className="badge badge-neutral">Sleep</span>
            </div>
          </SubCard>

          <SubCard title="统计卡片 Stat Cards">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              用于仪表盘关键指标展示
            </p>
            <div className="grid-4">
              <div className="stat-card">
                <div className="stat-card-icon blue"><Server size={20} /></div>
                <div className="stat-card-label">节点总数</div>
                <div className="stat-card-value">12</div>
                <div className="stat-card-detail">10 在线 / 2 离线</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon green"><Cpu size={20} /></div>
                <div className="stat-card-label">FE 节点</div>
                <div className="stat-card-value">3</div>
                <div className="stat-card-detail">全部在线</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon purple"><HardDrive size={20} /></div>
                <div className="stat-card-label">BE/CN 节点</div>
                <div className="stat-card-value">9</div>
                <div className="stat-card-detail">BE 6 + CN 3</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon orange"><Activity size={20} /></div>
                <div className="stat-card-label">活跃查询</div>
                <div className="stat-card-value">24</div>
                <div className="stat-card-detail">共 58 个连接</div>
              </div>
            </div>
          </SubCard>

          <SubCard title="Tab 标签页 Tabs">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              底部 2px 蓝色指示条 · 字号: 0.85rem · 间距: 16px
            </p>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button className="tab active">标签一</button>
              <button className="tab">标签二</button>
              <button className="tab">标签三</button>
            </div>
          </SubCard>

          <SubCard title="弹窗 Modal">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              背景遮罩 blur(4px) · 圆角: var(--radius-xl) = 16px · 阴影: shadow-xl · 动画: slideUp 0.2s
            </p>
            <div style={{
              padding: 24,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              maxWidth: 400,
            }}>
              <div className="modal-header">
                <span className="modal-title">示例弹窗标题</span>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">名称</label>
                  <input className="input" placeholder="请输入名称..." />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary">取消</button>
                <button className="btn btn-primary">确定</button>
              </div>
            </div>
          </SubCard>

          <SubCard title="Toast 通知">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              固定右上角 · 圆角: var(--radius-md) · 动画: slideIn 0.3s
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
                fontWeight: 500, background: 'var(--success-600)', color: 'white',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ✓ 操作成功
              </div>
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
                fontWeight: 500, background: 'var(--danger-600)', color: 'white',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ✕ 操作失败
              </div>
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
                fontWeight: 500, background: 'var(--primary-600)', color: 'white',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ℹ 提示信息
              </div>
            </div>
          </SubCard>
        </Section>

        {/* ===== 4. Table ===== */}
        <Section id="table" icon={Table2} title="表格样式 Table" desc="数据表格的标准外观：表头、行高、状态、操作列">
          <SubCard title="标准数据表">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              表头背景: var(--bg-tertiary) · 行高紧凑 · 行 hover: var(--bg-hover) · 表头字号: 0.78rem uppercase
            </p>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>IP</th>
                    <th>端口</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>版本</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '71901419', ip: '10.88.19.103', port: '9010', role: 'LEADER', alive: true, ver: '3.3.2' },
                    { id: '71967173', ip: '10.88.19.104', port: '9010', role: 'FOLLOWER', alive: true, ver: '3.3.2' },
                    { id: '36942019', ip: '10.88.19.107', port: '9010', role: 'FOLLOWER', alive: true, ver: '3.3.2' },
                    { id: '71883667', ip: '10.88.19.109', port: '9010', role: 'OBSERVER', alive: false, ver: '3.3.1' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="text-mono">{row.id}</td>
                      <td className="text-mono">{row.ip}</td>
                      <td>{row.port}</td>
                      <td>
                        <span className={`badge ${row.role === 'LEADER' ? 'badge-info' : 'badge-neutral'}`}>
                          {row.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.alive ? 'badge-success' : 'badge-danger'}`}>
                          <span className={`badge-dot ${row.alive ? 'green' : 'red'}`} />
                          {row.alive ? '在线' : '离线'}
                        </span>
                      </td>
                      <td className="text-xs">{row.ver}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm">详情</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubCard>
        </Section>

        {/* ===== 5. Layout & Spacing ===== */}
        <Section id="layout" icon={LayoutGrid} title="布局 & 间距 Layout" desc="12 列栅格、标准间距档位、响应式断点">
          <SubCard title="12 列栅格">
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 48,
                    background: 'rgba(59, 130, 246, 0.12)',
                    borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', color: 'var(--primary-500)', fontWeight: 600,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </SubCard>

          <SubCard title="间距档位 Spacing Scale">
            <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>
              基于 4px / 8px 倍数系统
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: '4px', size: 4, desc: '极小间距' },
                { label: '8px (gap-2)', size: 8, desc: '紧凑间距' },
                { label: '12px (gap-3)', size: 12, desc: '常规间距' },
                { label: '16px (gap-4)', size: 16, desc: '标准间距' },
                { label: '20px', size: 20, desc: 'Card 内边距' },
                { label: '24px (gap-6)', size: 24, desc: '卡片/模块间距' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: s.size, height: s.size,
                    background: 'var(--primary-500)', borderRadius: 3, flexShrink: 0,
                  }} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', marginRight: 8 }}>{s.label}</span>
                    <span className="text-xs text-secondary">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </SubCard>

          <SubCard title="响应式断点 Breakpoints">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>断点</th>
                    <th>最大宽度</th>
                    <th>变化</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="badge badge-info">Desktop</span></td>
                    <td className="text-mono">&gt; 1200px</td>
                    <td>grid-4 = 4列, grid-3 = 3列</td>
                  </tr>
                  <tr>
                    <td><span className="badge badge-neutral">Tablet</span></td>
                    <td className="text-mono">≤ 1200px</td>
                    <td>grid-4 / grid-3 → 2列</td>
                  </tr>
                  <tr>
                    <td><span className="badge badge-warning">Mobile</span></td>
                    <td className="text-mono">≤ 768px</td>
                    <td>所有 grid → 1列, 侧边栏隐藏</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SubCard>
        </Section>

        {/* ===== 6. Elevation ===== */}
        <Section id="elevation" icon={Layers} title="阴影 & 圆角 Elevation" desc="卡片层次感和圆角规范">
          <SubCard title="阴影层级 Shadows">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {[
                { name: 'shadow-sm', css: '0 1px 2px rgba(0,0,0,0.05)', desc: '按钮 / Select' },
                { name: 'shadow-md', css: '0 4px 6px -1px rgba(0,0,0,0.07) …', desc: 'Card hover' },
                { name: 'shadow-lg', css: '0 10px 15px -3px rgba(0,0,0,0.08) …', desc: 'Toast / 下拉' },
                { name: 'shadow-xl', css: '0 20px 25px -5px rgba(0,0,0,0.1) …', desc: 'Modal / Dialog' },
              ].map((s) => (
                <div
                  key={s.name}
                  style={{
                    width: 180, padding: 20,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: `var(--${s.name})`,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                  <div className="text-xs text-secondary text-mono">{s.css}</div>
                  <div className="text-xs text-secondary">{s.desc}</div>
                </div>
              ))}
            </div>
          </SubCard>

          <SubCard title="圆角规范 Border Radius">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
              {[
                { name: 'radius-sm', val: '6px', size: 48 },
                { name: 'radius-md', val: '8px', size: 56 },
                { name: 'radius-lg', val: '12px', size: 64 },
                { name: 'radius-xl', val: '16px', size: 72 },
                { name: '999px (pill)', val: '999px', size: 40 },
              ].map((r) => (
                <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: r.size, height: r.size,
                    background: 'var(--primary-500)',
                    borderRadius: r.val,
                    opacity: 0.8,
                  }} />
                  <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{r.name}</div>
                  <div className="text-xs text-secondary">{r.val}</div>
                </div>
              ))}
            </div>
          </SubCard>

          <SubCard title="动画规范 Animations">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>用途</th>
                    <th>参数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-mono">fadeIn</td>
                    <td>遮罩层淡入</td>
                    <td className="text-xs text-mono">0.15s ease</td>
                  </tr>
                  <tr>
                    <td className="text-mono">slideUp</td>
                    <td>Modal 弹出</td>
                    <td className="text-xs text-mono">0.2s ease (translateY 12px→0)</td>
                  </tr>
                  <tr>
                    <td className="text-mono">slideIn</td>
                    <td>Toast 滑入</td>
                    <td className="text-xs text-mono">0.3s ease (translateX 20px→0)</td>
                  </tr>
                  <tr>
                    <td className="text-mono">spin</td>
                    <td>Loading spinner</td>
                    <td className="text-xs text-mono">0.6s linear infinite</td>
                  </tr>
                  <tr>
                    <td className="text-mono">pulse</td>
                    <td>状态点闪烁</td>
                    <td className="text-xs text-mono">2s ease-in-out infinite</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SubCard>
        </Section>
      </div>
    </>
  );
}
