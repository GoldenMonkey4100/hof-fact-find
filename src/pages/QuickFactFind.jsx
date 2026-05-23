import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../styles.css';
import { BROKER_EMAILS } from '../lib/utils';

const LOAN_PURPOSES = ['Purchase', 'Refinance', 'Construction', 'Other'];

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const LEAD_SOURCES = [
  'Arrow Lawyers','Aus Realty','Barrak Accountants','Blaze Real Estate','Bright Realty',
  'Century 21 Fairfield','Century 21 The Parks','Client Referral','Confederal Tax Law',
  'Convin Group','David Legal','Existing Client','Facebook','Fairmont Legal',
  'Flyer Promotion','FundX','Geneva Law Group','Google','Leading Tax Professionals',
  'Legacy Accounting','Logic Accountant','Melrose Estate Agents','New Client',
  'Outwest Legal','Paramonte Legal','PFS Accountants','Prestige Estate Agents',
  'Prime Real Estate','Self Source','STP Accountant','The Elite Agency',
  'Top Notch Accounting','Trump Lawyers','Website',
];

const BROKERS = Object.keys(BROKER_EMAILS);

const emptyApplicant = () => ({
  firstName: '', lastName: '', mobile: '', email: '',
});

const QuickFactFind = ({ onBack }) => {
  const [applicants, setApplicants] = useState([emptyApplicant()]);
  const [loanPurpose,  setLoanPurpose]  = useState('');
  const [loanAmount,   setLoanAmount]   = useState('');
  const [suburb,       setSuburb]       = useState('');
  const [state,        setState]        = useState('');
  const [broker,       setBroker]       = useState('');
  const [leadSource,   setLeadSource]   = useState('');
  const [notes,        setNotes]        = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const updateApplicant = (idx, field, value) => {
    setApplicants(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const addApplicant = () => setApplicants(prev => [...prev, emptyApplicant()]);
  const removeApplicant = () => setApplicants(prev => prev.slice(0, 1));

  const formatAmount = (raw) => raw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const isValid = () => {
    const a1 = applicants[0];
    return a1.firstName && a1.lastName && a1.mobile && loanPurpose && loanAmount && suburb && broker;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick-submit',
          formData: { applicants, loanPurpose, loanAmount, suburb, state, broker, leadSource, notes },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed');
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="quick-success">
        <div className="quick-success-icon">✓</div>
        <h2 className="quick-success-title">Lead Captured</h2>
        <p className="quick-success-sub">
          Mercury opportunity created and back office notified.
        </p>
        {result?.mercuryUrl && (
          <a href={result.mercuryUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px', textDecoration: 'none' }}>
            Open in Mercury →
          </a>
        )}
        <button type="button" className="btn-secondary" onClick={onBack} style={{ marginTop: '12px', display: 'block', width: '100%' }}>
          ← Back to Start
        </button>
      </div>
    );
  }

  return (
    <div className="quick-ff fade-in">
      <div className="quick-ff-header">
        <p className="welcome-eyebrow" style={{ marginBottom: '4px' }}>House of Finance</p>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px' }}>Quick Fact Find</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Capture essentials now — back office completes the rest.
        </p>
      </div>

      <form className="quick-ff-form" onSubmit={handleSubmit}>

        {/* ── Applicant(s) ─────────────────────────────────────── */}
        <div className="quick-section">
          <div className="quick-section-hdr">
            <span>Applicant Details</span>
            {applicants.length === 1
              ? <button type="button" className="quick-add-btn" onClick={addApplicant}>+ Add Second Applicant</button>
              : <button type="button" className="quick-add-btn quick-add-btn--remove" onClick={removeApplicant}>− Remove Second Applicant</button>
            }
          </div>

          {applicants.map((app, idx) => (
            <div key={idx} className="quick-applicant-block">
              {applicants.length > 1 && (
                <div className="quick-applicant-label">
                  {idx === 0 ? 'Applicant 1' : 'Applicant 2'}
                </div>
              )}
              <div className="quick-grid-2">
                <div>
                  <label>First Name <span className="req">*</span></label>
                  <input type="text" value={app.firstName} onChange={(e) => updateApplicant(idx, 'firstName', e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label>Last Name <span className="req">*</span></label>
                  <input type="text" value={app.lastName} onChange={(e) => updateApplicant(idx, 'lastName', e.target.value)} placeholder="Smith" />
                </div>
                <div>
                  <label>Mobile</label>
                  <input type="tel" value={app.mobile} onChange={(e) => updateApplicant(idx, 'mobile', e.target.value)} placeholder="04XX XXX XXX" />
                </div>
                <div>
                  <label>Email</label>
                  <input type="email" value={app.email} onChange={(e) => updateApplicant(idx, 'email', e.target.value)} placeholder="john@example.com" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Loan Details ──────────────────────────────────────── */}
        <div className="quick-section">
          <div className="quick-section-hdr"><span>Loan Details</span></div>

          <div style={{ marginBottom: '14px' }}>
            <label>Loan Purpose <span className="req">*</span></label>
            <div className="pill-group" style={{ marginTop: '8px' }}>
              {LOAN_PURPOSES.map(p => (
                <button key={p} type="button"
                  className={`pill-btn${loanPurpose === p ? ' pill-btn--active' : ''}`}
                  onClick={() => setLoanPurpose(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label>Estimated Loan Amount <span className="req">*</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '14px', pointerEvents: 'none' }}>$</span>
              <input
                type="text"
                value={loanAmount}
                onChange={(e) => setLoanAmount(formatAmount(e.target.value))}
                placeholder="600,000"
                style={{ paddingLeft: '24px' }}
              />
            </div>
          </div>

          <div className="quick-grid-2">
            <div>
              <label>Property Suburb <span className="req">*</span></label>
              <input type="text" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Parramatta" />
            </div>
            <div>
              <label>State</label>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Select state...</option>
                {AU_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Broker & Source ───────────────────────────────────── */}
        <div className="quick-section">
          <div className="quick-section-hdr"><span>Broker & Source</span></div>
          <div className="quick-grid-2">
            <div>
              <label>Broker <span className="req">*</span></label>
              <select value={broker} onChange={(e) => setBroker(e.target.value)}>
                <option value="">Select broker...</option>
                {BROKERS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label>Lead Source</label>
              <select value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
                <option value="">Select source...</option>
                {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <label>Broker Notes <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-tertiary)' }}>Optional</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context for the back office team…"
              rows={3}
              style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {status === 'error' && (
          <div style={{ padding: '12px 16px', background: 'var(--bg-danger-surface)', border: '1px solid var(--border-danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-danger-emphasis)', marginBottom: '16px' }}>
            ⚠ {errorMsg}
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="quick-actions">
          <button type="button" className="btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <motion.button
            type="submit"
            className="btn-primary"
            disabled={!isValid() || status === 'submitting'}
            style={{ opacity: (!isValid() || status === 'submitting') ? 0.6 : 1 }}
            whileHover={{ scale: isValid() ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit to Mercury →'}
          </motion.button>
        </div>

      </form>
    </div>
  );
};

export default QuickFactFind;
