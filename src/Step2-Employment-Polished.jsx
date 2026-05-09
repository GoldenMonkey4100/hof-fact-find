import React, { useState, useEffect } from 'react';
import './styles.css';
import { formatCurrencyDisplay, parseCurrency } from './utils';
import SmartCard from './SmartCard';

// ── Income calculation helpers ────────────────────────────────────────────────

const PERIODS = { weekly: 52, fortnightly: 26, monthly: 12, annual: 1 };

const annualiseBase = (amount, freq, hoursPerWeek) => {
  const amt = parseFloat(amount) || 0;
  if (!amt) return 0;
  if (freq === 'hourly') return amt * (parseFloat(hoursPerWeek) || 38) * 52;
  return amt * (PERIODS[freq] || 1);
};

const annualiseYTD = ({ ytdGross, freq, inputMode, currentPeriod, totalPeriods, startDate, payDate }) => {
  const ytd = parseFloat(ytdGross) || 0;
  if (!ytd) return 0;
  const totalPds = parseFloat(totalPeriods) || PERIODS[freq] || 26;
  if (inputMode === 'period') {
    const elapsed = parseFloat(currentPeriod) || 0;
    return elapsed > 0 ? (ytd / elapsed) * totalPds : 0;
  }
  if (!startDate || !payDate) return 0;
  const start = new Date(startDate);
  const end   = new Date(payDate);
  const days  = (end - start) / (1000 * 60 * 60 * 24);
  if (days <= 0) return 0;
  const DAYS_PER_PERIOD = { weekly: 7, fortnightly: 14, monthly: 30.44 };
  const elapsed = days / (DAYS_PER_PERIOD[freq] || 14);
  return elapsed > 0 ? (ytd / elapsed) * totalPds : 0;
};

const getVarianceStatus = (m1Annual, m2Annual) => {
  if (!m1Annual || !m2Annual) return 'incomplete';
  const pct = ((m2Annual - m1Annual) / m1Annual) * 100;
  if (pct > 2)   return 'ytd_higher';
  if (pct >= -2) return 'consistent';
  return 'ytd_lower';
};

const fmt = (n) => n ? formatCurrencyDisplay(Math.round(n).toString()) : '—';
const fileToBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onloadend = () => res(r.result.split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});
const normalizeMediaType = (file) => {
  const MAP = { 'image/jpeg': 'image/jpeg', 'image/jpg': 'image/jpeg', 'image/png': 'image/png', 'image/webp': 'image/webp', 'image/gif': 'image/gif', 'application/pdf': 'application/pdf' };
  return MAP[(file.type || '').toLowerCase()] || 'image/jpeg';
};

// ── SubStepBar (mirrors Step 1) ───────────────────────────────────────────────

