import React, { useState, useEffect } from 'react';
import { ROLE_LABELS, getStoredUser } from '../lib/utils';
import AnalystDashboard from './AnalystDashboard';
import ProcessorDashboard from './ProcessorDashboard';
import AdminDashboard from './AdminDashboard';

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

const STATUS_META = {
  draft:             { label: 'Draft',             bg: 'var(--color-gold-light)', color: 'var(--color-primary)' },
  pending_review:    { label: 'Credit Analysis',   bg: '#fef3c7',                color: '#92400e' },
  in_review:         { label: 'Credit Analysis',   bg: '#dbeafe',                color: '#1e40af' },
  pending_lodgement: { label: 'Loan Processing',   bg: '#ede9fe',                color: '#5b21b6' },
  pending_qa:        { label: 'Quality Assurance', bg: '#e0f2fe',                color: '#0369a1' },
  lodged:            { label: 'Lodged',             bg: '#ccfbf1',                color: '#0f766e' },
  submitted:         { label: 'Submitted',          bg: '#dcfce7',                color: '#16a34a' },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '10px', background: meta.bg, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {meta.label}
    </span>
  );
};

// User state lives entirely in the parent Dashboard — BrokerDashboard receives it as props
const BrokerDashboard = ({ user, onSelectFull, onSelectQuick, onResume }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/fact-finds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', brokerEmail: user.email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeleting(id);
    await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', brokerEmail: user.email, id }),
    });
    setDeleting(null);
    await load();
  };

  const handleResume = async (id) => {
    const res  = await fetch('/api/fact-finds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', brokerEmail: user.email, id }),
    });
    const data = await res.json();
    if (data.item) onResume(data.item.form_data, id);
  };

  const drafts    = items.filter(i => i.status === 'draft');
  const submitted = items.filter(i => i.status !== 'draft');

  const Card = ({ item }) => {
    const isDraft = item.status === 'draft';
    const name    = item.client_name || `Unnamed — started ${new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{relativeTime(item.updated_at)}</div>
        </div>
        <StatusBadge status={item.status} />
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
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>My Fact Finds</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Your submitted and in-progress fact finds</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onSelectQuick}
              style={{ padding: '9px 18px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Quick Fact Find
            </button>
            <button type="button" onClick={onSelectFull}
              style={{ padding: '9px 18px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
              Full Fact Find
            </button>
          </div>
        </div>

        {loading && <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading…</div>}
        {error && <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}

        {!loading && !error && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                In Progress ({drafts.length})
              </div>
              {drafts.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)', border: '2px dashed var(--border-primary)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No drafts — click "Full Fact Find" to start one.
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
      </div>
    </div>
  );
};

// ── Root Dashboard — single source of truth for user identity ─────────────────
const Dashboard = ({ onSelectFull, onSelectQuick, onResume, onUserChange, onResumeAs, onStartQA, activeUser: controlledUser, onViewReports }) => {
  const [user, setUser]     = useState(getStoredUser);
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const resolveUser = (found) => {
    localStorage.setItem('hof_user', JSON.stringify(found));
    setUser(found);
    if (onUserChange) onUserChange(found);
  };

  const clearUser = () => {
    localStorage.removeItem('hof_user');
    setUser(null);
    setEmail('');
    setPassword('');
    setLoginError('');
    if (onUserChange) onUserChange(null);
  };

  // Notify parent of initial stored user on mount
  useEffect(() => {
    if (user && onUserChange) onUserChange(user);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync logout when parent clears activeUser
  useEffect(() => {
    if (controlledUser === null && user !== null) {
      setUser(null);
      setEmail('');
      setPassword('');
      setLoginError('');
    }
  }, [controlledUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const [loggingIn, setLoggingIn] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setLoginError(data.error || 'Incorrect email or password.'); return; }
      resolveUser(data.user);
    } catch { setLoginError('Sign in failed. Please try again.'); } finally { setLoggingIn(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (newPassword !== confirmPassword) { setLoginError('New passwords do not match.'); return; }
    if (newPassword.length < 6) { setLoginError('New password must be at least 6 characters.'); return; }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', email: email.trim(), currentPassword: password, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setLoginError(data.error || 'Failed to update password.'); return; }
      setPwdSuccess(true);
    } catch { setLoginError('An error occurred. Please try again.'); } finally { setLoggingIn(false); }
  };

  const resetToLogin = () => {
    setChangingPwd(false);
    setNewPassword('');
    setConfirmPassword('');
    setLoginError('');
    setPwdSuccess(false);
  };

  // Login form — shown when no user is identified
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '40px', maxWidth: '400px', width: '100%' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '11px', letterSpacing: '0.1em' }}>HOF</div>

          {pwdSuccess ? (
            <>
              <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 10px', textAlign: 'center' }}>Password updated</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', textAlign: 'center' }}>Your password has been changed. Sign in with your new password.</p>
              <button onClick={resetToLogin}
                style={{ width: '100%', padding: '11px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-heading)' }}>
                Back to sign in →
              </button>
            </>
          ) : changingPwd ? (
            <>
              <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px', textAlign: 'center' }}>Set your password</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 24px', textAlign: 'center' }}>Enter your current password, then choose a new one.</p>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setLoginError(''); }} placeholder="your@houseoffinance.com.au" autoComplete="email" required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Current password</label>
                  <input type="password" value={password} onChange={e => { setPassword(e.target.value); setLoginError(''); }} placeholder="••••••••" autoComplete="current-password" required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>First time? Your temporary password is <strong>changeme</strong></div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>New password</label>
                  <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setLoginError(''); }} placeholder="Min 6 characters" autoComplete="new-password" required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Confirm new password</label>
                  <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setLoginError(''); }} placeholder="••••••••" autoComplete="new-password" required
                    style={{ width: '100%', padding: '9px 12px', border: loginError ? '1px solid #dc2626' : '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                </div>
                {loginError && <div style={{ fontSize: '12px', color: '#dc2626' }}>{loginError}</div>}
                <button type="submit" disabled={loggingIn}
                  style={{ padding: '11px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: loggingIn ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-heading)', marginTop: '4px', opacity: loggingIn ? 0.7 : 1 }}>
                  {loggingIn ? 'Saving…' : 'Set new password →'}
                </button>
                <button type="button" onClick={resetToLogin}
                  style={{ padding: '9px', background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  ← Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px', textAlign: 'center' }}>Sign in</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 24px', textAlign: 'center' }}>Use your House of Finance email and password</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setLoginError(''); }}
                    placeholder="your@houseoffinance.com.au" autoComplete="email" autoFocus required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Password</label>
                  <input type="password" value={password} onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                    placeholder="••••••••" autoComplete="current-password" required
                    style={{ width: '100%', padding: '9px 12px', border: loginError ? '1px solid #dc2626' : '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                </div>
                {loginError && <div style={{ fontSize: '12px', color: '#dc2626' }}>{loginError}</div>}
                <button type="submit" disabled={loggingIn}
                  style={{ padding: '11px 22px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: loggingIn ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-heading)', marginTop: '4px', opacity: loggingIn ? 0.7 : 1 }}>
                  {loggingIn ? 'Signing in…' : 'Sign in →'}
                </button>
                <button type="button" onClick={() => { setChangingPwd(true); setLoginError(''); }}
                  style={{ padding: '8px', background: 'none', color: 'var(--text-tertiary)', border: 'none', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                  First time? Set your password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // Route by role — "Not you?" is handled by parent App.jsx header button
  if (user.role === 'admin') {
    return <AdminDashboard user={user} onEditAsBroker={onResumeAs} onStartQA={onStartQA} onViewReports={onViewReports} />;
  }
  if (user.role === 'analyst') {
    return <AnalystDashboard user={user} onChangeUser={clearUser} onStartQA={onStartQA} />;
  }
  if (user.role === 'processor') {
    return <ProcessorDashboard user={user} onChangeUser={clearUser} />;
  }

  return (
    <BrokerDashboard
      user={user}
      onSelectFull={onSelectFull}
      onSelectQuick={onSelectQuick}
      onResume={onResume}
    />
  );
};

export default Dashboard;
