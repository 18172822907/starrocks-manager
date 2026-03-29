/**
 * SHOW PROC path metadata — centralized configuration for all PROC paths.
 *
 * Each entry defines the display name, description, icon, group,
 * and optional column rendering hints for the ShowProcViewer component.
 */

import {
  Server,
  Cpu,
  Network,
  Database,
  FolderTree,
  Layers,
  BarChart3,
  Briefcase,
  ListChecks,
  Radio,
  ArrowLeftRight,
  AlertTriangle,
  Activity,
  Globe,
  MonitorDot,
  Box,
  Scale,
  Copy,
  HardDriveDownload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

export type ColumnFormat = 'ip' | 'port' | 'status' | 'percent' | 'bytes' | 'datetime' | 'duration' | 'number' | 'text';

export interface ColumnHint {
  format: ColumnFormat;
  label?: string;        // Override column header name
  width?: string;        // Suggested min-width
}

export type ProcGroup = 'cluster' | 'data' | 'jobs' | 'queries' | 'resources';

export interface ProcPathMeta {
  path: string;
  label: string;
  description: string;
  group: ProcGroup;
  icon: LucideIcon;
  columnHints?: Record<string, ColumnHint>;
}

// ── Group Definitions ────────────────────────────────────────────────

export interface ProcGroupMeta {
  key: ProcGroup;
  label: string;
  description: string;
  order: number;
  gradient: string;       // CSS gradient for card header
  iconColor: string;      // CSS color for group icon
}

export const PROC_GROUPS: ProcGroupMeta[] = [
  {
    key: 'cluster',
    label: '集群基础设施',
    description: '节点状态、角色与心跳',
    order: 0,
    gradient: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))',
    iconColor: 'var(--primary-600)',
  },
  {
    key: 'data',
    label: '数据与元数据',
    description: '数据库、Catalog、分组与统计',
    order: 1,
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))',
    iconColor: 'var(--accent-600)',
  },
  {
    key: 'jobs',
    label: '任务与作业',
    description: '后台作业、事务与加载状态',
    order: 2,
    gradient: 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.02))',
    iconColor: 'var(--warning-600)',
  },
  {
    key: 'queries',
    label: '查询与监控',
    description: '活跃查询、实例与系统监控',
    order: 3,
    gradient: 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.02))',
    iconColor: 'var(--success-600)',
  },
  {
    key: 'resources',
    label: '资源管理',
    description: '资源使用、负载均衡与副本同步',
    order: 4,
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))',
    iconColor: 'var(--danger-500)',
  },
];

// ── Path Definitions ─────────────────────────────────────────────────