const SubStepBar = ({ step, labels, onGoTo }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
    {labels.map((label, i) => {
      const n = i + 1; const done = n < step; const active = n === step;
      return (
        <React.Fragment key={n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: done ? 'pointer' : 'default' }}
            onClick={() => done && onGoTo(n)}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', background: done ? '#10b981' : active ? 'var(--color-primary)' : 'var(--bg-secondary)', color: done || active ? 'white' : 'var(--text-tertiary)', border: done ? '2px solid #10b981' : active ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)' }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontSize: '11px', fontWeight: active ? '600' : '400', color: active ? 'var(--color-primary)' : done ? '#10b981' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: done ? '#10b981' : 'var(--border-primary)', margin: '0 8px', marginBottom: '14px', transition: 'background 0.2s' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Income Verification Modal ─────────────────────────────────────────────────

const EXPLANATIONS = [
  'Recently commenced employment (not yet accumulated full financial year)',
  'Payroll or HR system changed mid-year (gap in records)',
  'Unpaid leave taken (parental, personal, or other)',
  'Pay rate changed during the financial year',
  'Moved from part-time to full-time employment',
  'Other (see notes below)',
];

const IncomeVerifierModal = ({ applicantName, initialData, onSave, onClose }) => {
  const [m1Freq,          setM1Freq]          = useState('annual');
  const [m1Amount,        setM1Amount]        = useState(initialData?.grossPay || '');
  const [m1Hours,         setM1Hours]         = useState(initialData?.hoursWorked || '38');
  const [m2YTDGross,      setM2YTDGross]      = useState(initialData?.ytdGross || '');
  const [m2Freq,          setM2Freq]          = useState(initialData?.payFrequency || 'fortnightly');
  const [m2InputMode,     setM2InputMode]     = useState('period');
  const [m2CurrentPeriod, setM2CurrentPeriod] = useState(initialData?.payPeriodNumber || '');
  const [m2TotalPeriods,  setM2TotalPeriods]  = useState(String(PERIODS[initialData?.payFrequency] || 26));
  const [m2StartDate,     setM2StartDate]     = useState('');
  const [m2PayDate,       setM2PayDate]       = useState(initialData?.payDate || '');
  const [checkedExps,     setCheckedExps]     = useState([]);
  const [otherNotes,      setOtherNotes]      = useState('');

  const m1Annual  = annualiseBase(m1Amount, m1Freq, m1Hours);
  const m2Annual  = annualiseYTD({ ytdGross: m2YTDGross, freq: m2Freq, inputMode: m2InputMode, currentPeriod: m2CurrentPeriod, totalPeriods: m2TotalPeriods, startDate: m2StartDate, payDate: m2PayDate });
  const variance  = m2Annual - m1Annual;
  const variancePct = m1Annual ? (variance / m1Annual) * 100 : 0;
  const status    = getVarianceStatus(m1Annual, m2Annual);

  const statusConfig = {
    incomplete:  { bg: 'var(--bg-secondary)', border: 'var(--border-primary)', color: 'var(--text-secondary)', icon: '📋', text: 'Enter amounts above to see comparison.' },
    consistent:  { bg: 'var(--bg-success-surface)', border: '#86efac', color: 'var(--text-success-emphasis)', icon: '✓',  text: 'YTD annualised income is consistent with base income. No issues.' },
    ytd_higher:  { bg: 'var(--bg-info-surface)', border: '#bae6fd', color: 'var(--text-info)', icon: 'ℹ️', text: 'YTD is higher than base — likely overtime or allowances. Lenders will typically only accept the base income for servicing unless the higher income is proven consistent over 2 years.' },
    ytd_lower:   { bg: 'var(--bg-warning-surface)', border: 'var(--border-warning)', color: 'var(--text-warning-emphasis)', icon: '⚠️', text: 'YTD is lower than base. This is the income figure lenders will use. An explanation is required.' },
  };
  const cfg = statusConfig[status];

  const toggleExp = (exp) => setCheckedExps(prev => prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp]);

  const handleSave = () => {
    onSave({
      m1Annual, m1Freq, m1Amount: parseFloat(m1Amount) || 0, m1Hours: parseFloat(m1Hours) || 38,
      m2Annual, m2YTDGross: parseFloat(m2YTDGross) || 0, m2Freq, m2InputMode, m2CurrentPeriod, m2TotalPeriods, m2StartDate, m2PayDate,
      variance, variancePct, status, explanations: checkedExps, otherNotes,
      verifiedAt: new Date().toISOString()
    });
  };

  const labelStyle = { fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };
  const inputStyle = { fontSize: '13px', marginBottom: 0 };

  return (
    <div style={{ marginTop: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', overflow: 'hidden' }}>
      <div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>💰 Income Verification Tool</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{applicantName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px' }}>✕</button>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Method 1 — Base Income</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Pay Frequency</label>
                <select value={m1Freq} onChange={(e) => setM1Freq(e.target.value)} style={inputStyle}>
                  <option value="hourly">Hourly rate</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual salary</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>
                  {m1Freq === 'hourly' ? 'Hourly Rate ($)' : m1Freq === 'weekly' ? 'Weekly Gross ($)' : m1Freq === 'fortnightly' ? 'Fortnightly Gross ($)' : m1Freq === 'monthly' ? 'Monthly Gross ($)' : 'Annual Salary ($)'}
                </label>
                <input type="number" value={m1Amount} onChange={(e) => setM1Amount(e.target.value)} placeholder="0.00" style={inputStyle} />
              </div>
              {m1Freq === 'hourly' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Ordinary Hours per Week</label>
                  <input type="number" value={m1Hours} onChange={(e) => setM1Hours(e.target.value)} placeholder="38" style={inputStyle} />
                </div>
              )}
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Annualised Base Income</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: m1Annual ? 'var(--color-success-dark)' : 'var(--text-tertiary)' }}>{m1Annual ? fmt(m1Annual) : '—'}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Method 2 — YTD Annualisation</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>YTD Gross Earnings (from payslip)</label>
                <input type="number" value={m2YTDGross} onChange={(e) => setM2YTDGross(e.target.value)} placeholder="0.00" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Pay Frequency</label>
                <select value={m2Freq} onChange={(e) => { setM2Freq(e.target.value); setM2TotalPeriods(String(PERIODS[e.target.value] || 26)); }} style={inputStyle}>
                  <option value="weekly">Weekly (52 periods/year)</option>
                  <option value="fortnightly">Fortnightly (26 periods/year)</option>
                  <option value="monthly">Monthly (12 periods/year)</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Calculate by</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[['period', 'Pay Period #'], ['date', 'Start Date']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setM2InputMode(val)} style={{
                      flex: 1, padding: '6px', border: `1px solid ${m2InputMode === val ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                      background: m2InputMode === val ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                      color: m2InputMode === val ? 'var(--color-primary)' : 'var(--text-secondary)',
                      borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>
              {m2InputMode === 'period' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Current Period #</label>
                    <input type="number" value={m2CurrentPeriod} onChange={(e) => setM2CurrentPeriod(e.target.value)} placeholder="e.g. 15" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Periods per Year</label>
                    <input type="number" value={m2TotalPeriods} onChange={(e) => setM2TotalPeriods(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={labelStyle}>Employment Start Date</label>
                    <input type="date" value={m2StartDate} onChange={(e) => setM2StartDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Payslip Pay Date</label>
                    <input type="date" value={m2PayDate} onChange={(e) => setM2PayDate(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Annualised YTD Income</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: m2Annual ? 'var(--color-success-dark)' : 'var(--text-tertiary)' }}>{m2Annual ? fmt(m2Annual) : '—'}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '10px', marginBottom: status === 'ytd_lower' ? '16px' : '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Base Income</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(m1Annual)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>YTD Annualised</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(m2Annual)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Variance</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: variance < 0 ? '#dc2626' : '#16a34a' }}>
                  {m1Annual && m2Annual ? `${variance >= 0 ? '+' : ''}${variancePct.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '20px' }}>{cfg.icon}</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: cfg.color }}>{cfg.text}</p>
          </div>

          {status === 'ytd_lower' && (
            <div style={{ padding: '16px', background: 'var(--bg-warning-surface)', border: '1px solid var(--border-warning)', borderRadius: '10px', marginBottom: '0', marginTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-warning-emphasis)' }}>Explanation required — select all that apply:</h4>
              {EXPLANATIONS.map(exp => (
                <label key={exp} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={checkedExps.includes(exp)} onChange={() => toggleExp(exp)} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#7c2d12' }}>{exp}</span>
                </label>
              ))}
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-warning-emphasis)', display: 'block', marginBottom: '4px' }}>Additional notes</label>
                <textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)}
                  placeholder="Any additional context the lender may need…" rows={3}
                  style={{ width: '100%', fontSize: '13px', padding: '8px', border: '1px solid var(--border-warning)', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-primary)' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!m1Annual || !m2Annual} style={{ opacity: (!m1Annual || !m2Annual) ? 0.5 : 1 }}>
            Save Verification
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Step2 component ──────────────────────────────────────────────────────

const Step2Employment = ({ formData, updateFormData }) => {
  const [employmentRecords, setEmploymentRecords] = useState([]);
  const [payslipState,    setPayslipState]    = useState({});
  const [verifierExpanded, setVerifierExpanded] = useState({});
  const [abnLookup,        setAbnLookup]        = useState({});

  // Sub-step tracking per applicant id (1 = Current Employment, 2 = Income & History)
  const [employmentStep, setEmploymentStep] = useState({});
  const getEmpStep  = (id) => employmentStep[id] || 1;
  const goToEmpStep = (id, n) => setEmploymentStep(p => ({ ...p, [id]: n }));

  const getApplicantType = (applicantId) =>
    (formData.applicants || []).find(a => a.id === applicantId)?.type || 'Natural Person';

  // ── Sync employment records ─────────────────────────────────────────────────
  useEffect(() => {
    if (!formData.applicants?.length) return;
    const records = formData.applicants.map((applicant) => {
      const applicantName = applicant.type === 'Company Borrower'
        ? (applicant.companyName || `${applicant.role} ${applicant.number}`)
        : `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() || `${applicant.role} ${applicant.number}`;

      const existing = (formData.employment || []).find(r => r.applicantId === applicant.id);
      if (existing) return { ...existing, applicantName };
      return {
        applicantId: applicant.id,
        applicantName,
        currentEmployment: {
          employmentType: applicant.type === 'Company Borrower' ? 'Self-Employed' : '',
          employer: '', role: '', startDate: '', abn: '',
          entityType: '', receivingCentrelink: false, incomeVerification: null,
          payFrequency: '', baseIncome: '', bonusIncome: '', commissions: '', hecs: ''
        },
        previousEmployments: [],
        totalYears: 0,
        meetsRequirement: false
      };
    });
    setEmploymentRecords(records);
  }, [formData.applicants]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tenure calculations ─────────────────────────────────────────────────────
  const calculateTenure = (startDate, endDate = null) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end   = endDate ? new Date(endDate) : new Date();
    return Math.abs(end - start) / (1000 * 60 * 60 * 24 * 365.25);
  };

  const calculateTotalYears = (record) => {
    let total = 0;
    if (record.currentEmployment.startDate &&
        record.currentEmployment.employmentType !== 'Unemployed' &&
        record.currentEmployment.employmentType !== 'Retired') {
      total += calculateTenure(record.currentEmployment.startDate);
    }
    record.previousEmployments.forEach(emp => {
      if (emp.startDate && emp.endDate) total += calculateTenure(emp.startDate, emp.endDate);
    });
    return total;
  };

  // ── ABN lookup ──────────────────────────────────────────────────────────────
  const lookupABN = async (key, abn, onSuccess) => {
    const clean = (abn || '').replace(/\D/g, '');
    if (clean.length !== 11) return;
    setAbnLookup(p => ({ ...p, [key]: { loading: true, result: null, error: null } }));
    try {
      const res  = await fetch(`/api/abn-lookup?abn=${clean}`);
      const data = await res.json();
      if (data.error) {
        setAbnLookup(p => ({ ...p, [key]: { loading: false, result: null, error: data.error } }));
      } else {
        setAbnLookup(p => ({ ...p, [key]: { loading: false, result: data, error: null } }));
        if (onSuccess) onSuccess(data);
      }
    } catch (err) {
      setAbnLookup(p => ({ ...p, [key]: { loading: false, result: null, error: err.message } }));
    }
  };

  const ABNField = ({ idx, empKey, value, onChange, onABNResult }) => {
    const key    = `${idx}-${empKey}`;
    const lookup = abnLookup[key] || {};
    const clean  = (value || '').replace(/\D/g, '');
    const ready  = clean.length === 11;
    return (
      <div>
        <label style={{ fontSize: '13px' }}>
          Employer ABN
          {lookup.result && <span style={{ marginLeft: '6px', fontSize: '11px', color: lookup.result.status === 'Active' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
            {lookup.result.status === 'Active' ? '✓ Active' : '✗ ' + lookup.result.status}
          </span>}
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="text" value={value || ''} placeholder="XX XXX XXX XXX" style={{ flex: 1 }}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => ready && lookupABN(key, value, onABNResult)} />
          <button type="button" disabled={!ready || lookup.loading}
            onClick={() => lookupABN(key, value, onABNResult)}
            style={{ padding: '0 10px', background: ready ? '#0369a1' : '#e2e8f0', color: ready ? 'white' : '#9ca3af', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: ready ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
            {lookup.loading ? '…' : '🔍 Verify'}
          </button>
        </div>
        {lookup.result && (
          <div style={{ fontSize: '11px', color: 'var(--text-success-emphasis)', marginTop: '3px', lineHeight: '1.6' }}>
            <div>{lookup.result.entityName}{lookup.result.tradingNames?.[0] ? ` (${lookup.result.tradingNames[0]})` : ''} · {lookup.result.entityType}</div>
            <div style={{ color: 'var(--text-primary)' }}>
              {lookup.result.abnFrom ? `ABN from: ${lookup.result.abnFrom}` : ''}
              {lookup.result.gstRegistered
                ? ` · GST Registered${lookup.result.gstDate ? ` from ${lookup.result.gstDate}` : ''}`
                : ' · Not GST Registered'}
            </div>
          </div>
        )}
        {lookup.error && <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', marginTop: '3px' }}>⚠ {lookup.error}</div>}
      </div>
    );
  };

  // ── State updaters ──────────────────────────────────────────────────────────
  const updateCurrentEmployment = (idx, field, value) => {
    const updated = [...employmentRecords];
    updated[idx].currentEmployment[field] = value;
    updated[idx].totalYears = calculateTotalYears(updated[idx]);
    updated[idx].meetsRequirement = updated[idx].totalYears >= 3;
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  const addPreviousEmployment = (idx) => {
    const updated = [...employmentRecords];
    updated[idx].previousEmployments.push({ id: Date.now(), employmentType: '', employer: '', role: '', startDate: '', endDate: '', abn: '' });
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  const updatePreviousEmployment = (idx, empIdx, field, value) => {
    const updated = [...employmentRecords];
    updated[idx].previousEmployments[empIdx][field] = value;
    updated[idx].totalYears = calculateTotalYears(updated[idx]);
    updated[idx].meetsRequirement = updated[idx].totalYears >= 3;
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  const removePreviousEmployment = (idx, empIdx) => {
    const updated = [...employmentRecords];
    updated[idx].previousEmployments = updated[idx].previousEmployments.filter((_, i) => i !== empIdx);
    updated[idx].totalYears = calculateTotalYears(updated[idx]);
    updated[idx].meetsRequirement = updated[idx].totalYears >= 3;
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  // ── Payslip helpers ─────────────────────────────────────────────────────────
  const updatePayslip = (idx, patch) =>
    setPayslipState(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), ...patch } }));

  const setPayslipFile = (idx, file) => {
    const old = payslipState[idx]?.previewUrl;
    if (old) URL.revokeObjectURL(old);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    updatePayslip(idx, { files: file ? [file] : [], previewUrl, data: null, error: null, previewOpen: !!file });
  };

  const handlePayslipDrop = (idx, e) => {
    e.preventDefault();
    updatePayslip(idx, { dragging: false });
    const file = e.dataTransfer.files[0];
    if (file) setPayslipFile(idx, file);
  };

  const handlePayslipExtract = async (idx) => {
    const ps = payslipState[idx] || {};
    const file = ps.files?.[0];
    if (!file) return;
    updatePayslip(idx, { extracting: true, error: null });
    try {
      const base64    = await fileToBase64(file);
      const mediaType = normalizeMediaType(file);
      const res  = await fetch('/api/extract-payslip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [{ base64, mediaType }] })
      });
      const data = await res.json();
      if (data.error) { updatePayslip(idx, { extracting: false, error: data.error }); return; }
      updatePayslip(idx, { extracting: false, data });

      try {
        const ext = file.name.split('.').pop() || 'pdf';
        const blobRes = await fetch('/api/upload-blob', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: `payslip-${idx}-${Date.now()}.${ext}`, contentType: normalizeMediaType(file) }),
        });
        const blobData = await blobRes.json();
        if (blobData.url) updateCurrentEmployment(idx, 'payslipUrl', blobData.url);
      } catch (e) {
        console.warn('[Payslip Blob upload] failed:', e.message);
      }

      if (data.employerName)  updateCurrentEmployment(idx, 'employer',    data.employerName);
      if (data.employerABN)   updateCurrentEmployment(idx, 'abn',         data.employerABN);
      if (data.jobTitle)      updateCurrentEmployment(idx, 'role',        data.jobTitle);
      if (data.payFrequency && data.payFrequency !== 'unknown') updateCurrentEmployment(idx, 'payFrequency', data.payFrequency);
      if (data.grossPay) {
        const freq = data.payFrequency || 'fortnightly';
        const annualised = Math.round(parseFloat(data.grossPay) * (PERIODS[freq] || 26));
        updateCurrentEmployment(idx, 'baseIncome', String(annualised));
      }
      if (data.taxAnalysis?.flag === 'higher_than_expected') updateCurrentEmployment(idx, 'hecs', 'Yes');
    } catch (err) {
      updatePayslip(idx, { extracting: false, error: err.message });
    }
  };

  // ── Quick Actions (Payslip tile + Income Verifier tile) ─────────────────────
  const renderEmploymentQuickActions = (record, idx) => {
    const ps        = payslipState[idx] || {};
    const file      = ps.files?.[0];
    const hasFile   = !!file;
    const extracting = !!ps.extracting;
    const extracted  = !!ps.data;
    const iv        = record.currentEmployment.incomeVerification;
    const inputId   = `ps-qa-${idx}`;

    const ivStatusMap = {
      consistent: { label: '✓ Consistent', bg: '#f0fdf4', border: '#86efac', color: '#16a34a' },
      ytd_higher: { label: 'ℹ YTD Higher', bg: 'var(--bg-info-surface)', border: '#bae6fd', color: '#0369a1' },
      ytd_lower:  { label: '⚠ YTD Lower', bg: 'var(--bg-warning-surface)', border: 'var(--border-warning)', color: '#b45309' },
    };
    const ivCfg = iv ? (ivStatusMap[iv.status] || ivStatusMap.consistent) : null;

    const tile = (extra = {}) => ({
      padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-primary)',
      background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '10px',
      ...extra,
    });

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>

        {/* Payslip tile */}
        <div style={tile(extracted ? { background: 'var(--bg-success-surface)', borderColor: 'var(--border-success)' } : {})}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>📄</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>Payslip</span>
            {extracted && <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '1px 7px', borderRadius: '10px' }}>✓ DONE</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {hasFile
              ? <>{file.name.length > 22 ? file.name.slice(0, 22) + '…' : file.name}{extracted && ps.data?.employerName ? <><br /><span style={{ color: 'var(--text-success-emphasis)', fontWeight: '600' }}>{ps.data.employerName}</span></> : null}</>
              : 'No file selected'}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input id={inputId} type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files[0]) setPayslipFile(idx, e.target.files[0]); }} />
            <label htmlFor={inputId} style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)' }}>
              📄 {hasFile ? 'Replace' : 'Upload'}
            </label>
            <button type="button" disabled={!hasFile || extracting} onClick={() => handlePayslipExtract(idx)}
              style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: hasFile && !extracting ? '#0369a1' : '#e2e8f0', color: hasFile && !extracting ? 'white' : '#9ca3af', border: 'none', borderRadius: '6px', cursor: hasFile && !extracting ? 'pointer' : 'not-allowed' }}>
              {extracting ? '…' : '✨ Extract'}
            </button>
          </div>
          {ps.error && <div style={{ fontSize: '10px', color: 'var(--text-danger-emphasis)' }}>⚠ {ps.error}</div>}
        </div>

        {/* Income Verifier tile */}
        <div style={tile(ivCfg ? { background: ivCfg.bg, borderColor: ivCfg.border } : {})}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>💰</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>Income Verifier</span>
            {ivCfg && <span style={{ fontSize: '10px', fontWeight: '700', color: ivCfg.color, background: 'transparent', padding: '1px 0' }}>{ivCfg.label}</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {iv
              ? <>Base: <strong>{fmt(iv.m1Annual)}</strong> · YTD: <strong>{fmt(iv.m2Annual)}</strong><br />Variance: <strong style={{ color: iv.variancePct < -2 ? '#dc2626' : 'var(--text-primary)' }}>{iv.variancePct?.toFixed(1)}%</strong></>
              : 'No verification yet'}
          </div>
          <button type="button"
            onClick={() => { goToEmpStep(record.applicantId, 2); setVerifierExpanded(p => ({ ...p, [idx]: true })); }}
            style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: iv ? 'var(--bg-primary)' : 'var(--color-primary)', color: iv ? 'var(--text-primary)' : 'white', border: iv ? '1px solid var(--border-primary)' : 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {iv ? '✏️ Edit Verification' : 'Open Verifier'}
          </button>
        </div>

      </div>
    );
  };

  // ── Payslip Step 2 section (preview + extracted summary) ────────────────────
  const renderPayslipStep2 = (record, idx) => {
    const ps          = payslipState[idx] || {};
    const file        = ps.files?.[0];
    const hasFile     = !!file;
    const isPDF       = file?.type === 'application/pdf';
    const isPreviewOpen = !!ps.previewOpen;

    if (!hasFile) return null;

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '7px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>📄 {file.name.length > 30 ? file.name.slice(0, 30) + '…' : file.name}</span>
          <button type="button" onClick={() => updatePayslip(idx, { previewOpen: !isPreviewOpen })}
            style={{ fontSize: '12px', fontWeight: '600', color: isPreviewOpen ? 'var(--text-secondary)' : 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {isPreviewOpen ? '▲ Hide' : '👁 View payslip'}
          </button>
        </div>
        {isPreviewOpen && (
          <div style={{ marginBottom: '8px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
            {isPDF
              ? <embed src={ps.previewUrl} type="application/pdf" width="100%" style={{ height: '520px', display: 'block' }} />
              : <img src={ps.previewUrl} alt="Payslip preview" style={{ width: '100%', display: 'block', objectFit: 'contain', background: 'var(--bg-secondary)' }} />
            }
          </div>
        )}
        {ps.data && (
          <div style={{ padding: '10px 14px', background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '8px', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-success-emphasis)', marginBottom: '6px' }}>✓ Payslip extracted — form fields pre-filled below</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                ['Employer', ps.data.employerName], ['ABN', ps.data.employerABN], ['Job Title', ps.data.jobTitle],
                ['Pay Date', ps.data.payDate], ['Gross/Period', ps.data.grossPay ? `$${Number(ps.data.grossPay).toLocaleString()}` : ''],
                ['YTD Gross', ps.data.ytdGross ? `$${Number(ps.data.ytdGross).toLocaleString()}` : ''],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}: </span>
                  <span style={{ fontWeight: '600', color: 'var(--text-success-emphasis)' }}>{val}</span>
                </div>
              ))}
            </div>
            {ps.data.taxAnalysis && (() => {
              const ta = ps.data.taxAnalysis;
              const isHigh = ta.flag === 'higher_than_expected';
              const color  = isHigh ? '#92400e' : '#1e40af';
              const bg     = isHigh ? '#fefce8' : '#eff6ff';
              const border = isHigh ? '#fde68a' : '#bfdbfe';
              return (
                <div style={{ marginTop: '6px', padding: '6px 10px', background: bg, border: `1px solid ${border}`, borderRadius: '6px', fontSize: '11px', color }}>
                  <strong>Tax Check:</strong> {ta.note}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // ── 3-Year History tracker ──────────────────────────────────────────────────
  const renderHistoryTracker = (record, idx) => {
    const totalYears = record.totalYears;
    const met        = record.meetsRequirement;
    const pct        = Math.min((totalYears / 3) * 100, 100);
    const ty         = Math.floor(totalYears);
    const tm         = Math.round((totalYears - ty) * 12);

    return (
      <div style={{ border: '1px solid var(--border-primary)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⏱</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>3-Year Employment History</span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '10px', background: met ? '#dcfce7' : '#fef9c3', color: met ? '#15803d' : '#92400e' }}>
              {met ? `✓ ${ty}y ${tm}m` : `⚠ ${ty}y ${tm}m / 3y needed`}
            </span>
          </div>
          <button type="button" onClick={() => addPreviousEmployment(idx)}
            style={{ fontSize: '12px', fontWeight: '600', padding: '5px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
            + Add Previous
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
          <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: met ? '#10b981' : 'var(--color-primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Current employment row */}
        {record.currentEmployment.employer && record.currentEmployment.startDate && (
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: record.previousEmployments.length > 0 ? '1px solid var(--border-primary)' : 'none', background: 'var(--bg-primary)' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1', background: '#dbeafe', padding: '2px 7px', borderRadius: '10px', flexShrink: 0 }}>CURRENT</span>
            <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, color: 'var(--text-primary)' }}>{record.currentEmployment.employer}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {new Date(record.currentEmployment.startDate).getFullYear()}–present
            </span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#0369a1', minWidth: '40px', textAlign: 'right' }}>
              {calculateTenure(record.currentEmployment.startDate).toFixed(1)}y
            </span>
          </div>
        )}

        {/* Previous employment rows */}
        {record.previousEmployments.map((prev, empIdx) => (
          prev.employer && prev.startDate && prev.endDate ? (
            <div key={prev.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: empIdx < record.previousEmployments.length - 1 ? '1px solid var(--border-primary)' : 'none', background: 'var(--bg-primary)' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', background: 'var(--bg-secondary)', padding: '2px 7px', borderRadius: '10px', flexShrink: 0 }}>PREV {empIdx + 1}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, color: 'var(--text-primary)' }}>{prev.employer}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {new Date(prev.startDate).getFullYear()}–{new Date(prev.endDate).getFullYear()}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', minWidth: '40px', textAlign: 'right' }}>
                {calculateTenure(prev.startDate, prev.endDate).toFixed(1)}y
              </span>
            </div>
          ) : null
        ))}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">

      <div className="mb-6">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
          Provide employment history for all applicants. Minimum 3 years total employment required.
        </p>
        <div style={{ padding: '12px 16px', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-warning-dark)' }}>
            ⚠️ <strong>Important:</strong> If current employment is less than 3 years, add previous employment to meet the requirement.
          </p>
        </div>
      </div>

      {employmentRecords.map((record, index) => {
        const appType           = getApplicantType(record.applicantId);
        const isCompanyBorrower = appType === 'Company Borrower';
        const empStep           = getEmpStep(record.applicantId);

        const empSummary = [
          isCompanyBorrower ? 'Company Borrower' : record.currentEmployment.employer,
          isCompanyBorrower ? null : record.currentEmployment.employmentType,
          record.totalYears > 0 ? `${record.totalYears.toFixed(1)} yrs` : null,
        ].filter(Boolean).join(' · ') || null;
        const empStatus = record.meetsRequirement ? 'done' : record.totalYears > 0 ? 'partial' : 'empty';

        const fmtInc = (v) => {
          const n = parseFloat((v || '').toString().replace(/,/g, ''));
          if (!n) return '';
          return n.toLocaleString('en-AU');
        };
        const fmtIncDisplay = (v) => {
          const n = parseFloat((v || '').toString().replace(/,/g, ''));
          if (!n) return null;
          return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(n);
        };
        const HECSBtn = ({ val }) => (
          <button type="button" onClick={() => updateCurrentEmployment(index, 'hecs', val)}
            style={{ flex: 1, padding: '7px 0', border: `1px solid ${record.currentEmployment.hecs === val ? 'var(--color-primary)' : 'var(--border-primary)'}`, background: record.currentEmployment.hecs === val ? 'var(--color-primary-light)' : 'var(--bg-primary)', color: record.currentEmployment.hecs === val ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{val}</button>
        );

        return (
          <SmartCard
            key={record.applicantId}
            icon={isCompanyBorrower ? '🏢' : '💼'}
            title={record.applicantName}
            summary={empSummary}
            status={empStatus}
            defaultOpen={record.totalYears === 0}
          >

            {/* ── Company Borrower ── */}
            {isCompanyBorrower && (
              <div className="mb-6">
                {renderEmploymentQuickActions(record, index)}
                <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Employment Type:</span>
                  <span className="badge badge-info" style={{ fontSize: '13px' }}>Self-Employed</span>
                </div>
                <div className="mb-4">
                  <label>Entity Type</label>
                  <select value={record.currentEmployment.entityType || ''} onChange={(e) => updateCurrentEmployment(index, 'entityType', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Company">Company</option>
                    <option value="Trust">Trust</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Business / Trading Name</label>
                    <input type="text" value={record.currentEmployment.employer} onChange={(e) => updateCurrentEmployment(index, 'employer', e.target.value)} placeholder="Trading name" />
                  </div>
                  <div>
                    <ABNField idx={index} empKey="self-current" value={record.currentEmployment.abn}
                      onChange={(v) => updateCurrentEmployment(index, 'abn', v)}
                      onABNResult={(r) => { if (!record.currentEmployment.employer && r.tradingNames?.[0]) updateCurrentEmployment(index, 'employer', r.tradingNames[0]); }} />
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div>
                    <label>Role / Position</label>
                    <input type="text" value={record.currentEmployment.role} onChange={(e) => updateCurrentEmployment(index, 'role', e.target.value)} placeholder="e.g. Director" />
                  </div>
                  <div>
                    <label>Business Start Date</label>
                    <input type="date" value={record.currentEmployment.startDate} onChange={(e) => updateCurrentEmployment(index, 'startDate', e.target.value)} />
                    {record.currentEmployment.startDate && <div className="hint-text">{calculateTenure(record.currentEmployment.startDate).toFixed(1)} years</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Natural Person / Director Guarantor — Quick Actions + 2-step ── */}
            {!isCompanyBorrower && (
              <>
                {renderEmploymentQuickActions(record, index)}

                <SubStepBar
                  step={empStep}
                  labels={['Current Employment', 'Income & History']}
                  onGoTo={(n) => goToEmpStep(record.applicantId, n)}
                />

                {/* Step 1: Current Employment */}
                {empStep === 1 && (
                  <div>
                    <div className="mb-4">
                      <label>Employment Type</label>
                      <div className="pill-group">
                        {['Full-Time', 'Part-Time', 'Casual', 'Self-Employed', 'Contract', 'Unemployed', 'Retired'].map(t => (
                          <button key={t} type="button"
                            className={`pill-btn${record.currentEmployment.employmentType === t ? ' pill-btn--active' : ''}`}
                            onClick={() => updateCurrentEmployment(index, 'employmentType', record.currentEmployment.employmentType === t ? '' : t)}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {record.currentEmployment.employmentType === 'Self-Employed' && (
                      <div className="mb-4">
                        <label>Entity Type</label>
                        <select value={record.currentEmployment.entityType || ''} onChange={(e) => updateCurrentEmployment(index, 'entityType', e.target.value)}>
                          <option value="">Select Entity Type...</option>
                          <option value="Sole Trader">Sole Trader</option>
                          <option value="Partnership">Partnership</option>
                          <option value="Company">Company</option>
                          <option value="Trust">Trust</option>
                        </select>
                      </div>
                    )}

                    {record.currentEmployment.employmentType === 'Unemployed' && (
                      <div className="mb-4" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" checked={record.currentEmployment.receivingCentrelink || false}
                            onChange={(e) => updateCurrentEmployment(index, 'receivingCentrelink', e.target.checked)} style={{ marginRight: '8px' }} />
                          <span>Receiving Government Benefits (Centrelink)</span>
                        </label>
                      </div>
                    )}

                    {record.currentEmployment.employmentType &&
                     record.currentEmployment.employmentType !== 'Unemployed' &&
                     record.currentEmployment.employmentType !== 'Retired' && (
                      <>
                        <div className="grid grid-cols-2 mb-4">
                          <div>
                            <label>Employer Name</label>
                            <input type="text" value={record.currentEmployment.employer} onChange={(e) => updateCurrentEmployment(index, 'employer', e.target.value)} placeholder="Company name" />
                          </div>
                          <div>
                            <label>Job Title / Role</label>
                            <input type="text" value={record.currentEmployment.role} onChange={(e) => updateCurrentEmployment(index, 'role', e.target.value)} placeholder="e.g., Senior Developer" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 mb-4">
                          <div>
                            <label>Start Date</label>
                            <input type="date" value={record.currentEmployment.startDate} onChange={(e) => updateCurrentEmployment(index, 'startDate', e.target.value)} />
                            {record.currentEmployment.startDate && <div className="hint-text">{calculateTenure(record.currentEmployment.startDate).toFixed(1)} years</div>}
                          </div>
                          <div>
                            <ABNField idx={index} empKey="paye-current" value={record.currentEmployment.abn}
                              onChange={(v) => updateCurrentEmployment(index, 'abn', v)}
                              onABNResult={(r) => { if (!record.currentEmployment.employer && r.entityName) updateCurrentEmployment(index, 'employer', r.tradingNames?.[0] || r.entityName); }} />
                          </div>
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button type="button" className="btn-primary"
                        onClick={() => goToEmpStep(record.applicantId, 2)}
                        style={{ padding: '9px 24px', fontSize: '13px' }}>
                        Next: Income &amp; History →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Income & History */}
                {empStep === 2 && (
                  <div>
                    {/* Payslip preview (if uploaded via Quick Actions) */}
                    {renderPayslipStep2(record, index)}

                    {/* Income Details */}
                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Income Details</h4>
                      <div className="grid grid-cols-2 mb-3">
                        <div>
                          <label style={{ fontSize: '12px' }}>Pay Frequency</label>
                          <div className="pill-group" style={{ marginTop: '6px' }}>
                            {[['weekly', 'Weekly'], ['fortnightly', 'Fortnightly'], ['monthly', 'Monthly']].map(([val, lbl]) => (
                              <button key={val} type="button"
                                className={`pill-btn${record.currentEmployment.payFrequency === val ? ' pill-btn--active' : ''}`}
                                style={{ fontSize: '12px', padding: '6px 11px' }}
                                onClick={() => updateCurrentEmployment(index, 'payFrequency', record.currentEmployment.payFrequency === val ? '' : val)}>
                                {lbl}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px' }}>Base Income (annual)</label>
                          <input type="text" value={fmtInc(record.currentEmployment.baseIncome)} placeholder="0"
                            onChange={(e) => updateCurrentEmployment(index, 'baseIncome', parseCurrency(e.target.value))}
                            style={{ fontSize: '13px' }} />
                          {fmtIncDisplay(record.currentEmployment.baseIncome) && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{fmtIncDisplay(record.currentEmployment.baseIncome)}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px' }}>Bonus Income (annual)</label>
                          <input type="text" value={fmtInc(record.currentEmployment.bonusIncome)} placeholder="0"
                            onChange={(e) => updateCurrentEmployment(index, 'bonusIncome', parseCurrency(e.target.value))}
                            style={{ fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px' }}>Commissions (annual)</label>
                          <input type="text" value={fmtInc(record.currentEmployment.commissions)} placeholder="0"
                            onChange={(e) => updateCurrentEmployment(index, 'commissions', parseCurrency(e.target.value))}
                            style={{ fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px' }}>HECS Debt</label>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <HECSBtn val="Yes" /><HECSBtn val="No" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Income Verifier */}
                    {verifierExpanded[index] ? (
                      <IncomeVerifierModal
                        applicantName={record.applicantName}
                        initialData={payslipState[index]?.data || null}
                        onClose={() => setVerifierExpanded(p => ({ ...p, [index]: false }))}
                        onSave={(result) => {
                          updateCurrentEmployment(index, 'incomeVerification', result);
                          setVerifierExpanded(p => ({ ...p, [index]: false }));
                        }}
                      />
                    ) : record.currentEmployment.incomeVerification ? (
                      (() => {
                        const v = record.currentEmployment.incomeVerification;
                        const statusColors = { consistent: '#166534', ytd_higher: '#0369a1', ytd_lower: '#9a3412', incomplete: '#64748b' };
                        const statusLabels = { consistent: '✓ Consistent', ytd_higher: 'ℹ️ YTD Higher', ytd_lower: '⚠️ YTD Lower — flagged', incomplete: '—' };
                        return (
                          <div style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600' }}>Income Verification</span>
                              <span style={{ color: statusColors[v.status] || '#64748b', fontWeight: '600' }}>{statusLabels[v.status] || v.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                              <span>Base: <strong style={{ color: 'var(--text-primary)' }}>{fmt(v.m1Annual)}</strong></span>
                              <span>YTD: <strong style={{ color: 'var(--text-primary)' }}>{fmt(v.m2Annual)}</strong></span>
                              <span>Var: <strong style={{ color: v.variancePct < -2 ? '#dc2626' : 'var(--text-primary)' }}>{v.variancePct?.toFixed(1)}%</strong></span>
                            </div>
                          </div>
                        );
                      })()
                    ) : null}

                    {/* 3-Year History tracker + previous employment */}
                    {renderHistoryTracker(record, index)}

                    {record.previousEmployments.map((prevEmp, empIdx) => (
                      <div key={prevEmp.id} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '12px', border: '1px solid var(--border-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>Previous Employment {empIdx + 1}</span>
                          <button onClick={() => removePreviousEmployment(index, empIdx)} className="btn-danger" style={{ fontSize: '12px', padding: '4px 12px' }}>Remove</button>
                        </div>
                        <div className="mb-4">
                          <label>Employment Type</label>
                          <div className="pill-group">
                            {['Full-Time', 'Part-Time', 'Casual', 'Self-Employed', 'Contract'].map(t => (
                              <button key={t} type="button"
                                className={`pill-btn${prevEmp.employmentType === t ? ' pill-btn--active' : ''}`}
                                onClick={() => updatePreviousEmployment(index, empIdx, 'employmentType', prevEmp.employmentType === t ? '' : t)}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 mb-4">
                          <div>
                            <label>Employer Name</label>
                            <input type="text" value={prevEmp.employer} onChange={(e) => updatePreviousEmployment(index, empIdx, 'employer', e.target.value)} placeholder="Company name" />
                          </div>
                          <div>
                            <label>Job Title / Role</label>
                            <input type="text" value={prevEmp.role} onChange={(e) => updatePreviousEmployment(index, empIdx, 'role', e.target.value)} placeholder="e.g., Developer" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3">
                          <div>
                            <label>Start Date</label>
                            <input type="date" value={prevEmp.startDate} onChange={(e) => updatePreviousEmployment(index, empIdx, 'startDate', e.target.value)} />
                          </div>
                          <div>
                            <label>End Date</label>
                            <input type="date" value={prevEmp.endDate} onChange={(e) => updatePreviousEmployment(index, empIdx, 'endDate', e.target.value)} />
                          </div>
                          <div>
                            <label>Duration</label>
                            <input type="text" readOnly style={{ background: 'var(--bg-primary)', cursor: 'not-allowed' }}
                              value={prevEmp.startDate && prevEmp.endDate ? `${calculateTenure(prevEmp.startDate, prevEmp.endDate).toFixed(1)} years` : 'Calculating…'} />
                          </div>
                        </div>
                        {prevEmp.employmentType === 'Self-Employed' && (
                          <div className="mt-4">
                            <ABNField idx={index} empKey={`prev-${empIdx}`} value={prevEmp.abn}
                              onChange={(v) => updatePreviousEmployment(index, empIdx, 'abn', v)}
                              onABNResult={(r) => { if (!prevEmp.employer && r.entityName) updatePreviousEmployment(index, empIdx, 'employer', r.tradingNames?.[0] || r.entityName); }} />
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                      <button type="button"
                        onClick={() => goToEmpStep(record.applicantId, 1)}
                        style={{ padding: '9px 24px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        ← Back: Current Employment
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </SmartCard>
        );
      })}

      {employmentRecords.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-primary)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            No applicants available. Please complete Step 1 (Applicants) first.
          </p>
        </div>
      )}
    </div>
  );
};

export default Step2Employment;
