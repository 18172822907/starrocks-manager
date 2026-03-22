'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, ErrorBanner, SuccessToast, DataTable } from '@/components/ui';
import { Network, Plus, Zap, Trash2, Pencil, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Cluster {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  default_db: string;
  description: string;
  is_active: number;
  userCount?: number;
}

export default function ClusterManagerPage() {
  const { user, activeCluster, switchCluster, refreshAuth } = useAuth();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCluster, setEditCluster] = useState<Cluster | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { ok: boolean; msg: string }>>({});

  // Form state
  const [form, setForm] = useState({
    name: '', host: '', port: '9030', username: 'root', password: '', default_db: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [formTestResult, setFormTestResult] = useState('');
  const [formError, setFormError] = useState('');

  const fetchClusters = useCallback(async () => {
    try {
      const res = await fetch('/api/clusters');
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setClusters(data.clusters || []);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  function openCreate() {
    setEditCluster(null);
    setForm({ name: '', host: '', port: '9030', username: 'root', password: '', default_db: '', description: '' });
    setFormError(''); setFormTestResult('');
    setShowModal(true);
  }

  function openEdit(c: Cluster) {
    setEditCluster(c);
    setForm({
      name: c.name, host: c.host, port: String(c.port), username: c.username,
      password: '', default_db: c.default_db || '', description: c.description || '',
    });
    setFormError(''); setFormTestResult('');
    setShowModal(true);
  }

  async function handleTestConnection() {
    setFormTestResult(''); setFormError('');
    try {
      const res = await fetch('/api/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test', host: form.host, port: parseInt(form.port) || 9030,
          username: form.username, password: form.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormTestResult(`连接成功! StarRocks 版本: ${data.version}`);
      } else {
        setFormError(data.error || '连接失败');
      }
    } catch (err) { setFormError(String(err)); }
  }

  async function handleSave() {
    if (!form.name || !form.host || !form.username) {
      setFormError('请填写集群名称、主机地址和用户名');
      return;
    }
    setSaving(true); setFormError('');
    try {
      const method = editCluster ? 'PUT' : 'POST';
      const body = editCluster
        ? { id: editCluster.id, ...form, port: parseInt(form.port) || 9030, password: form.password || undefined }
        : { ...form, port: parseInt(form.port) || 9030 };

      const res = await fetch('/api/clusters', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setFormError(data.error);
      } else {
        setShowModal(false);
        setSuccess(editCluster ? '集群已更新' : '集群已创建');
        setTimeout(() => setSuccess(''), 3000);
        fetchClusters();
        refreshAuth();
      }
    } catch (err) { setFormError(String(err)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch('/api/clusters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setSuccess('集群已删除');
        setTimeout(() => setSuccess(''), 3000);
        fetchClusters();
        refreshAuth();
      }
    } catch (err) { setError(String(err)); }
    finally { setDeleteConfirm(null); }
  }

  async function handleTestExisting(id: number) {
    setTesting(id);
    const c = clusters.find(cl => cl.id === id);
    if (!c) return;
    try {
      const res = await fetch('/api/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', host: c.host, port: c.port, username: c.username, password: c.password }),
      });
      const data = await res.json();
      setTestResult(prev => ({ ...prev, [id]: { ok: data.success, msg: data.success ? `v${data.version}` : (data.error || '连接失败') } }));
    } catch (err) {
      setTestResult(prev => ({ ...prev, [id]: { ok: false, msg: String(err) } }));
    }
    finally { setTesting(null); }
  }

  async function handleActivate(id: number) {
    await switchCluster(id);
    setSuccess('已切换到该集群');
    setTimeout(() => setSuccess(''), 3000);
    // Refresh to update connection status
    refreshAuth();
  }

  const [search, setSearch] = useState('');

  const filteredClusters = clusters.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.host.includes(search)
  );

  // ... (rest handled below)

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
        <div>权限不足，仅管理员可访问此页面</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="集群管理" breadcrumb={[{ label: '系统管理' }, { label: '集群管理' }]}
        description={<>管理 StarRocks 集群连接 · {clusters.length} 个集群</>}
      />
      <div className="page-body">
        <ErrorBanner error={error} />
        <SuccessToast message={success} />
        {/* Toolbar: search + actions */}
        <div className="table-toolbar">
          <div className="table-search">
            <input
              placeholder="搜索集群名称或地址..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <button className="btn btn-secondary" onClick={fetchClusters} disabled={loading}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              刷新
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> 添加集群
            </button>
          </div>
        </div>
        <DataTable loading={loading} empty={filteredClusters.length === 0} emptyIcon={<Network size={48} />} emptyText='暂无集群，点击添加集群开始'
          footerLeft={<>共 <strong style={{ color: 'var(--text-secondary)' }}>{clusters.length}</strong> 个集群</>}>
          <thead>
            <tr>
              <th style={{ width: '44px', textAlign: 'center' }}>#</th>
              <th>集群名称</th>
              <th>地址</th>
              <th>用户名</th>
              <th>状态</th>
              <th>描述</th>
              <th style={{ width: '200px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredClusters.map((c, i) => (
              <tr key={c.id}>
                <td style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{c.host}:{c.port}</td>
                <td>{c.username}</td>
                <td>
                  {activeCluster?.id === c.id ? (
                    <span className="status-badge status-green">● 已激活</span>
                  ) : testResult[c.id] ? (
                    <span className={`status-badge ${testResult[c.id].ok ? 'status-green' : 'status-red'}`}>
                      {testResult[c.id].ok ? `✓ ${testResult[c.id].msg}` : `✗ ${testResult[c.id].msg}`}
                    </span>
                  ) : (
                    <span className="status-badge status-gray">未连接</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>{c.description || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    {activeCluster?.id !== c.id && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleActivate(c.id)} title="激活">
                        <Check size={14} /> 激活
                      </button>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={() => handleTestExisting(c.id)} disabled={testing === c.id} title="测试连接">
                      {testing === c.id ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Zap size={14} />}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)} title="编辑">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-sm btn-danger-ghost" onClick={() => setDeleteConfirm(c.id)} title="删除" disabled={activeCluster?.id === c.id}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} title={editCluster ? '编辑集群' : '添加集群'} onClose={() => setShowModal(false)} maxWidth="520px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">集群名称 *</label>
              <input className="input" placeholder="例如：生产环境" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-row" style={{ gap: '12px' }}>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label className="form-label">主机地址 *</label>
                <input className="input" placeholder="192.168.1.100" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">端口</label>
                <input className="input" type="number" placeholder="9030" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} />
              </div>
            </div>
            <div className="form-row" style={{ gap: '12px' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">用户名 *</label>
                <input className="input" placeholder="root" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">密码 {editCluster && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>(留空则不修改)</span>}</label>
                <input className="input" type="password" placeholder="密码" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">默认数据库（可选）</label>
              <input className="input" placeholder="留空则不指定" value={form.default_db} onChange={e => setForm(f => ({ ...f, default_db: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">描述（可选）</label>
              <input className="input" placeholder="集群用途说明" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {formError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-500)', fontSize: '0.82rem', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            {formTestResult && (
              <div style={{ color: 'var(--success-500)', fontSize: '0.82rem', padding: '8px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)' }}>
                {formTestResult}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button className="btn btn-secondary" onClick={handleTestConnection} disabled={!form.host || !form.username}>
                <Zap size={14} /> 测试连接
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                <X size={14} /> 取消
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.host || !form.username}>
                {saving ? <span className="spinner" /> : <><Check size={14} /> {editCluster ? '保存' : '创建'}</>}
              </button>
            </div>
          </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={deleteConfirm !== null}
        title="删除集群"
        message={`确定要删除集群 "${clusters.find(c => c.id === deleteConfirm)?.name}" 吗？此操作不可恢复。`}
        confirmText="删除"
        danger
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
