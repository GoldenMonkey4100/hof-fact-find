import React, { useState } from 'react';
import './styles.css';

const Step4Review = ({ formData, onSubmit, submission = {} }) => {

  const [expanded, setExpanded] = useState({ strategy: true, securities: true, applicants: false, employment: false, assets: false, notes: false });
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = [];
    if (!formData.brokerName) errors.push('Broker name is required');
    if (!formData.brokerEmail) errors.push('Broker email is required');
    if (!formData.clientType) errors.push('Client type is required');
    if (!formData.securities || formData.securities.length === 0) errors.push('At least one security property is required');
    if (!formData.applicants || formData.applicants.length === 0) errors.push('Applicant information is required');
    if (formData.employment && formData.employment.length > 0) {
      formData.employment.forEach((emp, i) => {
        if (!emp.meetsRequirement) errors.push(`${emp.applicantName || `Applicant ${i + 1}`} needs 3 years minimum employment history`);
      });
    }
    return errors;
  };

  const errors = validateForm();
  const isValid = errors.length === 0;

  // ── Hero metrics ────────────────────────────────────────────────────────────
  const securities = formData.securities || [];
  const totalLoan  = securities.reduce((s, sec) => s + (parseFloat(sec.loanAmount)    || 0), 0);
  const totalVal   = securities.reduce((s, sec) => s + (parseFloat(sec.propertyValue) || 0), 0);
  const blendedLvr = totalVal > 0 ? ((totalLoan / totalVal) * 100).toFixed(1) : null;
  const lvrHigh    = blendedLvr && parseFloat(blendedLvr) > 80;
  const fmt        = (n) => n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';

  // ── Accordion section helper ────────────────────────────────────────────────
  const Section = ({ id, title, count, children }) => (
    <div style={{ marginBottom: '12px', border: '1px solid var(--border-primary)', borderRadius: '10px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => toggle(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {title}{count != null ? <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '6px' }}>({count})</span> : null}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded[id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded[id] && (
        <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border-primary)' }}>
          {children}
        </div>
      )}
    </div>
  );

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--border-primary)' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'right', maxWidth: '55%' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ background: '#12110D', borderRadius: '14px', padding: '24px 28px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)', marginBottom: '4px' }}>Loan Scenario</div>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: '#F5F4F2' }}>
          {formData.brokerName || 'Unassigned'} · {formData.clientType || 'Unknown type'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Total Loan',     value: fmt(totalLoan) },
            { label: 'Property Value', value: fmt(totalVal) },
            { label: 'Blended LVR',   value: blendedLvr ? `${blendedLvr}%` : '—', warn: lvrHigh },
            { label: 'Applicants',     value: (formData.applicants || []).length || '—' },
          ].map(({ label, value, warn }) => (
            <div key={label} style={{ background: 'rgba(203, 178, 107, 0.12)', border: '1px solid rgba(203, 178, 107, 0.25)', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(245, 244, 242, 0.6)', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: warn ? 'var(--color-primary)' : '#F5F4F2' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Validation banner ─────────────────────────────────────────────────── */}
      {!isValid && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--color-warning-light)', border: '1px solid var(--color-warning)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-warning-dark)', marginBottom: '6px' }}>Required fields incomplete</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--color-warning-dark)', lineHeight: '1.7' }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ── Loan Strategy ─────────────────────────────────────────────────────── */}
      <Section id="strategy" title="Loan Strategy">
        <Row label="Broker"            value={formData.brokerName} />
        <Row label="Applicant Type"    value={formData.applicantType} />
        <Row label="Client Type"       value={formData.clientType} />
        <Row label="Applicants / Guarantors" value={`${formData.numApplicants || 0} / ${formData.numGuarantors || 0}`} />
        {(formData.lenderPreference || []).length > 0 && (
          <Row label="Lender Preference" value={formData.lenderPreference.join(', ')} />
        )}
        {formData.lenderPreferenceOtherNote && (
          <Row label="Other Lender Note" value={formData.lenderPreferenceOtherNote} />
        )}
        {formData.priority && <Row label="Priority" value={formData.priority} />}
      </Section>

      {/* ── Securities ────────────────────────────────────────────────────────── */}
      <Section id="securities" title="Securities" count={securities.length}>
        {securities.map((sec, i) => (
          <div key={sec.id} style={{ marginBottom: i < securities.length - 1 ? '16px' : 0, paddingBottom: i < securities.length - 1 ? '16px' : 0, borderBottom: i < securities.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Security {i + 1}</span>
              {sec.lvr && (
                <span className={parseFloat(sec.lvr) > 80 ? 'badge badge-warning' : 'badge badge-success'}>
                  LVR {sec.lvr}%
                </span>
              )}
            </div>
            <Row label="Address"          value={sec.address} />
            <Row label="Property Value"   value={`$${parseFloat(sec.propertyValue || 0).toLocaleString()}`} />
            <Row label="Loan Amount"      value={`$${parseFloat(sec.loanAmount || 0).toLocaleString()}`} />
            <Row label="Transaction Types" value={[...(sec.primaryTransactionTypes || []), ...(sec.secondaryTransactionTypes || [])].join(', ')} />
            {sec.loanType && <Row label="Loan Type" value={sec.loanType} />}
          </div>
        ))}
        {securities.length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>No securities added.</p>}
      </Section>

      {/* ── Applicants ────────────────────────────────────────────────────────── */}
      <Section id="applicants" title="Applicants" count={(formData.applicants || []).length}>
        {(formData.applicants || []).map((ap, i) => (
          <div key={ap.id} style={{ marginBottom: i < formData.applicants.length - 1 ? '16px' : 0, paddingBottom: i < formData.applicants.length - 1 ? '16px' : 0, borderBottom: i < formData.applicants.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              {ap.role} {ap.number}: {ap.firstName} {ap.lastName}
            </div>
            <Row label="Email"        value={ap.email} />
            <Row label="Phone"        value={ap.mobile || ap.phone} />
            <Row label="Date of Birth" value={ap.dob} />
            <Row label="Address"      value={ap.residentialAddress} />
          </div>
        ))}
        {(formData.applicants || []).length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>No applicants added.</p>}
      </Section>

      {/* ── Employment ────────────────────────────────────────────────────────── */}
      {(formData.employment || []).length > 0 && (
        <Section id="employment" title="Employment" count={formData.employment.length}>
          {formData.employment.map((emp, i) => (
            <div key={i} style={{ marginBottom: i < formData.employment.length - 1 ? '16px' : 0, paddingBottom: i < formData.employment.length - 1 ? '16px' : 0, borderBottom: i < formData.employment.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{emp.applicantName}</span>
                {emp.meetsRequirement
                  ? <span className="badge badge-success">✓ {(emp.totalYears || 0).toFixed(1)} yrs</span>
                  : <span className="badge badge-warning">⚠ {(emp.totalYears || 0).toFixed(1)} / 3 yrs</span>}
              </div>
              {emp.currentEmployment?.employer && (
                <Row label="Current Employer" value={`${emp.currentEmployment.employer} — ${emp.currentEmployment.role || ''}`} />
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ── Assets & Liabilities ──────────────────────────────────────────────── */}
      {(formData.applicants || []).some(a => (a.assets || []).length > 0 || (a.liabilities || []).length > 0) && (
        <Section id="assets" title="Assets & Liabilities">
          {(formData.applicants || []).map((ap) => {
            const ta = (ap.assets || []).reduce((s, a) => s + (parseFloat(a.value) || 0), 0);
            const tl = (ap.liabilities || []).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
            const name = [ap.firstName || ap.role, ap.lastName].filter(Boolean).join(' ');
            return (
              <div key={ap.id} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{name}</div>
                <Row label="Total Assets"      value={`$${Math.round(ta).toLocaleString()}`} />
                <Row label="Total Liabilities" value={`$${Math.round(tl).toLocaleString()}`} />
                <Row label="Net Position"      value={`$${Math.round(ta - tl).toLocaleString()}`} />
              </div>
            );
          })}
        </Section>
      )}

      {/* ── Broker Notes ──────────────────────────────────────────────────────── */}
      {formData.brokerNotes && (
        <Section id="notes" title="Broker Strategy Notes">
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{formData.brokerNotes}</p>
        </Section>
      )}

      {/* ── Sticky Submit Footer ──────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-primary)', borderTop: '1px solid var(--border-primary)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, backdropFilter: 'blur(8px)' }}>
        <div style={{ fontSize: '13px', color: isValid ? 'var(--color-success-dark)' : 'var(--text-secondary)' }}>
          {isValid
            ? '✓ All required fields complete'
            : `${errors.length} issue${errors.length !== 1 ? 's' : ''} to fix`}
        </div>

        {submission.status === 'success' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--color-success-dark)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Submitted successfully
          </div>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!isValid || submission.status === 'checking' || submission.status === 'submitting'}
            className="btn-success"
            style={{ fontSize: '14px', padding: '10px 28px', opacity: (!isValid || submission.status === 'checking' || submission.status === 'submitting') ? 0.6 : 1, cursor: (!isValid || submission.status === 'checking' || submission.status === 'submitting') ? 'not-allowed' : 'pointer' }}
          >
            {submission.status === 'checking'   ? 'Checking duplicates…' :
             submission.status === 'submitting' ? 'Submitting…'          :
             isValid                            ? 'Submit to Processing →' :
             'Complete Required Fields'}
          </button>
        )}
      </div>

    </div>
  );
};

export default Step4Review;
