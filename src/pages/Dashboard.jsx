import React, { useState, useEffect } from 'react';

const BROKERS = [
  { name: 'Laith Hana',              email: 'laith@houseoffinance.com.au' },
  { name: 'Mehdi Amirilayeghi',      email: 'mehdi@houseoffinance.com.au' },
  { name: 'Yousif Jirjis',           email: 'yousif@houseoffinance.com.au' },
  { name: 'Chris Tenaglia',          email: 'chris@houseoffinance.com.au' },
  { name: 'Rita Khaya',              email: 'rita@houseoffinance.com.au' },
];

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 30)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getStoredBroker = () => {
  try { return JSON.parse(localStorage.getItem('hof_broker') || 'null'); } catch { return null; }
};

const Dashboard = ({ onSelectFull, onSelectQuick, onResume }) => {
  const [broker, setBroker]       = useState(getStoredBroker);
  const [pickerVal, setPickerVal] = useState('');
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const load = async (email) => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', brokerEmail: email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (broker) load(broker.email); }, [broker]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectBroker = () => {
    const found = BROKERS.find(b => b.email === pickerVal);
    if (!found) return;
    localStorage.setItem('hof_broker', JSON.stringify(found));
    setBroker(found);
  };

  const handleChangeBroker = () => {
    localStorage.removeItem('hof_broker');
    setBroker(null);
    setItems([]);
    setPickerVal('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeleting(id);
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', brokerEmail: broker.email, id }),
    });
    setDeleting(null);
    await load(broker.email);
  };

  const handleResume = async (id) => {
    const res  = await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', brokerEmail: broker.email, id }),
    });
    const data = await res.json();
    if (data.item) onResume(data.item.form_data, id);
  };

  const drafts    = items.filter(i => i.status === 'draft');
  const submitted = items.filter(i => i.status === 'submitted');

  const Card = ({ item }) => {
    const isDraft = item.status === 'draft';
    const name    = item.client_name || `Unnamed — started ${new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{relativeTime(item.updated_at)}</div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '10px', background: isDraft ? 'var(--color-gold-light)' : '#dcfce7', color: isDraft ? 'var(--color-primary)' : '#16a34a', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {isDraft ? 'Draft' : 'Submitted'}
        </span>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {isDraft ? (
            <>
              <button type="button" onClick={() => handleResume(item.id)}
                style={{ padding: '7px 16px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Resume →
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                style={{ padding: '7px 10px', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', opacity: deleting === item.id ? 0.5 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </>
          ) : (
            <button type="button" onClick={() => handleResume(item.id)}
              style={{ padding: '7px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
              View
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      {/* Header */}
      <div style={{ background: '#12110D', borderBottom: '1px solid rgba(203,178,107,0.2)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="https://hof-hub.vercel.app" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: '800', letterSpacing: '0.12em', color: 'var(--color-primary)', textTransform: 'uppercase' }}>HOF</div>
          <span style={{ fontSize: '13px', color: 'rgba(245,244,242,0.5)' }}>Broker Fact Find</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="https://hof-hub.vercel.app" style={{ fontSize: '12px', color: 'rgba(203,178,107,0.75)', textDecoration: 'none', border: '1px solid rgba(203,178,107,0.2)', borderRadius: '6px', padding: '5px 10px' }}>← Staff Portal</a>
          {broker && (
            <>
              <span style={{ fontSize: '13px', color: 'rgba(245,244,242,0.7)' }}>{broker.name}</span>
              <button onClick={handleChangeBroker} style={{ fontSize: '12px', color: 'rgba(245,244,242,0.5)', background: 'none', border: '1px solid rgba(245,244,242,0.15)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
                Not you?
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Broker picker */}
        {!broker && (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '32px', marginBottom: '32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>Who are you?</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>Select your name to load your fact finds.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <select value={pickerVal} onChange={e => setPickerVal(e.target.value)}
                style={{ padding: '9px 14px', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', minWidth: '200px' }}>
                <option value="">Select broker…</option>
                {BROKERS.map(b => <option key={b.email} value={b.email}>{b.name}</option>)}
              </select>
              <button type="button" onClick={handleSelectBroker} disabled={!pickerVal}
                style={{ padding: '9px 22px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: pickerVal ? 'pointer' : 'not-allowed', opacity: pickerVal ? 1 : 0.5 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {broker && (
          <>
            {/* Page title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>My Fact Finds</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Your submitted and in-progress fact finds</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={onSelectQuick}
                  style={{ padding: '9px 18px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚡ Quick Fact Find
                </button>
                <button type="button" onClick={onSelectFull}
                  style={{ padding: '9px 18px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Full Fact Find
                </button>
              </div>
            </div>

            {loading && (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>
            )}
            {error && (
              <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>
            )}

            {!loading && !error && (
              <>
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                    In Progress ({drafts.length})
                  </div>
                  {drafts.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)', border: '2px dashed var(--border-primary)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No drafts — click "New Fact Find" to start one.
                    </div>
                  ) : drafts.map(item => <Card key={item.id} item={item} />)}
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                    Submitted ({submitted.length})
                  </div>
                  {submitted.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No submissions yet.
                    </div>
                  ) : submitted.map(item => <Card key={item.id} item={item} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
