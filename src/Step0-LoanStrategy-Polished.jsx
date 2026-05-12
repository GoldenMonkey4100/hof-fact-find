import React, { useState } from 'react';
import './styles.css';
import { getBrokerEmail, formatCurrency, parseCurrency, calculateLVR, calculatePropertyValue, calculateLoanAmount, formatCurrencyDisplay } from './utils';
import AddressAutocomplete from './AddressAutocomplete';
import SmartCard from './SmartCard';

const LEAD_SOURCES = [
  'Arrow Lawyers','Aus Realty','Barrak Accountants','Blaze Real Estate','Bright Realty',
  'Century 21 Fairfield','Century 21 The Parks','Client Referral','Confederal Tax Law',
  'Convin Group','David Legal','Existing Client','Facebook','Fairmont Legal',
  'Flyer Promotion','FundX','Geneva Law Group','Google','Leading Tax Professionals',
  'Legacy Accounting','Logic Accountant','Melrose Estate Agents','New Client',
  'Outwest Legal','Paramonte Legal','PFS Accountants','Prestige Estate Agents',
  'Prime Real Estate','Self Source','STP Accountant','The Elite Agency',
  'Top Notch Accounting','Trump Lawyers','Website'
];

const SECONDARY_TYPES = ['Cashout', 'Construction', 'Off the Plan', 'Pre-approval', 'Vacant Land'];
const PURCHASE_COMPLETION = ['Own Savings', 'Gift from Family', 'Equity from Existing Property', 'First Home Owner Grant', 'Other'];

// ── Ownership helpers ─────────────────────────────────────────────────────────
const OWNERSHIP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];

const getApplicantDisplayName = (a) => {
  if (!a) return '';
  if (a.type === 'Company Borrower') return a.companyName || '';
  return `${a.firstName || ''} ${a.lastName || ''}`.trim();
};

const computeOwnershipRows = (security, applicants) => {
  const stored = security.ownershipRows || [];
  const apps   = applicants || [];

  if (stored.length === 0 && apps.length > 0) {
    const base      = Math.floor(100 / apps.length);
    const remainder = 100 - base * apps.length;
    return apps.map((a, i) => ({
      id: `applicant-${a.id}`, type: 'applicant', applicantId: a.id,
      name: getApplicantDisplayName(a) || `${a.role} ${a.number}`,
      percentage: i === 0 ? base + remainder : base,
    }));
  }

  const existingIds = new Set(stored.filter(r => r.type === 'applicant').map(r => r.applicantId));
  const newApps     = apps.filter(a => !existingIds.has(a.id));

  const merged = stored
    .map(row => {
      if (row.type !== 'applicant') return row;
      const app = apps.find(a => a.id === row.applicantId);
      if (!app) return null;
      const liveName = getApplicantDisplayName(app) || `${app.role} ${app.number}`;
      return { ...row, name: liveName || row.name };
    })
    .filter(Boolean);

  newApps.forEach(a => {
    merged.push({
      id: `applicant-${a.id}`, type: 'applicant', applicantId: a.id,
      name: getApplicantDisplayName(a) || `${a.role} ${a.number}`, percentage: 0,
    });
  });

  return merged;
};

// ── Stamp duty / FHOG calculations ────────────────────────────────────────────
const SD_BRACKETS = {
  NSW: [[0,0,0.0125],[17000,212.5,0.015],[36000,497.5,0.0175],[97000,1565,0.035],[364000,10929.5,0.045],[1094000,43789.5,0.055]],
  VIC: [[0,0,0.014],[25000,350,0.024],[130000,2870,0.06],[960000,52670,0.055]],
  QLD: [[0,0,0],[5000,0,0.015],[75000,1050,0.035],[540000,17325,0.045],[1000000,38025,0.0575]],
  WA:  [[0,0,0.019],[120000,2280,0.0285],[150000,3135,0.038],[360000,11115,0.045],[725000,27540,0.051]],
  SA:  [[0,0,0.01],[12000,120,0.02],[30000,480,0.03],[50000,1080,0.035],[100000,2830,0.04],[200000,6830,0.0425],[250000,8955,0.0475],[300000,11330,0.05],[500000,21330,0.055]],
  TAS: [[0,20,0],[3000,50,0.015],[25000,380,0.0225],[75000,1505,0.035],[200000,5880,0.04],[375000,12880,0.0425],[725000,27755,0.045]],
  ACT: [[0,0,0.0156],[200000,3120,0.022],[300000,5320,0.034],[500000,12120,0.043],[750000,22870,0.054],[1000000,36370,0.055]],
  NT:  [[0,0,0.02],[100000,2000,0.03],[200000,5000,0.04],[525000,18000,0.0495]],
};

const FHB_CONCESSIONS = {
  NSW: { exemptUpTo: 800000,  concessionUpTo: 1000000, note: 'Full exemption ≤ $800k; concessional $800k–$1M' },
  VIC: { exemptUpTo: 600000,  concessionUpTo: 750000,  note: 'Full exemption ≤ $600k; concessional $600k–$750k' },
  QLD: { exemptUpTo: 500000,  concessionUpTo: 550000,  note: 'Concessional rate ≤ $500k; partial concession to $550k' },
  WA:  { exemptUpTo: 430000,  concessionUpTo: 530000,  note: 'Full exemption ≤ $430k; concessional $430k–$530k' },
  SA:  { exemptUpTo: 0,       concessionUpTo: 0,       note: 'No FHB stamp duty concession in SA' },
  TAS: { exemptUpTo: 0,       concessionUpTo: 0,       note: '50% duty reduction on new homes up to $400k' },
  ACT: { exemptUpTo: 585000,  concessionUpTo: 585000,  note: 'Duty concession for eligible FHBs (income-tested)' },
  NT:  { exemptUpTo: 500000,  concessionUpTo: 500000,  note: 'FHB discount of $18,601 for properties ≤ $500k' },
};

const FHOG_DATA = {
  NSW: { amount: 10000, maxValue: 600000, newHomeOnly: true,  note: '$10,000 for new homes ≤ $600k' },
  VIC: { amount: 10000, maxValue: 750000, newHomeOnly: true,  note: '$10,000 metro / $20,000 regional — new homes ≤ $750k' },
  QLD: { amount: 30000, maxValue: 750000, newHomeOnly: true,  note: '$30,000 for new homes ≤ $750k' },
  WA:  { amount: 10000, maxValue: 750000, newHomeOnly: true,  note: '$10,000 for new homes ≤ $750k' },
  SA:  { amount: 15000, maxValue: 650000, newHomeOnly: true,  note: '$15,000 for new homes ≤ $650k' },
  TAS: { amount: 10000, maxValue: 0,      newHomeOnly: true,  note: '$10,000 for new homes (no value cap)' },
  ACT: { amount: 0,     maxValue: 0,      newHomeOnly: false, note: 'No FHOG in ACT — replaced by duty concession' },
  NT:  { amount: 10000, maxValue: 0,      newHomeOnly: false, note: '$10,000 for all first home buyers' },
};

const calcBracketDuty = (value, brackets) => {
  for (let i = brackets.length - 1; i >= 0; i--) {
    const [from, base, rate] = brackets[i];
    if (value > from) return Math.round(base + rate * (value - from));
  }
  return 0;
};

const calcStampDuty = (propertyValue, state, isFirstHomeBuyer) => {
  const val = parseFloat(propertyValue) || 0;
  if (!val || !state || !SD_BRACKETS[state]) return null;
  let duty = calcBracketDuty(val, SD_BRACKETS[state]);
  if (isFirstHomeBuyer) {
    const conc = FHB_CONCESSIONS[state];
    if (conc && val <= conc.exemptUpTo) {
      duty = 0;
    } else if (conc && conc.concessionUpTo > conc.exemptUpTo && val <= conc.concessionUpTo) {
      duty = Math.round(duty * (val - conc.exemptUpTo) / (conc.concessionUpTo - conc.exemptUpTo));
    }
  }
  return duty;
};

