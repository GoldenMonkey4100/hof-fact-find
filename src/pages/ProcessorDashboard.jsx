import React, { useState, useEffect } from 'react';

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ProcessorDashboard = ({ user, onChangeUser }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-queue', statuses: ['pending_lodgement', 'lodged', 'approved'] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openItem = async (item) => {
    const res  = await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', id: item.id, userEmail: user.email }),
    });
    const data = await res.json();
    setSelected({ item, formData: data.item?.form_data || {}, creditAnalysis: data.item?.credit_analysis || {}, mercuryUrl: data.item?.mercury_url || '' });
  };

  const handleLodgeInMercury = async () => {
    if (!window.confirm('Lodge this fact find in Mercury? This will create the opportunity in Mercury CRM.')) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', formData: selected.formData, factFindId: selected.item.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Update status to lodged
      await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-status', id: selected.item.id, status: 'lodged', mercuryUrl: data.mercuryUrl, mercuryTitle: data.title }),
      });
      setSelected(s => ({ ...s, mercuryUrl: data.mercuryUrl, item: { ...s.item, status: 'lodged' } }));
      await load();
    } catch (e) { alert('Mercury submission failed: ' + e.message); } finally { setSubmitting(false); }
  };

  const handleMarkApproved = async () => {
    if (!window.confirm('Mark this file as formally approved?')) return;
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-status', id: selected.item.id, status: 'approved' }),
    });
    setSelected(s => ({ ...s, item: { ...s.item, status: 'approved' } }));
    await load();
  };

  const STATUS_META = {
    pending_lodgement: { label: 'Ready to Lodge', bg: '#ede9fe', color: '#5b21b6' },
    lodged:            { label: 'Lodged',          bg: '#ccfbf1', color: '#0f766e' },
    approved:          { label: 'Approved',         bg: '#dcfce7', color: '#16a34a' },
  };

  const pending = items.filter(i => i.status === 'pending_lodgement');
  const lodged  = items.filter(i => i.status === 'lodged');
  const approved = items.filter(i => i.status === 'approved');

  const fd = selected?.formData || {};
  const ca = selected?.creditAnalysis || {};
  const secs = fd.securities || [];
  const apps = fd.applicants || [];
  const totalLoan = secs.reduce((s, sec) => s + (parseFloat(sec.loanAmount) || 0), 0);
  const fmt = (n) => n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';

  const ItemCard = ({ item }) => {
    const meta = STATUS_META[item.status] || {};
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.client_name || 'Unnamed'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Broker: {item.broker_name || '—'}
            {item.credit_analysis?.lender ? ` · Lender: ${item.credit_analysis.lender}` : ''}
            {' · '}{relativeTime(item.updated_at)}
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '10px', background: meta.bg, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {meta.label}
        </span>
        <button type="button" onClick={() => openItem(item)}
          style={{ padding: '7px 16px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
          Open →
        </button>
      </div>
    );
  };

  if (selected) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
            ← Queue
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.item.client_name || 'Unnamed'}</span>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
          {/* Credit Analysis Summary */}
          {Object.keys(ca).length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#166534', marginBottom: '12px' }}>Credit Analyst Recommendation</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', fontSize: '12px' }}>
                {[
                  { l: 'Lender',       v: ca.lender || '—' },
                  { l: 'Product',      v: ca.product || '—' },
                  { l: 'Rate',         v: ca.rate ? `${ca.rate}% ${ca.rateType || ''}` : '—' },
                  { l: 'Repayment',    v: ca.repaymentType || '—' },
                  { l: 'LVR',          v: ca.lvrConfirmed ? `${ca.lvrConfirmed}%` : '—' },
                  { l: 'Serviceability', v: ca.serviceability || '—' },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{ color: '#166534', marginBottom: '2px' }}>{l}</div>
                    <div style={{ fontWeight: '700', color: '#14532d' }}>{v}</div>
                  </div>
                ))}
              </div>
              {ca.creditWriteup && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #86efac', fontSize: '13px', color: '#166534', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {ca.creditWriteup}
                </div>
              )}
            </div>
          )}

          {/* Overview */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Overview</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{selected.item.client_name || 'Unnamed'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Broker: {fd.brokerName || '—'} · Lead Source: {fd.leadSource || '—'} · Priority: {fd.priority || '—'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {[
                { label: 'Total Loan', value: fmt(totalLoan) },
                { label: 'Securities', value: secs.length },
                { label: 'Applicants', value: apps.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Applicants */}
          {apps.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Applicants</div>
              {apps.map((a, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < apps.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{[a.firstName, a.lastName].filter(Boolean).join(' ') || `Applicant ${i + 1}`}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>DOB: {a.dob || '—'} · {a.email || ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Securities */}
          {secs.map((sec, i) => (
            <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Security {i + 1}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>{sec.address || '—'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', fontSize: '12px' }}>
                {[
                  { l: 'Property Value', v: sec.propertyValue ? `$${parseFloat(sec.propertyValue).toLocaleString()}` : '—' },
                  { l: 'Loan Amount',    v: sec.loanAmount    ? `$${parseFloat(sec.loanAmount).toLocaleString()}` : '—' },
                  { l: 'LVR',           v: sec.lvr ? `${sec.lvr}%` : '—' },
                  { l: 'Transaction',   v: (sec.primaryTransactionTypes || []).join(', ') || '—' },
                  { l: 'Loan Type',     v: sec.loanType || '—' },
                  { l: 'Occupancy',     v: sec.intendedOccupancy || '—' },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: '2px' }}>{l}</div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Actions</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {selected.item.status === 'pending_lodgement' && (
                <button onClick={handleLodgeInMercury} disabled={submitting}
                  style={{ padding: '11px 24px', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--bg-primary)', cursor: 'pointer', fontFamily: 'var(--font-heading)', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Lodging…' : 'Lodge in Mercury →'}
                </button>
              )}
              {selected.item.status === 'lodged' && (
                <>
                  {selected.mercuryUrl && (
                    <a href={selected.mercuryUrl} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '11px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-block' }}>
                      Open in Mercury ↗
                    </a>
                  )}
                  <button onClick={handleMarkApproved}
                    style={{ padding: '11px 24px', background: '#16a34a', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-heading)' }}>
                    Mark as Approved ✓
                  </button>
                </>
              )}
              {selected.item.status === 'approved' && (
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                  ✓ File approved
                  {selected.mercuryUrl && <a href={selected.mercuryUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'underline' }}>Open in Mercury ↗</a>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>Lodgement Queue</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Files ready for Mercury data entry and lodgement</p>
        </div>

        {loading && <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>}
        {error && <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}

        {!loading && !error && (
          <>
            {[
              { label: 'Ready to Lodge', items: pending, emptyText: 'No files ready for lodgement.' },
              { label: 'Lodged', items: lodged, emptyText: 'No lodged files.' },
              { label: 'Approved', items: approved, emptyText: 'No approved files.' },
            ].map(({ label, items: group, emptyText }) => (
              <div key={label} style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                  {label} ({group.length})
                </div>
                {group.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {emptyText}
                  </div>
                ) : group.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ProcessorDashboard;
