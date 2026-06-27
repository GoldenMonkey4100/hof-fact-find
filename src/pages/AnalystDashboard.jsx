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

const STATUS_META = {
  pending_review: { label: 'Pending Review', bg: '#fef3c7', color: '#92400e' },
  in_review:      { label: 'In Review',      bg: '#dbeafe', color: '#1e40af' },
};

const PRIORITY_META = {
  High:   { bg: '#fee2e2', color: '#991b1b' },
  Medium: { bg: '#fef3c7', color: '#92400e' },
  Low:    { bg: '#f3f4f6', color: '#374151' },
};

const annualise = (income, freq) => {
  const n = parseFloat(String(income || '').replace(/,/g, ''));
  if (!n) return 0;
  if (freq === 'Weekly')      return n * 52;
  if (freq === 'Fortnightly') return n * 26;
  if (freq === 'Monthly')     return n * 12;
  return n; // Annually or unknown
};

const fmt = (n) => n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';

const AnalystDashboard = ({ user, onChangeUser }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [sendingMsg, setSendingMsg] = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-queue', statuses: ['pending_review', 'in_review'] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const pending = items.filter(i => i.status === 'pending_review').length;
    document.title = pending > 0 ? `(${pending}) Credit Analysis Queue` : 'Credit Analysis Queue';
    return () => { document.title = 'HOF Fact Find'; };
  }, [items]);

  const openItem = async (item) => {
    const res  = await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', id: item.id, userEmail: user.email }),
    });
    const data = await res.json();
    setSelected({ item, formData: data.item?.form_data || {} });
    setSendingMsg('');
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-analysis', id: selected.item.id, userEmail: user.email, creditAnalysis: {} }),
    });
    setSaving(false);
    await load();
  };

  const handleSendToProcessor = async () => {
    setSaving(true);
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-to-processor', id: selected.item.id, userEmail: user.email, creditAnalysis: {} }),
    });
    setSaving(false);
    setSelected(null);
    await load();
  };

  const pending  = items.filter(i => i.status === 'pending_review');
  const inReview = items.filter(i => i.status === 'in_review');

  if (selected) {
    const fd   = selected.formData || {};
    const secs = fd.securities || [];
    const apps = fd.applicants || [];
    const emps = fd.employment || [];
    const liab = fd.liabilities || {};

    const totalLoan = secs.reduce((s, sec) => s + (parseFloat(sec.loanAmount) || 0), 0);
    const totalProp = secs.reduce((s, sec) => s + (parseFloat(sec.propertyValue) || 0), 0);

    // Income summary per applicant
    const incomeRows = apps.map((a, i) => {
      const emp = emps[i]?.currentEmployment || {};
      const annual = annualise(emp.baseIncome, emp.payFrequency);
      const empType = Array.isArray(emp.employmentType) ? emp.employmentType.join(' / ') : emp.employmentType || '—';
      return { name: [a.firstName, a.lastName].filter(Boolean).join(' ') || `Applicant ${i + 1}`, employer: emp.employer || '—', empType, annual };
    });
    const totalIncome = incomeRows.reduce((s, r) => s + r.annual, 0);

    // Liabilities
    const ccLimit     = (liab.creditCards || []).reduce((s, c) => s + (parseFloat(String(c.limit || '').replace(/,/g, '')) || 0), 0);
    const ccAssessed  = ccLimit * 0.038;
    const personalLoan = (liab.personalLoans || []).reduce((s, l) => s + (parseFloat(String(l.amount || '').replace(/,/g, '')) || 0), 0);
    const hecsBalance = (liab.hecs || []).reduce((s, h) => s + (parseFloat(String(h.amount || '').replace(/,/g, '')) || 0), 0);

    // Deal brief details
    const purpose = [
      (secs[0]?.primaryTransactionTypes || []).join(', '),
      secs[0]?.intendedOccupancy,
      secs[0]?.loanType,
    ].filter(Boolean).join(' · ') || '—';

    const lenderPrefs = fd.lenderPreference || [];
    const priorityMeta = PRIORITY_META[fd.priority] || PRIORITY_META.Medium;

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
        {/* Back bar */}
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
            ← Queue
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.item.client_name || 'Unnamed'}</span>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
          {/* Left: deal data */}
          <div>
            {/* Deal Brief */}
            <div style={{ background: '#12110D', border: '1px solid rgba(203,178,107,0.15)', borderRadius: '12px', padding: '20px 24px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#F5F4F2', marginBottom: '2px' }}>{selected.item.client_name || 'Unnamed'}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(245,244,242,0.45)', marginBottom: '8px' }}>
                    Broker: {fd.brokerName || '—'} · Submitted {relativeTime(selected.item.updated_at)}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '10px', background: priorityMeta.bg, color: priorityMeta.color, flexShrink: 0 }}>
                  {fd.priority || 'Medium'} Priority
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(245,244,242,0.4)', marginBottom: '4px' }}>Purpose</div>
              <div style={{ fontSize: '13px', color: 'rgba(245,244,242,0.75)', marginBottom: '12px' }}>{purpose}</div>
              {lenderPrefs.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', color: 'rgba(245,244,242,0.4)', marginBottom: '6px' }}>Lender preference</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {lenderPrefs.map((l, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(203,178,107,0.1)', color: 'rgba(203,178,107,0.85)', border: '1px solid rgba(203,178,107,0.2)', borderRadius: '12px' }}>{l}</span>
                    ))}
                  </div>
                </>
              )}
              <div style={{ borderTop: '1px solid rgba(203,178,107,0.1)', paddingTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { l: 'Total loan',      v: fmt(totalLoan) },
                  { l: 'Property value', v: fmt(totalProp) },
                  { l: 'Securities',     v: secs.length },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '7px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(245,244,242,0.4)', marginBottom: '2px' }}>{l}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#F5F4F2' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Income Summary */}
            {incomeRows.length > 0 && (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px 24px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Income summary</div>
                {incomeRows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < incomeRows.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.empType} · {r.employer}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{r.annual > 0 ? `${fmt(r.annual)} p.a.` : '—'}</div>
                    </div>
                  </div>
                ))}
                {incomeRows.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: '4px', borderTop: '1px solid var(--border-primary)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Combined gross income</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(totalIncome)} p.a.</span>
                  </div>
                )}
              </div>
            )}

            {/* Securities */}
            {secs.map((sec, i) => (
              <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px 24px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Security {i + 1}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px' }}>{sec.address || '—'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', fontSize: '12px' }}>
                  {[
                    { l: 'Property value', v: sec.propertyValue ? `$${parseFloat(sec.propertyValue).toLocaleString()}` : '—' },
                    { l: 'Loan amount',    v: sec.loanAmount    ? `$${parseFloat(sec.loanAmount).toLocaleString()}` : '—' },
                    { l: 'LVR',           v: sec.lvr ? `${sec.lvr}%` : '—' },
                    { l: 'Transaction',   v: (sec.primaryTransactionTypes || []).join(', ') || '—' },
                    { l: 'Loan type',     v: sec.loanType || '—' },
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

            {/* Liabilities snapshot */}
            {(ccLimit > 0 || personalLoan > 0 || hecsBalance > 0) && (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px 24px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Liabilities snapshot</div>
                {[
                  { l: 'Credit card limits', v: fmt(ccLimit), sub: ccLimit > 0 ? `~${fmt(ccAssessed)}/mo assessed` : null },
                  { l: 'Personal loans', v: fmt(personalLoan) },
                  { l: 'HECS balance', v: fmt(hecsBalance) },
                ].filter(r => r.v !== '—').map(({ l, v, sub }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-primary)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{v}</div>
                      {sub && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Broker Notes */}
            {fd.brokerNotes && (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Broker notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{fd.brokerNotes}</div>
              </div>
            )}
          </div>

          {/* Right: slim action panel */}
          <div style={{ position: 'sticky', top: '16px' }}>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', fontFamily: 'var(--font-heading)' }}>Actions</div>

              {/* Quickli shortcut */}
              <div style={{ background: 'rgba(28,90,140,0.07)', border: '1px solid rgba(28,90,140,0.18)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Key figures for Quickli</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                  {totalLoan > 0 && <div>Loan: <strong style={{ color: 'var(--text-primary)' }}>{fmt(totalLoan)}</strong></div>}
                  {totalIncome > 0 && <div>Income: <strong style={{ color: 'var(--text-primary)' }}>{fmt(totalIncome)} p.a.</strong></div>}
                  {ccLimit > 0 && <div>CC limits: <strong style={{ color: 'var(--text-primary)' }}>{fmt(ccLimit)}</strong></div>}
                </div>
                <a
                  href="https://app.quickli.com.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '8px 12px', background: '#1a3a5c', color: '#7cc8f8', border: '1px solid #2a5a8c', borderRadius: '7px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', justifyContent: 'center' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open Quickli ↗
                </a>
              </div>

              {sendingMsg && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px' }}>{sendingMsg}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save analysis'}
                </button>
                <button onClick={handleSendToProcessor} disabled={saving}
                  style={{ padding: '10px', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--bg-primary)', cursor: 'pointer', fontFamily: 'var(--font-heading)', opacity: saving ? 0.6 : 1 }}>
                  Send to processor →
                </button>
              </div>
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
          <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>Credit Analysis Queue</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Fact finds pending your review and analysis</p>
        </div>

        {loading && <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>}
        {error && <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}

        {!loading && !error && (
          <>
            {[
              { label: 'Pending Review', items: pending, emptyText: 'No fact finds awaiting review.' },
              { label: 'In Review', items: inReview, emptyText: 'Nothing currently in progress.' },
            ].map(({ label, items: group, emptyText }) => (
              <div key={label} style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                  {label} ({group.length})
                </div>
                {group.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {emptyText}
                  </div>
                ) : group.map(item => {
                  const meta = STATUS_META[item.status] || {};
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.client_name || 'Unnamed'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Broker: {item.broker_name || '—'} · {relativeTime(item.updated_at)}
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
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalystDashboard;