const calcFHOG = (state, propertyValue, isNewHome) => {
  const fhog = FHOG_DATA[state];
  if (!fhog || fhog.amount === 0) return 0;
  if (fhog.newHomeOnly && !isNewHome) return 0;
  const val = parseFloat(propertyValue) || 0;
  if (fhog.maxValue > 0 && val > fhog.maxValue) return 0;
  return fhog.amount;
};

const calcTransferFees = (state, propVal) => {
  const v = parseFloat(propVal) || 0;
  switch (state) {
    case 'NSW': return { transferFee: v <= 204000 ? 214 : Math.round(214 + Math.ceil((v - 204000) / 1000) * 3.54), mortgageReg: 214 };
    case 'VIC': return { transferFee: Math.round(120 + Math.max(0, Math.ceil((v - 130000) / 10000)) * 2.34), mortgageReg: 120 };
    case 'QLD': return { transferFee: 195, mortgageReg: 195 };
    case 'WA':  return { transferFee: 200, mortgageReg: 175 };
    case 'SA':  return { transferFee: 177, mortgageReg: 178 };
    case 'TAS': return { transferFee: Math.round(213 + Math.max(0, v / 10000) * 3.5), mortgageReg: 152 };
    case 'ACT': return { transferFee: 200, mortgageReg: 200 };
    case 'NT':  return { transferFee: 150, mortgageReg: 150 };
    default:    return { transferFee: 0, mortgageReg: 0 };
  }
};

// ── UI Sub-components ─────────────────────────────────────────────────────────

const ToggleButton = ({ label, active, onClick, color = 'success' }) => {
  const colors = {
    success: { border: 'var(--color-success)', bg: 'var(--color-success-light)', text: 'var(--color-success-dark)' },
    info:    { border: 'var(--color-info)',    bg: 'var(--color-info-light)',    text: 'var(--color-info-dark)'    },
    primary: { border: 'var(--color-primary)', bg: 'var(--color-primary-light)', text: 'var(--color-primary)'     },
  };
  const c = colors[color];
  return (
    <button type="button" onClick={onClick} style={{
      padding: '8px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
      fontWeight: active ? '600' : '400',
      border: active ? `2px solid ${c.border}` : '1px solid var(--border-primary)',
      background: active ? c.bg : 'var(--bg-primary)',
      color: active ? c.text : 'var(--text-primary)',
      transition: 'all 0.15s'
    }}>
      {active && '✓ '}{label}
    </button>
  );
};