export const PROC_PATHS: ProcPathMeta[] = [
  // ── Cluster Infrastructure ──
  {
    path: '/backends',
    label: 'Backends',
    description: 'BE 节点详情：状态、磁盘、Tablet 分布',
    group: 'cluster',
    icon: Server,
    columnHints: {
      IP: { format: 'ip' },
      Alive: { format: 'status' },
      TotalCapacity: { format: 'bytes' },
      UsedPct: { format: 'percent' },
      LastStartTime: { format: 'datetime' },
      LastHeartbeat: { format: 'datetime' },
    },
  },
  {
    path: '/compute_nodes',
    label: 'Compute Nodes',
    description: 'CN 节点详情：CPU、内存、查询负载',
    group: 'cluster',
    icon: Cpu,
    columnHints: {
      IP: { format: 'ip' },
      Alive: { format: 'status' },
      MemUsedPct: { format: 'percent' },
      CpuUsedPct: { format: 'percent' },
      LastStartTime: { format: 'datetime' },
      LastHeartbeat: { format: 'datetime' },
    },
  },
  {
    path: '/frontends',
    label: 'Frontends',
    description: 'FE 节点详情：Leader/Follower 角色、端口',
    group: 'cluster',
    icon: Server,
    columnHints: {
      IP: { format: 'ip' },
      Alive: { format: 'status' },
      StartTime: { format: 'datetime' },
      LastHeartbeat: { format: 'datetime' },
    },
  },
  {
    path: '/brokers',
    label: 'Brokers',
    description: 'Broker 节点列表与连接状态',
    group: 'cluster',
    icon: Network,
    columnHints: {
      IP: { format: 'ip' },
      Alive: { format: 'status' },
      LastStartTime: { format: 'datetime' },
      LastUpdateTime: { format: 'datetime' },
    },
  },

  // ── Data & Metadata ──
  {
    path: '/dbs',
    label: 'Databases',
    description: '数据库列表、表数量与数据容量',
    group: 'data',
    icon: Database,
    columnHints: {
      DbId: { format: 'number' },
      TableNum: { format: 'number' },
      Size: { format: 'bytes' },
      Quota: { format: 'bytes' },
    },
  },
  {
    path: '/catalog',
    label: 'Catalogs',
    description: 'Catalog 列表与外部数据源',
    group: 'data',
    icon: FolderTree,
  },
  {
    path: '/colocation_group',
    label: 'Colocation Groups',
    description: 'Colocation 分组配置与节点分配',
    group: 'data',
    icon: Layers,
  },
  {
    path: '/statistic',
    label: '统计信息',
    description: '表统计收集状态与健康度',
    group: 'data',
    icon: BarChart3,
  },

  // ── Jobs & Tasks ──
  {
    path: '/jobs',
    label: 'Jobs',
    description: '后台作业列表（Schema Change / Rollup 等）',
    group: 'jobs',
    icon: Briefcase,
  },
  {
    path: '/tasks',
    label: 'Tasks',
    description: '内部 Task 调度与执行状态',
    group: 'jobs',
    icon: ListChecks,
  },
  {
    path: '/routine_loads',
    label: 'Routine Loads',
    description: 'Routine Load 内部运行状态',
    group: 'jobs',
    icon: Radio,
  },
  {
    path: '/transactions',
    label: '事务',
    description: '活跃与历史事务状态',
    group: 'jobs',
    icon: ArrowLeftRight,
  },
  {
    path: '/load_error_hub',
    label: '加载错误',
    description: '数据加载失败详情与错误追踪',
    group: 'jobs',
    icon: AlertTriangle,
  },

  // ── Queries & Monitoring ──
  {
    path: '/current_queries',
    label: '当前查询',
    description: '本节点正在执行的查询列表',
    group: 'queries',
    icon: Activity,
  },
  {
    path: '/global_current_queries',
    label: '全局查询',
    description: '集群所有节点活跃查询汇总',
    group: 'queries',
    icon: Globe,
  },
  {
    path: '/current_backend_instances',
    label: 'BE 实例',
    description: '当前活跃的 Backend 执行实例',
    group: 'queries',
    icon: MonitorDot,
  },
  {
    path: '/monitor',
    label: '系统监控',
    description: 'JVM、内存、线程等系统级指标',
    group: 'queries',
    icon: Activity,
  },

  // ── Resource Management ──
  {
    path: '/resources',
    label: '资源使用',
    description: 'Spark / 外部资源使用情况',
    group: 'resources',
    icon: Box,
  },
  {
    path: '/cluster_balance',
    label: '集群均衡',
    description: 'Tablet 分布均衡状态与迁移进度',
    group: 'resources',
    icon: Scale,
  },
  {
    path: '/replications',
    label: '副本同步',
    description: '多副本同步状态与延迟信息',
    group: 'resources',
    icon: Copy,
  },
  {
    path: '/compactions',
    label: 'Compaction',
    description: 'Compaction 任务总体状态与执行详情',
    group: 'resources',
    icon: HardDriveDownload,
    columnHints: {
      StartTime: { format: 'datetime' },
      CommitTime: { format: 'datetime' },
      FinishTime: { format: 'datetime' },
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

/** Allowed PROC paths (whitelist) for API validation */
export const ALLOWED_PROC_PATHS = PROC_PATHS.map(p => p.path);

/** Get metadata for a specific PROC path */
export function getProcMeta(path: string): ProcPathMeta | undefined {
  return PROC_PATHS.find(p => p.path === path);
}

/** Get all paths in a specific group */
export function getPathsByGroup(group: ProcGroup): ProcPathMeta[] {
  return PROC_PATHS.filter(p => p.group === group);
}

/** Get group metadata by key */
export function getGroupMeta(key: ProcGroup): ProcGroupMeta | undefined {
  return PROC_GROUPS.find(g => g.key === key);
}
