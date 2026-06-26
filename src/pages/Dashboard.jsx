import React, { useState, useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';

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

const Dashboard = ({ brokerEmail, brokerName, onNewFactFind, onResume }) => {
  const { signOut } = useClerk();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', brokerEmail }),
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

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeleting(id);
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', brokerEmail, id }),
    });
    setDeleting(null);
    await load();
  };

  const handleResume = async (id) => {
    const res  = await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', brokerEmail, id }),
    });
    const data = await res.json();
    if (data.item) onResume(data.item.form_data, id);
  };

  const drafts    = items.filter(i => i.status === 'draft');
  const submitted = items.filter(i => i.status === 'submitted');

  const Card = ({ item }) => {
    const isDraft   = item.status === 'draft';
    const name      = item.client_name || `Unnamed — started ${new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
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
            <>
              {item.mercury_url && (
                <a href={item.mercury_url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '7px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Mercury
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              )}
              <button type="button" onClick={() => handleResume(item.id)}
                style={{ padding: '7px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                View
              </button>
            </>
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
          <span style={{ fontSize: '13px', color: 'rgba(245,244,242,0.7)' }}>{brokerName || brokerEmail}</span>
          <button onClick={() => signOut()} style={{ fontSize: '12px', color: 'rgba(245,244,242,0.5)', background: 'none', border: '1px solid rgba(245,244,242,0.15)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>My Fact Finds</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Your submitted and in-progress fact finds</p>
          </div>
          <button type="button" onClick={onNewFactFind}
            style={{ padding: '10px 22px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
            + New Fact Find
          </button>
        </div>

        {loading && (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>
        )}
        {error && (
          <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>
        )}

        {!loading && !error && (
          <>
            {/* In Progress */}
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

            {/* Submitted */}
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
      </div>
    </div>
  );
};

export default Dashboard;