const Stepper = ({ value, onChange, min = 0, max = 4 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
      style={{ width: '34px', height: '34px', border: '1px solid var(--border-primary)', borderRadius: '6px 0 0 6px', background: 'var(--bg-secondary)', cursor: value <= min ? 'not-allowed' : 'pointer', fontSize: '18px', color: value <= min ? 'var(--text-tertiary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
      −
    </button>
    <div style={{ width: '44px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-primary)', borderLeft: 'none', borderRight: 'none', background: 'var(--bg-primary)', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
      {value}
    </div>
    <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
      style={{ width: '34px', height: '34px', border: '1px solid var(--border-primary)', borderRadius: '0 6px 6px 0', background: 'var(--bg-secondary)', cursor: value >= max ? 'not-allowed' : 'pointer', fontSize: '18px', color: value >= max ? 'var(--text-tertiary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
      +
    </button>
  </div>
);

const SubStepBar = ({ step, labels, onGoTo }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
    {labels.map((label, i) => {
      const n      = i + 1;
      const done   = n < step;
      const active = n === step;
      return (
        <React.Fragment key={n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: done ? 'pointer' : 'default' }}
            onClick={() => done && onGoTo(n)}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '700', transition: 'all 0.2s',
              background: done ? '#10b981' : active ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: done || active ? 'white' : 'var(--text-tertiary)',
              border: done ? '2px solid #10b981' : active ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
            }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontSize: '11px', fontWeight: active ? '600' : '400', color: active ? 'var(--color-primary)' : done ? '#10b981' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: done ? '#10b981' : 'var(--border-primary)', margin: '0 8px', marginBottom: '14px', transition: 'background 0.2s' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const LoanTypeMatrix = ({ security, onSelect }) => {
  const options = [
    { rep: 'Variable', type: 'Principal & Interest', label: 'Variable P&I', sub: 'Most flexible' },
    { rep: 'Variable', type: 'Interest Only',        label: 'Variable IO',  sub: 'Lower repayments' },
    { rep: 'Fixed',    type: 'Principal & Interest', label: 'Fixed P&I',   sub: 'Rate certainty'  },
    { rep: 'Fixed',    type: 'Interest Only',        label: 'Fixed IO',    sub: 'Fixed rate + IO' },
  ];
  const isSplit = security.repaymentType === 'Split';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {options.map(({ rep, type, label, sub }) => {
          const sel = security.repaymentType === rep && security.loanType === type;
          return (
            <button key={label} type="button" onClick={() => onSelect(rep, type)}
              style={{
                padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                border: sel ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                background: sel ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: sel ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                {sel && '✓ '}{label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</div>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onSelect('Split', '')}
        style={{
          padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%',
          border: isSplit ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
          background: isSplit ? 'var(--color-primary-light)' : 'var(--bg-primary)',
          transition: 'all 0.15s',
        }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: isSplit ? 'var(--color-primary)' : 'var(--text-primary)' }}>
          {isSplit && '✓ '}Split Loan — Fixed + Variable portions
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Specify amounts for each portion below</div>
      </button>
    </div>
  );
};

const FundsToCompleteCard = ({ security, allSecurities }) => {
  const propVal = parseFloat(security.propertyValue) || 0;
  const loanAmt = parseFloat(security.loanAmount) || 0;
  if (!propVal || !loanAmt || propVal <= loanAmt) return null;

  const deposit    = propVal - loanAmt;
  const stampDuty  = calcStampDuty(propVal, security.state, !!security.isFirstHomeBuyer) || 0;
  const { transferFee, mortgageReg } = security.state ? calcTransferFees(security.state, propVal) : { transferFee: 0, mortgageReg: 0 };
  const legal      = 2000;
  const inspection = 600;
  const totalNeeded = deposit + stampDuty + transferFee + mortgageReg + legal + inspection;

  const amounts = security.purchaseCompletionAmounts || {};
  const methods = security.purchaseCompletionMethods  || [];
  let confirmed = 0;
  methods.forEach(m => {
    if (m === 'Own Savings' || m === 'Gift from Family')
      confirmed += parseFloat((amounts[m] || '').replace(/,/g, '')) || 0;
    if (m === 'Equity from Existing Property') {
      const ep = (security.equityPropertyIndex !== '' && security.equityPropertyIndex !== undefined)
        ? allSecurities[parseInt(security.equityPropertyIndex)] : null;
      if (ep) {
        const epIsCashout = ep.primaryTransactionTypes?.includes('Refinance') && ep.secondaryTransactionTypes?.includes('Cashout');
        confirmed += epIsCashout
          ? (parseFloat(parseCurrency(ep.cashoutAmount || '')) || 0)
          : Math.max(0, (parseFloat(ep.propertyValue)||0)*0.8 - (parseFloat(ep.loanAmount)||0));
      }
    }
    if (m === 'First Home Owner Grant')
      confirmed += calcFHOG(security.state, propVal, !!security.isNewHome);
  });

  const surplus = confirmed - totalNeeded;
  const hasFunds = methods.length > 0;
  const fmt = n => `$${Math.round(n).toLocaleString()}`;

  const Row = ({ label, value, bold, green, muted, indent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #d1fae5', fontSize: '13px',
      fontWeight: bold ? '700' : '400', color: green ? '#16a34a' : muted ? '#9ca3af' : 'var(--text-primary)', paddingLeft: indent ? '12px' : '0' }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '14px', background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '8px' }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-success-emphasis)' }}>Funds to Complete</p>
      <Row label={`Deposit (${((deposit/propVal)*100).toFixed(1)}%)`} value={fmt(deposit)} />
      {stampDuty > 0 && <Row label={`Stamp Duty${security.isFirstHomeBuyer ? ' (FHB)' : ''}${security.state ? ` — ${security.state}` : ''}`} value={fmt(stampDuty)} />}
      {stampDuty === 0 && security.state && <Row label={`Stamp Duty — ${security.state}`} value="Exempt ✓" green />}
      {!security.state && <Row label="Stamp Duty" value="Select state" muted />}
      {transferFee > 0 && <Row label="Transfer Fee" value={fmt(transferFee)} muted />}
      {mortgageReg > 0 && <Row label="Mortgage Registration" value={fmt(mortgageReg)} muted />}
      <Row label="Legal Fees (est.)" value={fmt(legal)} muted />
      <Row label="Building Inspection (est.)" value={fmt(inspection)} muted />
      <Row label="Total Funds Needed" value={fmt(totalNeeded)} bold />
      {hasFunds && (
        <>
          <div style={{ margin: '8px 0 2px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed Funds</div>
          {methods.map(m => {
            let amt = 0;
            if (m === 'Own Savings' || m === 'Gift from Family')
              amt = parseFloat((amounts[m] || '').replace(/,/g, '')) || 0;
            if (m === 'Equity from Existing Property') {
              const ep = (security.equityPropertyIndex !== '' && security.equityPropertyIndex !== undefined)
                ? allSecurities[parseInt(security.equityPropertyIndex)] : null;
              if (ep) {
                const epIsCashout = ep.primaryTransactionTypes?.includes('Refinance') && ep.secondaryTransactionTypes?.includes('Cashout');
                amt = epIsCashout
                  ? (parseFloat(parseCurrency(ep.cashoutAmount || '')) || 0)
                  : Math.max(0, (parseFloat(ep.propertyValue)||0)*0.8 - (parseFloat(ep.loanAmount)||0));
              }
            }
            if (m === 'First Home Owner Grant') amt = calcFHOG(security.state, propVal, !!security.isNewHome);
            return amt > 0 ? <Row key={m} label={m} value={fmt(amt)} green indent /> : null;
          })}
          <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '8px', background: surplus >= 0 ? '#f0fdf4' : '#fef2f2', border: `2px solid ${surplus >= 0 ? '#86efac' : '#fca5a5'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: surplus >= 0 ? '#166534' : '#991b1b' }}>
              {surplus >= 0
                ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Surplus</>
                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Shortfall</>
              }
            </span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: surplus >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmt(Math.abs(surplus))}
            </span>
          </div>
          {surplus < 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', marginTop: '4px', fontStyle: 'italic' }}>
              Client needs an additional {fmt(Math.abs(surplus))} to complete.
            </div>
          )}
        </>
      )}
      {!hasFunds && (
        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-warning-surface)', border: '1px solid var(--border-warning)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-warning-emphasis)' }}>
          ⚠ Select completion method above to verify funds
        </div>
      )}
      <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
        * Estimates only — confirm with solicitor.
      </div>
    </div>
  );
};


// ── Equity calculator content ─────────────────────────────────────────────────

const EquityCalcContent = ({ security }) => {
  const isRefCashout = (security.primaryTransactionTypes || []).includes('Refinance') &&
                       (security.secondaryTransactionTypes || []).includes('Cashout');

  if (!isRefCashout) {
    return <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Select Refinance + Cashout on this security to calculate available equity.</p>;
  }

  const propVal    = parseFloat(security.propertyValue) || 0;
  const currBal    = parseFloat(parseCurrency(security.currentLoanBalance || '')) || 0;
  const cashoutVal = parseFloat(parseCurrency(security.cashoutAmount || '')) || 0;
  const maxLVR80   = propVal * 0.8;
  const availEq    = Math.max(0, maxLVR80 - currBal);

  if (propVal === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Enter property value to calculate equity.</p>;
  }

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equity Position</p>
      {[
        { label: 'Property Value',     value: `$${propVal.toLocaleString()}` },
        { label: 'Max Loan (80% LVR)', value: `$${Math.round(maxLVR80).toLocaleString()}` },
        { label: 'Current Balance',    value: currBal > 0 ? `$${currBal.toLocaleString()}` : '—' },
      ].map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-primary)', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{value}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: '13px' }}>
        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Available Equity</span>
        <span style={{ fontWeight: '800', fontSize: '16px', color: currBal > 0 ? (availEq > 0 ? '#16a34a' : '#dc2626') : 'var(--text-tertiary)' }}>
          {currBal > 0 ? `$${Math.round(availEq).toLocaleString()}` : 'Enter balance →'}
        </span>
      </div>
      {cashoutVal > 0 && availEq > 0 && cashoutVal > availEq && (
        <div style={{ padding: '8px 10px', background: 'var(--bg-danger-surface)', border: '1px solid var(--border-danger)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-danger-emphasis)', marginTop: '4px' }}>
          ⚠ Cashout ${cashoutVal.toLocaleString()} exceeds available equity at 80% LVR
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const Step0LoanStrategy = ({ formData, updateFormData }) => {
  const [secStep, setSecStep] = useState({});
  const [secCalcOpen, setSecCalcOpen] = useState({});

  const getSecStep = (id) => secStep[id] || 1;
  const setSecurityStep = (id, s) => setSecStep(prev => ({ ...prev, [id]: s }));
  const toggleSecCalc = (id) => setSecCalcOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const updateSecurity = (index, field, value) => {
    const securities = [...formData.securities];
    securities[index] = { ...securities[index], [field]: value };
    updateFormData('securities', securities);
  };

  const updateSecurityFields = (index, updates) => {
    const securities = [...formData.securities];
    securities[index] = { ...securities[index], ...updates };
    updateFormData('securities', securities);
  };

  const addSecurity = () => {
    const securities = [...formData.securities, {
      id: Date.now(),
      address: '', propertyValue: '', loanAmount: '', lvr: '',
      primaryTransactionTypes: [], secondaryTransactionTypes: [],
      intendedOccupancy: '', applicationType: '',
      loanTerm: '', loanType: '', repaymentType: '', fixedRatePeriod: '', interestOnlyPeriod: '',
      splits: [],
      currentLoanBalance: '', cashoutAmount: '', purchaseCompletionMethods: [],
      state: '', isFirstHomeBuyer: false, isNewHome: false,
      purchaseCompletionAmounts: {}, purchaseCompletionOther: '',
      equityPropertyIndex: '', giftRelationship: '',
      hasOffset: false, hasRedraw: false,
      ownershipRows: [],
    }];
    updateFormData('securities', securities);
  };

  const removeSecurity = (index) => {
    if (formData.securities.length > 1)
      updateFormData('securities', formData.securities.filter((_, i) => i !== index));
  };

  const newSplitRow = () => ({ id: Date.now() + Math.random(), inputMode: 'pct', percentage: '', amount: '', type: '', rateType: '', fixedYears: '', ioYears: '' });

  const addSplit = (secIndex) => {
    const sec = formData.securities[secIndex];
    updateSecurityFields(secIndex, { splits: [...(sec.splits || []), newSplitRow()] });
  };

  const removeSplit = (secIndex, splitId) => {
    const sec = formData.securities[secIndex];
    updateSecurityFields(secIndex, { splits: (sec.splits || []).filter(s => s.id !== splitId) });
  };

  const updateSplit = (secIndex, splitId, field, value) => {
    const sec = formData.securities[secIndex];
    updateSecurityFields(secIndex, { splits: (sec.splits || []).map(s => s.id === splitId ? { ...s, [field]: value } : s) });
  };

  const toggleTransactionType = (securityIndex, type, isPrimary) => {
    const securities = [...formData.securities];
    const field = isPrimary ? 'primaryTransactionTypes' : 'secondaryTransactionTypes';
    const current = securities[securityIndex][field];
    const isAdding = !current.includes(type);
    securities[securityIndex][field] = isAdding ? [...current, type] : current.filter(t => t !== type);
    updateFormData('securities', securities);

    // Auto-open calculator when a relevant transaction type is selected
    if (isAdding && (type === 'Purchase' || type === 'Cashout')) {
      const secId = securities[securityIndex].id;
      setSecCalcOpen(prev => ({ ...prev, [secId]: true }));
    }
  };

  const togglePurchaseCompletion = (securityIndex, method) => {
    const securities = [...formData.securities];
    const current = securities[securityIndex].purchaseCompletionMethods || [];
    const removing = current.includes(method);
    securities[securityIndex] = {
      ...securities[securityIndex],
      purchaseCompletionMethods: removing ? current.filter(m => m !== method) : [...current, method],
    };
    if (removing) {
      if (method === 'Own Savings' || method === 'Gift from Family') {
        const a = { ...(securities[securityIndex].purchaseCompletionAmounts || {}) };
        delete a[method];
        securities[securityIndex].purchaseCompletionAmounts = a;
        if (method === 'Gift from Family') securities[securityIndex].giftRelationship = '';
      }
      if (method === 'Equity from Existing Property') securities[securityIndex].equityPropertyIndex = '';
      if (method === 'Other') securities[securityIndex].purchaseCompletionOther = '';
    }
    updateFormData('securities', securities);
  };

  const handleBrokerChange = (e) => {
    const brokerName = e.target.value;
    updateFormData('brokerName', brokerName);
    updateFormData('brokerEmail', getBrokerEmail(brokerName));
  };

  const handlePropertyValueChange = (index, value) => {
    const parsed = parseCurrency(value);
    const security = formData.securities[index];
    const updates = { propertyValue: parsed };
    if (security.loanAmount && parsed) updates.lvr = calculateLVR(parsed, security.loanAmount);
    updateSecurityFields(index, updates);
  };

  const handleLoanAmountChange = (index, value) => {
    const parsed = parseCurrency(value);
    const security = formData.securities[index];
    const updates = { loanAmount: parsed };
    if (security.propertyValue && parsed) updates.lvr = calculateLVR(security.propertyValue, parsed);
    updateSecurityFields(index, updates);
  };

  const handleLvrChange = (index, value) => {
    const security = formData.securities[index];
    const updates = { lvr: value };
    const lvrNum = parseFloat(value) || 0;
    if (lvrNum > 0 && lvrNum <= 100) {
      const propVal = parseFloat(security.propertyValue) || 0;
      const loanAmt = parseFloat(security.loanAmount) || 0;
      if (propVal > 0) {
        updates.loanAmount = Math.round(propVal * lvrNum / 100).toString();
      } else if (loanAmt > 0) {
        updates.propertyValue = Math.round(loanAmt / (lvrNum / 100)).toString();
      }
    }
    updateSecurityFields(index, updates);
  };

  const handleRefinanceBreakdown = (index, field, value) => {
    const parsed = parseCurrency(value);
    const security = formData.securities[index];
    const updates = { [field]: parsed };
    const balance = parseFloat(parseCurrency(field === 'currentLoanBalance' ? parsed : security.currentLoanBalance || '')) || 0;
    const cashout = parseFloat(parseCurrency(field === 'cashoutAmount' ? parsed : security.cashoutAmount || '')) || 0;
    if (balance || cashout) {
      const total = (balance + cashout).toString();
      updates.loanAmount = total;
      if (security.propertyValue) updates.lvr = calculateLVR(security.propertyValue, total);
    }
    updateSecurityFields(index, updates);
  };

  const toggleLender = (lender) => {
    const currentLenders = formData.lenderPreference || [];
    updateFormData('lenderPreference', currentLenders.includes(lender)
      ? currentLenders.filter(l => l !== lender)
      : [...currentLenders, lender]
    );
  };

  const isRefinanceCashout = (security) =>
    security.primaryTransactionTypes.includes('Refinance') &&
    security.secondaryTransactionTypes.includes('Cashout');

  // ── Broker card summary ──────────────────────────────────────────────────────
  const brokerSummary = [formData.brokerName, formData.clientType, formData.priority].filter(Boolean).join(' · ') || null;
  const brokerStatus  = formData.brokerName && formData.clientType && formData.priority ? 'done'
    : formData.brokerName || formData.clientType ? 'partial' : 'empty';
  const lenderSummary = formData.lenderPreference?.length ? formData.lenderPreference.join(', ') : null;
  const lenderStatus  = (formData.lenderPreference?.length > 0 && formData.brokerNotes) ? 'done'
    : (formData.lenderPreference?.length > 0 || formData.brokerNotes) ? 'partial' : 'empty';

  // ── Per-security render ──────────────────────────────────────────────────────
  const renderSecurityCard = (security, index) => {
    const step = getSecStep(security.id);
    const ownershipRows = computeOwnershipRows(security, formData.applicants);
    const totalPct = ownershipRows.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0);
    const totalOk  = Math.abs(totalPct - 100) < 0.01;
    const saveOwnershipRows = (rows) => updateSecurity(index, 'ownershipRows', rows);

    const isPurchase   = security.primaryTransactionTypes.includes('Purchase');
    const isRefCashout = isRefinanceCashout(security);
    const calcOpen     = secCalcOpen[security.id] || false;

    const secSummary = [
      security.address,
      security.propertyValue ? `$${Number(security.propertyValue).toLocaleString()}` : null,
      security.loanAmount ? `Loan $${Number(security.loanAmount).toLocaleString()}` : null,
      security.lvr ? `LVR ${parseFloat(security.lvr).toFixed(1)}%` : null,
    ].filter(Boolean).join(' · ') || null;

    const secStatus = security.address && security.propertyValue && security.loanAmount ? 'done'
      : security.address || security.propertyValue ? 'partial' : 'empty';

    return (
      <SmartCard
        key={security.id}
        icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        title={`Security ${index + 1}${security.address ? ` — ${security.address.split(',')[0]}` : ''}`}
        summary={secSummary}
        status={secStatus}
        defaultOpen={index === 0 && !security.address}
        headerActions={
          <button type="button" onClick={() => toggleSecCalc(security.id)} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer',
            border: calcOpen ? '1px solid #6366f1' : '1px solid var(--border-primary)',
            background: calcOpen ? '#eef2ff' : 'var(--bg-secondary)',
            color: calcOpen ? '#4338ca' : 'var(--text-secondary)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Calculator
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: calcOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        }
      >
        {formData.securities.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button type="button" onClick={() => removeSecurity(index)} className="btn-danger" style={{ fontSize: '12px' }}>
              Remove Security
            </button>
          </div>
        )}

        <SubStepBar
          step={step}
          labels={['Property & Loan', 'Structure']}
          onGoTo={(n) => setSecurityStep(security.id, n)}
        />

        {/* ── Sub-step 1: Property & Loan ──────────────────────────────────── */}
        {step === 1 && (
          <>
            {/* Form — always full card width */}
            <div className="mb-4">
              <label>Property Address</label>
              <AddressAutocomplete
                value={security.address}
                onChange={(val) => updateSecurity(index, 'address', val)}
                placeholder="Start typing an address…"
              />
            </div>

            <div className="mb-4">
              <label>Transaction Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                {[
                  { type: 'Purchase',  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                  { type: 'Refinance', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> },
                ].map(({ type, icon }) => {
                  const active = security.primaryTransactionTypes.includes(type);
                  return (
                    <button key={type} type="button" onClick={() => toggleTransactionType(index, type, true)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                        border: active ? '2px solid var(--color-success)' : '1px solid var(--border-primary)',
                        background: active ? 'var(--bg-success-surface)' : 'var(--bg-primary)',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? 'rgba(16,185,129,0.10)' : 'var(--color-gold-light)',
                        border: `1px solid ${active ? 'rgba(16,185,129,0.30)' : 'var(--color-gold-border)'}`,
                        color: active ? 'var(--color-success)' : 'var(--color-gold)',
                      }}>{icon}</div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: active ? 'var(--text-success-emphasis)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {active && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}{type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 mb-4" style={{ gap: '20px' }}>
              <div>
                <label>Intended Occupancy</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['Owner Occupied', 'Investment'].map(type => (
                    <ToggleButton key={type} label={type} color="primary"
                      active={security.intendedOccupancy === type}
                      onClick={() => updateSecurity(index, 'intendedOccupancy', security.intendedOccupancy === type ? '' : type)} />
                  ))}
                </div>
              </div>
              <div>
                <label>Application Type</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {['Full Doc', 'Low Doc'].map(type => (
                    <ToggleButton key={type} label={type} color="primary"
                      active={security.applicationType === type}
                      onClick={() => updateSecurity(index, 'applicationType', security.applicationType === type ? '' : type)} />
                  ))}
                </div>
              </div>
            </div>

            {security.primaryTransactionTypes.length > 0 && (
              <div className="mb-4">
                <label>Additional Features</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {SECONDARY_TYPES.map(type => (
                    <ToggleButton key={type} label={type} color="info"
                      active={security.secondaryTransactionTypes.includes(type)}
                      onClick={() => toggleTransactionType(index, type, false)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Numbers trio (tri-directional) ──────────────────────────── */}
            <div className="mb-4" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Property Value ($)</label>
                  <input type="text"
                    value={formatCurrency(security.propertyValue)}
                    onChange={(e) => handlePropertyValueChange(index, e.target.value)}
                    placeholder="750,000"
                    style={{ fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>LVR (%)</label>
                  <input type="text"
                    value={security.lvr ?? ''}
                    onChange={(e) => handleLvrChange(index, e.target.value)}
                    placeholder="80.0"
                    readOnly={isRefinanceCashout(security)}
                    style={{ fontSize: '13px', ...(isRefinanceCashout(security) ? { background: 'var(--bg-primary)', color: 'var(--text-tertiary)' } : {}) }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                    {isRefinanceCashout(security) ? 'Total Loan (auto)' : 'Loan Amount ($)'}
                  </label>
                  <input type="text"
                    value={formatCurrency(security.loanAmount)}
                    onChange={(e) => handleLoanAmountChange(index, e.target.value)}
                    placeholder="600,000"
                    readOnly={isRefinanceCashout(security)}
                    style={{ fontSize: '13px', ...(isRefinanceCashout(security) ? { background: 'var(--bg-primary)', color: 'var(--text-tertiary)' } : {}) }} />
                </div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>↕ Enter any two — third auto-fills</span>
                {security.propertyValue && security.loanAmount && (
                  <span style={{
                    padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                    background: parseFloat(security.lvr) > 80 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${parseFloat(security.lvr) > 80 ? '#fca5a5' : '#86efac'}`,
                    color: parseFloat(security.lvr) > 80 ? '#dc2626' : '#16a34a',
                  }}>
                    LVR {parseFloat(security.lvr).toFixed(1)}%{' '}
                    {parseFloat(security.lvr) > 80 ? '⚠ LMI may apply' : '✓ Standard'}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={() => setSecurityStep(security.id, 2)}
                style={{ padding: '10px 22px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                Next: Structure →
              </button>
            </div>

            {/* ── Calculator — below form, spans full card width ── */}
            {calcOpen && (
              <div style={{
                margin: '20px -18px 0',
                borderTop: '2px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                padding: '20px 18px 24px',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Calculator
                  </span>
                  <button type="button" onClick={() => toggleSecCalc(security.id)}
                    style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: '1px solid var(--border-primary)', cursor: 'pointer', padding: '3px 10px', borderRadius: '5px' }}>
                    ✕ Close
                  </button>
                </div>

                {/* Purchase — 2-col: inputs left, live calc right */}
                {isPurchase && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                    <div style={{ padding: '16px', background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '700', color: 'var(--text-success-emphasis)' }}>Purchase Details</p>
                      <div className="grid grid-cols-2 mb-3">
                        <div>
                          <label style={{ fontSize: '13px', color: 'var(--text-success-emphasis)' }}>State / Territory</label>
                          <select value={security.state || ''} onChange={(e) => updateSecurity(index, 'state', e.target.value)} style={{ fontSize: '13px' }}>
                            <option value="">Select state…</option>
                            {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div style={{ paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '13px' }}>
                            <input type="checkbox" checked={!!security.isFirstHomeBuyer}
                              onChange={(e) => updateSecurity(index, 'isFirstHomeBuyer', e.target.checked)} />
                            First Home Buyer
                          </label>
                        </div>
                      </div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-success-emphasis)' }}>
                        How does the client intend to complete the purchase?
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', marginBottom: '12px' }}>
                        {PURCHASE_COMPLETION.map(method => (
                          <ToggleButton key={method} label={method} color="success"
                            active={(security.purchaseCompletionMethods || []).includes(method)}
                            onClick={() => togglePurchaseCompletion(index, method)} />
                        ))}
                      </div>
                      {(security.purchaseCompletionMethods || []).map(method => (
                        <div key={method} style={{ marginBottom: '10px', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid #d1fae5' }}>
                          {(method === 'Own Savings' || method === 'Gift from Family') && (
                            <div>
                              <label style={{ fontSize: '13px' }}>{method} — Amount</label>
                              <input type="text"
                                value={formatCurrency(security.purchaseCompletionAmounts?.[method] || '')}
                                onChange={(e) => updateSecurity(index, 'purchaseCompletionAmounts', {
                                  ...(security.purchaseCompletionAmounts || {}), [method]: parseCurrency(e.target.value),
                                })}
                                placeholder="e.g. 80,000" style={{ fontSize: '13px' }} />
                              {method === 'Gift from Family' && (
                                <div style={{ marginTop: '8px' }}>
                                  <label style={{ fontSize: '13px' }}>Gift Relationship</label>
                                  <select value={security.giftRelationship || ''} style={{ fontSize: '13px' }}
                                    onChange={(e) => updateSecurity(index, 'giftRelationship', e.target.value)}>
                                    <option value="">Select…</option>
                                    {['Parent(s)', 'Grandparent(s)', 'Sibling', 'Other family member'].map(r => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                          {method === 'Equity from Existing Property' && (() => {
                            const eqIdx = security.equityPropertyIndex;
                            const equityProp = (eqIdx !== '' && eqIdx !== undefined) ? formData.securities[parseInt(eqIdx)] : null;
                            const epIsCashout = equityProp?.primaryTransactionTypes?.includes('Refinance') && equityProp?.secondaryTransactionTypes?.includes('Cashout');
                            const availEquity = equityProp
                              ? epIsCashout
                                ? (parseFloat(parseCurrency(equityProp.cashoutAmount || '')) || 0)
                                : Math.max(0, (parseFloat(equityProp.propertyValue)||0) * 0.8 - (parseFloat(equityProp.loanAmount)||0))
                              : null;
                            return (
                              <div>
                                <label style={{ fontSize: '13px' }}>Link to Existing Property</label>
                                <select value={eqIdx ?? ''} style={{ fontSize: '13px' }}
                                  onChange={(e) => updateSecurity(index, 'equityPropertyIndex', e.target.value === '' ? '' : parseInt(e.target.value))}>
                                  <option value="">Select property…</option>
                                  {formData.securities.map((s, i) => i !== index ? (
                                    <option key={i} value={i}>Security {i + 1}{s.address ? ` — ${s.address}` : ''}</option>
                                  ) : null)}
                                </select>
                                {equityProp && (
                                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--bg-success-surface)', borderRadius: '4px', fontSize: '12px' }}>
                                    <div>Property Value: <strong>{formatCurrencyDisplay(equityProp.propertyValue)}</strong></div>
                                    <div style={{ marginTop: '4px', color: availEquity > 0 ? '#166534' : '#dc2626', fontWeight: '600' }}>
                                      {epIsCashout ? 'Cashout Amount' : 'Available Equity (80% LVR)'}: <strong>${(availEquity || 0).toLocaleString()}</strong>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {method === 'First Home Owner Grant' && (() => {
                            const st = security.state;
                            const fhogData = st ? FHOG_DATA[st] : null;
                            const isNewHome = (security.secondaryTransactionTypes || []).includes('Off the Plan');
                            const fhogAmt = (fhogData && security.isFirstHomeBuyer) ? calcFHOG(st, security.propertyValue, isNewHome) : null;
                            return (
                              <div>
                                <label style={{ fontSize: '13px' }}>First Home Owner Grant Eligibility</label>
                                {!st ? (
                                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Select a state above to check FHOG eligibility</div>
                                ) : !security.isFirstHomeBuyer ? (
                                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Tick "First Home Buyer" above to check eligibility</div>
                                ) : fhogData?.amount === 0 ? (
                                  <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{fhogData.note}</div>
                                ) : (
                                  <div style={{ padding: '8px 10px', background: 'var(--bg-success-surface)', borderRadius: '4px', fontSize: '12px', marginTop: '4px' }}>
                                    <div style={{ fontWeight: '600', color: fhogAmt > 0 ? '#16a34a' : '#9ca3af' }}>
                                      {fhogAmt > 0 ? `Grant: $${fhogAmt.toLocaleString()} ✓`
                                        : fhogAmt === 0 && isNewHome ? `Not eligible — property value exceeds ${st} cap`
                                        : `Potential grant: $${fhogData?.amount?.toLocaleString()} — select "Off the Plan" in Additional Features to confirm`}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{fhogData?.note}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {method === 'Other' && (
                            <div>
                              <label style={{ fontSize: '13px' }}>Please describe</label>
                              <textarea value={security.purchaseCompletionOther || ''}
                                onChange={(e) => updateSecurity(index, 'purchaseCompletionOther', e.target.value)}
                                placeholder="Describe how the client will complete the purchase…"
                                rows="2" style={{ fontSize: '13px' }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <FundsToCompleteCard security={security} allSecurities={formData.securities} />
                    </div>
                  </div>
                )}

                {/* Refinance + Cashout — 2-col: inputs left, equity calc right */}
                {isRefCashout && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start', marginTop: isPurchase ? '20px' : '0' }}>
                    <div style={{ padding: '16px', background: 'var(--bg-info-surface)', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>Refinance + Cashout</p>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '13px' }}>Current Loan Balance</label>
                        <input type="text" value={formatCurrency(security.currentLoanBalance || '')}
                          onChange={(e) => handleRefinanceBreakdown(index, 'currentLoanBalance', e.target.value)}
                          placeholder="400,000" style={{ fontSize: '13px' }} />
                        <div className="hint-text" style={{ fontSize: '11px', marginTop: '4px' }}>What the client currently owes</div>
                      </div>
                      {(() => {
                        const propVal  = parseFloat(security.propertyValue) || 0;
                        const currBal  = parseFloat(parseCurrency(security.currentLoanBalance || '')) || 0;
                        const availEq  = Math.max(0, propVal * 0.8 - currBal);
                        const cashoutV = parseFloat(parseCurrency(security.cashoutAmount || '')) || 0;
                        const overEq   = cashoutV > availEq && availEq > 0;
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                              <label style={{ fontSize: '13px' }}>Cashout Amount</label>
                              {availEq > 0 && (
                                <button type="button"
                                  onClick={() => handleRefinanceBreakdown(index, 'cashoutAmount', String(Math.round(availEq)))}
                                  style={{ fontSize: '11px', color: 'var(--text-info)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>
                                  Use max →
                                </button>
                              )}
                            </div>
                            <input type="text" value={formatCurrency(security.cashoutAmount || '')}
                              onChange={(e) => handleRefinanceBreakdown(index, 'cashoutAmount', e.target.value)}
                              placeholder="100,000"
                              style={{ fontSize: '13px', ...(overEq ? { borderColor: '#f97316' } : {}) }} />
                            {overEq && <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '4px' }}>⚠ Exceeds 80% LVR</div>}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <EquityCalcContent security={security} />
                    </div>
                  </div>
                )}

                {!isPurchase && !isRefCashout && (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                    Select Purchase or Refinance + Cashout to see relevant calculations.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Sub-step 2: Structure ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="mb-4">
              <label>Loan Type</label>
              <LoanTypeMatrix
                security={security}
                onSelect={(rep, type) => {
                  const updates = { repaymentType: rep, loanType: type };
                  if (rep === 'Split' && (!security.splits || security.splits.length === 0)) {
                    updates.splits = [newSplitRow(), newSplitRow()];
                  }
                  updateSecurityFields(index, updates);
                }}
              />
            </div>

            {security.repaymentType === 'Fixed' && (
              <div className="mb-4">
                <label>Fixed Rate Period</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {[1,2,3,4,5].map(y => (
                    <button key={y} type="button"
                      onClick={() => updateSecurity(index, 'fixedRatePeriod', String(y))}
                      className={`pill-btn${security.fixedRatePeriod === String(y) ? ' pill-btn--active' : ''}`}>
                      {y}yr
                    </button>
                  ))}
                </div>
              </div>
            )}

            {security.loanType === 'Interest Only' && security.repaymentType !== 'Split' && (
              <div className="mb-4">
                <label>Interest Only Period</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {[1,2,3,4,5].map(y => (
                    <button key={y} type="button"
                      onClick={() => updateSecurity(index, 'interestOnlyPeriod', String(y))}
                      className={`pill-btn${security.interestOnlyPeriod === String(y) ? ' pill-btn--active' : ''}`}>
                      {y}yr
                    </button>
                  ))}
                </div>
              </div>
            )}

            {security.repaymentType === 'Split' && (() => {
              const splits = security.splits || [];
              const loanAmt = parseFloat(security.loanAmount) || 0;
              const splitColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

              // Normalise each split to a dollar amount for total validation
              const splitDollarAmts = splits.map(s => {
                if ((s.inputMode || 'pct') === 'amt') return parseFloat(parseCurrency(s.amount || '')) || 0;
                return loanAmt > 0 && parseFloat(s.percentage) > 0 ? Math.round(loanAmt * parseFloat(s.percentage) / 100) : 0;
              });
              const totalAmt = splitDollarAmts.reduce((a, b) => a + b, 0);
              const allFilled = splits.every(s => (s.inputMode === 'amt' ? !!parseCurrency(s.amount || '') : !!s.percentage));
              const amtOk = loanAmt > 0 && allFilled && Math.abs(totalAmt - loanAmt) < 1;
              const amtOver = loanAmt > 0 && allFilled && totalAmt > loanAmt;

              return (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ marginBottom: '12px', display: 'block' }}>Split Details</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {splits.map((sp, si) => {
                      const col = splitColors[si % splitColors.length];
                      const mode = sp.inputMode || 'pct';
                      const spAmt = parseFloat(parseCurrency(sp.amount || '')) || 0;
                      const computedAmt = mode === 'pct' && loanAmt > 0 && parseFloat(sp.percentage) > 0
                        ? Math.round(loanAmt * parseFloat(sp.percentage) / 100) : null;
                      const computedPct = mode === 'amt' && loanAmt > 0 && spAmt > 0
                        ? (spAmt / loanAmt * 100).toFixed(1) : null;

                      return (
                        <div key={sp.id} style={{
                          padding: '16px 14px 16px 18px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-primary)',
                          borderLeft: `4px solid ${col}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}>
                          {/* Header: label + % / $ toggle + remove */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: col, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Split {si + 1}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {['pct', 'amt'].map(m => (
                                <button key={m} type="button"
                                  onClick={() => updateSplit(index, sp.id, 'inputMode', m)}
                                  style={{
                                    padding: '2px 8px', fontSize: '11px', fontWeight: '700',
                                    borderRadius: '4px', cursor: 'pointer',
                                    border: mode === m ? `1px solid ${col}` : '1px solid var(--border-primary)',
                                    background: mode === m ? col + '22' : 'var(--bg-primary)',
                                    color: mode === m ? col : 'var(--text-tertiary)',
                                  }}>
                                  {m === 'pct' ? '%' : '$'}
                                </button>
                              ))}
                              {splits.length > 2 && (
                                <button type="button" onClick={() => removeSplit(index, sp.id)}
                                  style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', opacity: 0.75, marginLeft: '2px' }}>
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Allocation input — % or $ depending on mode */}
                          {mode === 'pct' ? (
                            <div>
                              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Allocation (%)</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input type="number" className="no-spin" min="0" max="100"
                                  value={sp.percentage}
                                  onChange={(e) => updateSplit(index, sp.id, 'percentage', e.target.value)}
                                  placeholder="e.g. 60"
                                  style={{ fontSize: '20px', fontWeight: '700', width: '80px', textAlign: 'center', padding: '8px 10px' }} />
                                <span style={{ fontSize: '18px', color: 'var(--text-tertiary)', fontWeight: '300' }}>%</span>
                              </div>
                              {computedAmt !== null ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', fontWeight: '500' }}>= ${computedAmt.toLocaleString()}</div>
                              ) : loanAmt === 0 && sp.percentage ? (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Enter loan amount above to see $</div>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Loan Amount ($)</label>
                              <input type="text"
                                value={formatCurrency(sp.amount || '')}
                                onChange={(e) => updateSplit(index, sp.id, 'amount', parseCurrency(e.target.value))}
                                placeholder="e.g. 420,000"
                                style={{ fontSize: '16px', fontWeight: '700', padding: '8px 12px' }} />
                              {computedPct !== null ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', fontWeight: '500' }}>= {computedPct}%</div>
                              ) : loanAmt === 0 && spAmt > 0 ? (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Enter loan amount above to see %</div>
                              ) : null}
                            </div>
                          )}

                          {/* Loan Type */}
                          <div>
                            <label style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>Loan Type</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {['Principal & Interest', 'Interest Only'].map(opt => (
                                <button key={opt} type="button"
                                  onClick={() => updateSplit(index, sp.id, 'type', sp.type === opt ? '' : opt)}
                                  className={`pill-btn${sp.type === opt ? ' pill-btn--active' : ''}`}
                                  style={{ fontSize: '12px' }}>
                                  {sp.type === opt && '✓ '}{opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Rate Type */}
                          <div>
                            <label style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>Rate Type</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {['Fixed', 'Variable'].map(opt => (
                                <button key={opt} type="button"
                                  onClick={() => updateSplit(index, sp.id, 'rateType', sp.rateType === opt ? '' : opt)}
                                  className={`pill-btn${sp.rateType === opt ? ' pill-btn--active' : ''}`}
                                  style={{ fontSize: '12px' }}>
                                  {sp.rateType === opt && '✓ '}{opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Fixed Period */}
                          {sp.rateType === 'Fixed' && (
                            <div>
                              <label style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>Fixed Period</label>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {[1,2,3,4,5].map(y => (
                                  <button key={y} type="button"
                                    onClick={() => updateSplit(index, sp.id, 'fixedYears', sp.fixedYears === String(y) ? '' : String(y))}
                                    className={`pill-btn${sp.fixedYears === String(y) ? ' pill-btn--active' : ''}`}
                                    style={{ fontSize: '12px' }}>
                                    {y}yr
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* IO Period */}
                          {sp.type === 'Interest Only' && (
                            <div>
                              <label style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>IO Period</label>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {[1,2,3,4,5].map(y => (
                                  <button key={y} type="button"
                                    onClick={() => updateSplit(index, sp.id, 'ioYears', sp.ioYears === String(y) ? '' : String(y))}
                                    className={`pill-btn${sp.ioYears === String(y) ? ' pill-btn--active' : ''}`}
                                    style={{ fontSize: '12px' }}>
                                    {y}yr
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Total tracker + add button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: amtOk ? '#16a34a' : amtOver ? '#ef4444' : '#f59e0b' }}>
                      {loanAmt > 0 && allFilled
                        ? amtOk
                          ? `✓ Splits balance — total $${totalAmt.toLocaleString()}`
                          : amtOver
                            ? `⚠ Over by $${(totalAmt - loanAmt).toLocaleString()}`
                            : `$${totalAmt.toLocaleString()} of $${loanAmt.toLocaleString()} allocated`
                        : loanAmt > 0 && splits.some(s => s.percentage || s.amount)
                          ? `$${totalAmt.toLocaleString()} of $${loanAmt.toLocaleString()} allocated`
                          : ''}
                    </div>
                    <button type="button" onClick={() => addSplit(index)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '7px 14px', fontSize: '12px', fontWeight: '600',
                        border: '1px dashed var(--border-primary)', borderRadius: '8px',
                        background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                      + Add split
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="mb-4">
              <label>Loan Term</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {['20', '25', '30'].map(yr => (
                  <button key={yr} type="button"
                    onClick={() => updateSecurity(index, 'loanTerm', security.loanTerm === yr ? '' : yr)}
                    className={`pill-btn${security.loanTerm === yr ? ' pill-btn--active' : ''}`}>
                    {yr} years
                  </button>
                ))}
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>or</span>
                <input type="number" min="1" max="40"
                  value={['20','25','30',''].includes(security.loanTerm) ? '' : security.loanTerm}
                  onChange={(e) => updateSecurity(index, 'loanTerm', e.target.value)}
                  placeholder="custom"
                  style={{ width: '80px', fontSize: '13px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>yrs</span>
              </div>
            </div>

            <div className="mb-4" style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" checked={!!security.hasOffset}
                  onChange={(e) => updateSecurity(index, 'hasOffset', e.target.checked)} />
                Offset Account
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" checked={!!security.hasRedraw}
                  onChange={(e) => updateSecurity(index, 'hasRedraw', e.target.checked)} />
                Redraw Facility
              </label>
            </div>

            {/* ── Property Ownership — Tile layout ── */}
            <div className="mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ margin: 0 }}>Property Ownership</label>
                {ownershipRows.length > 1 && (
                  <button type="button"
                    onClick={() => {
                      const n = ownershipRows.length;
                      const base = Math.floor(100 / n);
                      const rem = 100 - base * n;
                      saveOwnershipRows(ownershipRows.map((r, i) => ({ ...r, percentage: i === 0 ? base + rem : base })));
                    }}
                    style={{ fontSize: '12px', padding: '4px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    = Equal Split
                  </button>
                )}
              </div>

              {ownershipRows.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '6px 0' }}>
                  Set the number of applicants above — ownership will be pre-allocated automatically.
                </div>
              ) : (
                <>
                  {/* Live bar */}
                  <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden', display: 'flex', marginBottom: '6px' }}>
                    {ownershipRows.map((row, i) => (
                      <div key={row.id} style={{ width: `${parseFloat(row.percentage) || 0}%`, background: OWNERSHIP_COLORS[i % OWNERSHIP_COLORS.length], transition: 'width 0.2s ease' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    {ownershipRows.map((row, i) => (
                      <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: OWNERSHIP_COLORS[i % OWNERSHIP_COLORS.length] }} />
                        <span>{row.name || 'New Owner'} ({parseFloat(row.percentage) || 0}%)</span>
                      </div>
                    ))}
                  </div>

                  {/* Validation banner */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 12px', borderRadius: '6px', marginBottom: '14px',
                    fontSize: '12px', fontWeight: '600',
                    background: totalOk ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${totalOk ? '#86efac' : '#fca5a5'}`,
                    color: totalOk ? '#16a34a' : '#dc2626',
                  }}>
                    <span>{totalOk ? '✓ Ownership totals 100%' : `⚠ Total is ${totalPct.toFixed(1)}% — must equal 100%`}</span>
                    {!totalOk && (
                      <span>{totalPct > 100 ? `−${(totalPct - 100).toFixed(1)}% over` : `+${(100 - totalPct).toFixed(1)}% remaining`}</span>
                    )}
                  </div>

                  {/* Owner tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    {ownershipRows.map((row, i) => {
                      const col = OWNERSHIP_COLORS[i % OWNERSHIP_COLORS.length];
                      return (
                        <div key={row.id} style={{
                          border: `2px solid ${col}35`,
                          borderRadius: '10px',
                          padding: '14px 12px 12px',
                          background: 'var(--bg-primary)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}>
                          {/* Color accent bar */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', borderRadius: '10px 0 0 10px', background: col }} />

                          {/* Remove button for non-applicants */}
                          {row.type !== 'applicant' && (
                            <button type="button"
                              onClick={() => saveOwnershipRows(ownershipRows.filter((_, j) => j !== i))}
                              style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', opacity: 0.7 }}>
                              ✕
                            </button>
                          )}

                          {/* Name */}
                          {row.type === 'applicant' ? (
                            <div style={{ paddingLeft: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.3 }}>{row.name}</div>
                              <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                                Applicant {i + 1}
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={row.name}
                              placeholder="Owner / entity name"
                              onChange={(e) => {
                                const rows = [...ownershipRows];
                                rows[i] = { ...rows[i], name: e.target.value };
                                saveOwnershipRows(rows);
                              }}
                              style={{ fontSize: '13px', padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '6px', outline: 'none', width: '100%' }}
                            />
                          )}

                          {/* % Stepper */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                            <button type="button"
                              onClick={() => {
                                const rows = [...ownershipRows];
                                rows[i] = { ...rows[i], percentage: Math.max(0, (parseFloat(rows[i].percentage) || 0) - 5) };
                                saveOwnershipRows(rows);
                              }}
                              style={{ width: '32px', height: '32px', border: '1px solid var(--border-primary)', borderRadius: '6px 0 0 6px', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                              −
                            </button>
                            <input
                              type="number"
                              value={row.percentage}
                              min="0"
                              max="100"
                              onChange={(e) => {
                                const rows = [...ownershipRows];
                                rows[i] = { ...rows[i], percentage: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) };
                                saveOwnershipRows(rows);
                              }}
                              className="no-spin"
                              style={{ width: '76px', height: '32px', border: '1px solid var(--border-primary)', borderLeft: 'none', borderRight: 'none', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
                            />
                            <button type="button"
                              onClick={() => {
                                const rows = [...ownershipRows];
                                rows[i] = { ...rows[i], percentage: Math.min(100, (parseFloat(rows[i].percentage) || 0) + 5) };
                                saveOwnershipRows(rows);
                              }}
                              style={{ width: '32px', height: '32px', border: '1px solid var(--border-primary)', borderRadius: '0 6px 6px 0', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                              +
                            </button>
                          </div>
                          <div style={{ fontSize: '10px', textAlign: 'center', color: '#94a3b8' }}>% ownership</div>
                        </div>
                      );
                    })}
                  </div>

                  <button type="button"
                    onClick={() => saveOwnershipRows([...ownershipRows, { id: `other-${Date.now()}`, type: 'other', name: '', percentage: 0 }])}
                    style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: '2px dashed #bfdbfe', borderRadius: '10px', cursor: 'pointer', padding: '10px 14px', width: '100%', fontWeight: '600' }}>
                    + Add owner &nbsp;·&nbsp; company · trust · other person
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
              <button type="button" onClick={() => setSecurityStep(security.id, 1)}
                style={{ padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                ← Back
              </button>
            </div>
          </>
        )}
      </SmartCard>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fade-in">

      {/* ── Broker & Application Setup ── */}
      <SmartCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z"/><path d="M6 12H4a2 2 0 00-2 2v8h4"/><path d="M18 9h2a2 2 0 012 2v11h-4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>} title="Broker & Application Setup" summary={brokerSummary} status={brokerStatus} defaultOpen={true}>
        <div className="mb-4">
          <label>Applicant Type</label>
          <div className="pill-group">
            {['Natural Person', 'Company'].map(type => (
              <button key={type} type="button"
                className={`pill-btn${formData.applicantType === type ? ' pill-btn--active' : ''}`}
                onClick={() => updateFormData('applicantType', formData.applicantType === type ? '' : type)}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 mb-4">
          <div>
            <label>Broker Name</label>
            <select value={formData.brokerName} onChange={handleBrokerChange}>
              <option value="">Select Broker...</option>
              <option value="Laith Hana">Laith Hana</option>
              <option value="Mehdi Amirilayeghi">Mehdi Amirilayeghi</option>
              <option value="Yousif Jirjis">Yousif Jirjis</option>
            </select>
          </div>
          <div>
            <label>Client Type</label>
            <div className="pill-group">
              {['New', 'Existing'].map(t => (
                <button key={t} type="button"
                  className={`pill-btn${formData.clientType === t ? ' pill-btn--active' : ''}`}
                  onClick={() => updateFormData('clientType', formData.clientType === t ? '' : t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label>Priority</label>
            <div className="pill-group">
              {[{ label: 'Urgent', cls: 'urgent' }, { label: 'High', cls: 'high' }, { label: 'Medium', cls: 'medium' }].map(({ label, cls }) => (
                <button key={label} type="button"
                  className={`pill-btn${formData.priority === label ? ` pill-btn--${cls}` : ''}`}
                  onClick={() => updateFormData('priority', formData.priority === label ? '' : label)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {formData.clientType === 'New' && (
          <div className="mb-4">
            <label>Lead Source</label>
            <select value={formData.leadSource} onChange={(e) => updateFormData('leadSource', e.target.value)}>
              <option value="">Select...</option>
              {LEAD_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 mt-4">
          <div>
            <label>Number of Applicants</label>
            <div style={{ marginTop: '6px' }}>
              <Stepper value={formData.numApplicants} min={1} max={4}
                onChange={(v) => updateFormData('numApplicants', v)} />
            </div>
          </div>
          <div>
            <label>Number of Guarantors</label>
            <div style={{ marginTop: '6px' }}>
              <Stepper value={formData.numGuarantors} min={0} max={4}
                onChange={(v) => updateFormData('numGuarantors', v)} />
            </div>
          </div>
        </div>
      </SmartCard>

      {/* ── Security Properties ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button type="button" onClick={addSecurity} className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }}>
          + Add Security
        </button>
      </div>

      {formData.securities.map((security, index) => renderSecurityCard(security, index))}

      {/* ── Lender Preference & Notes ── */}
      <SmartCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>} title="Lender Preference & Notes" summary={lenderSummary || (formData.brokerNotes ? 'Notes added' : null)} status={lenderStatus}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Lender Preference</h3>
          {formData.lenderPreference?.length > 0 && (
            <button type="button" onClick={() => updateFormData('lenderPreference', [])}
              style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear all
            </button>
          )}
        </div>

        {[
          { label: 'Major Banks',           color: '#1e40af', bg: '#eff6ff',                   border: '#bfdbfe', lenders: ['ANZ', 'CBA', 'Westpac', 'NAB', 'St George'] },
          { label: 'Second-Tier Banks',     color: '#065f46', bg: 'var(--bg-success-surface)',  border: '#bbf7d0', lenders: ['Macquarie', 'Bankwest', 'ING', 'Suncorp', 'BOQ', 'AMP', 'Bendigo', 'ME Bank', 'Newcastle Permanent'] },
          { label: 'Non-Bank / Specialist', color: '#7c3aed', bg: '#f5f3ff',                   border: '#ddd6fe', lenders: ['Bluestone', 'Brighten', 'Firstmac', 'Granite Home Loans', 'ORDE Financial', 'Pepper Money', 'RedZed', 'Resimac', 'ThinkTank'] },
          { label: 'Other',                 color: 'var(--text-primary)', bg: 'var(--bg-secondary)', border: '#e5e7eb', lenders: ['Others'] },
        ].map(({ label, color, bg, border, lenders }) => (
          <div key={label} style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lenders.map(lender => {
                const selected = (formData.lenderPreference || []).includes(lender);
                return (
                  <button key={lender} type="button" onClick={() => toggleLender(lender)}
                    style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '20px', cursor: 'pointer', fontWeight: selected ? '600' : '400', border: selected ? `2px solid ${color}` : `1px solid ${border}`, background: selected ? bg : 'var(--bg-primary)', color: selected ? color : '#374151', transition: 'all 0.15s' }}>
                    {selected && '✓ '}{lender}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {formData.lenderPreference?.length > 0 && (
          <div style={{ marginTop: '10px', marginBottom: '20px', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
            Selected ({formData.lenderPreference.length}): <strong>{formData.lenderPreference.join(', ')}</strong>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <label>Broker Strategy Notes</label>
          <textarea value={formData.brokerNotes} onChange={(e) => updateFormData('brokerNotes', e.target.value)}
            placeholder="Enter any additional notes about the loan strategy, client preferences, or special circumstances..."
            rows="5" />
        </div>
      </SmartCard>

    </div>
  );
};

export default Step0LoanStrategy;
