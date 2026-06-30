import React, { useState, useEffect, useCallback } from 'react';
import { PEOPLE } from '../lib/utils';

const relativeTime = (iso) => {
  if (!iso) return '—';
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_META = {
  draft:             { label: 'Draft',             bg: 'var(--color-gold-light)', color: 'var(--color-primary)' },
  pending_review:    { label: 'With Credit Team',  bg: '#fef3c7', color: '#92400e' },
  in_review:         { label: 'In Analysis',       bg: '#dbeafe', color: '#1e40af' },
  pending_lodgement: { label: 'Ready to Lodge',    bg: '#ede9fe', color: '#5b21b6' },
  lodged:            { label: 'Lodged',             bg: '#ccfbf1', color: '#0f766e' },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '10px', background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
};

const STAGE_CONFIG = [
  {
    key: 'draft',
    label: 'Draft',
    statuses: ['draft'],
    description: 'Fact finds started but not yet submitted to the credit team.',
  },
  {
    key: 'credit',
    label: 'Credit Analysts',
    statuses: ['pending_review', 'in_review'],
    description: 'Submitted fact finds awaiting or undergoing credit analysis.',
  },
  {
    key: 'processing',
    label: 'Loan Processing',
    statuses: ['pending_lodgement'],
    description: 'Files cleared for credit QA, ready to be lodged with a lender.',
  },
  {
    key: 'lodged',
    label: 'Lodged',
    statuses: ['lodged'],
    description: 'Files lodged with a lender. Application continues in Mercury Nexus.',
    collapsible: true,
  },
];

const ALL_STATUSES = ['draft', 'pending_review', 'in_review', 'pending_lodgement', 'lodged'];

const STATUS_MOVE_OPTIONS = {
  draft:             ['pending_review'],
  pending_review:    ['in_review', 'draft'],
  in_review:         ['pending_lodgement', 'pending_review'],
  pending_lodgement: ['lodged', 'in_review'],
  lodged:            ['pending_lodgement'],
};

const analysts   = PEOPLE.filter(p => p.role === 'analyst');
const processors = PEOPLE.filter(p => p.role === 'processor');

// ── Admin Row ─────────────────────────────────────────────────────────────────
const PipelineRow = ({ item, onView, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    await onUpdate(item.id, { status: newStatus });
    setUpdating(false);
  };

  const handleAssignAnalyst = async (email) => {
    setUpdating(true);
    await onUpdate(item.id, { assignedAnalyst: email });
    setUpdating(false);
  };

  const handleAssignProcessor = async (email) => {
    setUpdating(true);
    await onUpdate(item.id, { assignedProcessor: email });
    setUpdating(false);
  };

  const moveOptions = STATUS_MOVE_OPTIONS[item.status] || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px 140px 90px 120px 70px', gap: '8px', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', marginBottom: '6px', opacity: updating ? 0.65 : 1 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.client_name || '(unnamed)'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {item.broker_name || '—'}
        </div>
      </div>

      <StatusBadge status={item.status} />

      {/* Assign analyst */}
      <select
        value={item.assigned_analyst || ''}
        onChange={e => handleAssignAnalyst(e.target.value)}
        disabled={updating}
        style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid var(--border-primary)', borderRadius: '5px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '100%' }}
      >
        <option value="">— Analyst —</option>
        {analysts.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
      </select>

      {/* Assign processor */}
      <select
        value={item.assigned_processor || ''}
        onChange={e => handleAssignProcessor(e.target.value)}
        disabled={updating}
        style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid var(--border-primary)', borderRadius: '5px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '100%' }}
      >
        <option value="">— Processor —</option>
        {processors.map(p => <option key={p.email} value={p.email}>{p.name}</option>)}
      </select>

      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{relativeTime(item.updated_at)}</div>

      {/* Move to */}
      <select
        value=""
        onChange={e => { if (e.target.value) handleStatusChange(e.target.value); }}
        disabled={updating || moveOptions.length === 0}
        style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid var(--border-primary)', borderRadius: '5px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '100%' }}
      >
        <option value="">Move to…</option>
        {moveOptions.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
      </select>

      <button
        onClick={() => onView(item)}
        style={{ padding: '5px 12px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
      >
        View
      </button>
    </div>
  );
};

// ── Detail View (read-only) ───────────────────────────────────────────────────
const DetailView = ({ item, detail, onBack, onUpdate, onEditAsBroker, onStartQA }) => {
  const fd   = detail || {};
  const secs = fd.securities  || [];
  const apps = fd.applicants  || [];

  const totalLoan = secs.reduce((s, sec) => s + (parseFloat(String(sec.loanAmount  || '').replace(/,/g, '')) || 0), 0);
  const totalProp = secs.reduce((s, sec) => s + (parseFloat(String(sec.propertyValue || '').replace(/,/g, '')) || 0), 0);
  const fmtC = (n) => n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';

  const [newStatus, setNewStatus] = useState(item.status);
  const [newAnalyst, setNewAnalyst]   = useState(item.assigned_analyst || '');
  const [newProcessor, setNewProcessor] = useState(item.assigned_processor || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(item.id, { status: newStatus, assignedAnalyst: newAnalyst, assignedProcessor: newProcessor });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
          ← Pipeline
        </button>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.client_name || 'Unnamed'}</span>
        <StatusBadge status={item.status} />
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
        {/* Left: fact find overview */}
        <div>
          <div style={{ background: '#12110D', border: '1px solid rgba(203,178,107,0.15)', borderRadius: '12px', padding: '20px 24px', marginBottom: '14px' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F5F4F2', marginBottom: '4px' }}>{item.client_name || 'Unnamed'}</div>
            <div style={{ fontSize: '12px', color: 'rgba(245,244,242,0.45)', marginBottom: '12px' }}>
              Broker: {fd.brokerName || item.broker_name || '—'} · Updated {relativeTime(item.updated_at)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[['Total Loan', fmtC(totalLoan)], ['Total Property', fmtC(totalProp)], ['Securities', secs.length]].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(203,178,107,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(245,244,242,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{k}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#CBB26B' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {apps.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '16px 20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>Applicants</div>
              {apps.map((a, i) => (
                <div key={i} style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {[a.firstName, a.lastName].filter(Boolean).join(' ') || `Applicant ${i + 1}`}
                  {a.email ? <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '12px' }}>{a.email}</span> : null}
                </div>
              ))}
            </div>
          )}

          {secs.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '16px 20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>Securities</div>
              {secs.map((s, i) => (
                <div key={i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: i < secs.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.address || `Security ${i + 1}`}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {fmtC(parseFloat(String(s.loanAmount || '').replace(/,/g, '')) || 0)} loan · {fmtC(parseFloat(String(s.propertyValue || '').replace(/,/g, '')) || 0)} value
                    {s.lvr ? ` · LVR ${s.lvr}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {fd.brokerNotes && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Broker Notes</div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{fd.brokerNotes}</p>
            </div>
          )}
        </div>

        {/* Right: admin actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Admin Actions</div>

            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Status</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '10px' }}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
            </select>

            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Assigned Analyst</label>
            <select value={newAnalyst} onChange={e => setNewAnalyst(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '10px' }}>
              <option value="">— Unassigned —</option>
              {analysts.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
            </select>

            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Assigned Processor</label>
            <select value={newProcessor} onChange={e => setNewProcessor(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '14px' }}>
              <option value="">— Unassigned —</option>
              {processors.map(p => <option key={p.email} value={p.email}>{p.name}</option>)}
            </select>

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '10px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>

          {onStartQA && (item.status === 'pending_lodgement' || item.status === 'lodged') && (
            <button
              onClick={onStartQA}
              style={{ width: '100%', padding: '10px', background: item.compliance_qa ? 'var(--bg-secondary)' : '#12110D', border: item.compliance_qa ? '1px solid var(--border-primary)' : 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: item.compliance_qa ? 'var(--text-primary)' : '#CBB26B', cursor: 'pointer', textAlign: 'center' }}>
              {item.compliance_qa ? '↳ Continue QA review' : '✓ Start QA review'}
            </button>
          )}

          {onEditAsBroker && (
            <button
              onClick={() => onEditAsBroker(detail, item.id, { name: item.broker_name || 'Broker', email: item.broker_email, role: 'broker' })}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center' }}>
              ✏ Edit fact find as {item.broker_name || 'broker'}
            </button>
          )}

          {item.mercury_url && (
            <a href={item.mercury_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', textDecoration: 'none', textAlign: 'center' }}>
              Open in Mercury ↗
            </a>
          )}

          {/* Password reset panel */}
          <PasswordResetPanel adminEmail={item.assigned_analyst} />
        </div>
      </div>
    </div>
  );
};

const PasswordResetPanel = ({ adminEmail }) => {
  const [targetEmail, setTargetEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const allUsers = PEOPLE.filter(p => p.role !== 'admin');
  const currentAdmin = PEOPLE.find(p => p.role === 'admin' && p.email === adminEmail)?.email || '';

  const handleReset = async (e) => {
    e.preventDefault();
    if (!targetEmail || !newPwd) return;
    setSaving(true); setMsg('');
    try {
      const storedAdmin = JSON.parse(localStorage.getItem('hof_user') || '{}');
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-reset', adminEmail: storedAdmin.email, targetEmail, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setMsg(`Error: ${data.error}`); return; }
      setMsg(`Password reset for ${targetEmail}`);
      setTargetEmail(''); setNewPwd('');
    } catch { setMsg('Reset failed.'); } finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>Reset Team Password</div>
      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select value={targetEmail} onChange={e => setTargetEmail(e.target.value)} required
          style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="">Select team member…</option>
          {allUsers.map(u => <option key={u.email} value={u.email}>{u.name}</option>)}
        </select>
        <input type="password" placeholder="New password (min 6 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)} required
          style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
        {msg && <div style={{ fontSize: '11px', color: msg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{msg}</div>}
        <button type="submit" disabled={saving}
          style={{ padding: '7px', background: '#12110D', color: '#CBB26B', border: '1px solid rgba(203,178,107,0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
};

// ── AdminDashboard ────────────────────────────────────────────────────────────
const AdminDashboard = ({ user, onEditAsBroker, onStartQA }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-all' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleView = async (item) => {
    const res  = await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', id: item.id }),
    });
    const data = await res.json();
    setSelected(item);
    setDetail(data.item?.form_data || null);
  };

  const handleUpdate = async (id, changes) => {
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin-update', id, ...changes }),
    });
    await load();
  };

  if (selected) {
    const currentItem = { ...selected, ...items.find(i => i.id === selected.id) };
    return (
      <DetailView
        item={currentItem}
        detail={detail}
        onBack={() => { setSelected(null); setDetail(null); }}
        onUpdate={handleUpdate}
        onEditAsBroker={onEditAsBroker}
        onStartQA={onStartQA ? () => onStartQA(currentItem) : null}
      />
    );
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? items.filter(i =>
        (i.client_name || '').toLowerCase().includes(q) ||
        (i.broker_name || '').toLowerCase().includes(q) ||
        (i.status || '').toLowerCase().includes(q)
      )
    : items;

  const stageItems = (statuses) => filtered.filter(i => statuses.includes(i.status));

  const stageCounts = STAGE_CONFIG.map(s => ({ key: s.key, count: stageItems(s.statuses).length }));

  const columnHeader = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px 140px 90px 120px 70px', gap: '8px', padding: '6px 16px', marginBottom: '4px' }}>
      {['Client', 'Status', 'Analyst', 'Processor', 'Updated', 'Move', ''].map((h, i) => (
        <div key={i} style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>{h}</div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>Pipeline Overview</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>All fact finds across all brokers · admin view</p>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {STAGE_CONFIG.map((stage, i) => {
            const count = stageItems(stage.statuses).length;
            return (
              <div key={stage.key} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>{stage.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: count > 0 ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>{count}</div>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="search"
            placeholder="Search by client name, broker, or status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: '480px', padding: '9px 14px', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>

        {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading pipeline…</div>}
        {error   && <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}

        {/* Stages */}
        {!loading && !error && STAGE_CONFIG.map(stage => {
          const rows = stageItems(stage.statuses);
          const isCompleted = stage.collapsible;

          return (
            <div key={stage.key} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{stage.label}</div>
                <span style={{ fontSize: '11px', fontWeight: '700', background: rows.length > 0 ? 'var(--color-gold-light)' : 'var(--bg-secondary)', color: rows.length > 0 ? 'var(--color-primary)' : 'var(--text-tertiary)', padding: '1px 8px', borderRadius: '10px' }}>{rows.length}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{stage.description}</span>
                {isCompleted && (
                  <button onClick={() => setCompletedOpen(o => !o)}
                    style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '5px', padding: '3px 10px', cursor: 'pointer' }}>
                    {completedOpen ? 'Collapse ↑' : 'Expand ↓'}
                  </button>
                )}
              </div>

              {(!isCompleted || completedOpen) && (
                <>
                  {rows.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      No files in this stage
                    </div>
                  ) : (
                    <>
                      {columnHeader}
                      {rows.map(item => (
                        <PipelineRow key={item.id} item={item} onView={handleView} onUpdate={async (id, changes) => { await handleUpdate(id, changes); }} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
