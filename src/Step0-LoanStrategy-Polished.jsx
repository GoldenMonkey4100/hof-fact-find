import React from 'react';
import './styles.css';
import { getBrokerEmail, formatCurrency, parseCurrency, calculateLVR, calculatePropertyValue, calculateLoanAmount, formatCurrencyDisplay } from './utils';
import AddressAutocomplete from './AddressAutocomplete';

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

const PRIMARY_TYPES = ['Purchase', 'Refinance'];
const SECONDARY_TYPES = ['Bridging', 'Cashout', 'Construction', 'Off the Plan', 'Pre-approval', 'SMSF', 'Vacant Land'];
const PURCHASE_COMPLETION = ['Own Savings', 'Gift from Family', 'Equity from Existing Property', 'First Home Owner Grant', 'Other'];

// [from, base, rate] — duty = base + rate × (value − from)
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

const ToggleButton = ({ label, active, onClick, color = 'success' }) => {
  const colors = {
    success: { border: 'var(--color-success)', bg: 'var(--color-success-light)', text: 'var(--color-success-dark)' },
    info:    { border: 'var(--color-info)',    bg: 'var(--color-info-light)',    text: 'var(--color-info-dark)'    },
    primary: { border: 'var(--color-primary)', bg: 'var(--color-primary-light)', text: 'var(--color-primary)'     },
  };
  const c = colors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
        fontWeight: active ? '600' : '400',
        border: active ? `2px solid ${c.border}` : '1px solid var(--border-primary)',
        background: active ? c.bg : 'white',
        color: active ? c.text : 'var(--text-primary)',
        transition: 'all 0.15s'
      }}
    >
      {active && '✓ '}{label}
    </button>
  );
};

const FundsToCompleteCard = ({ security, allSecurities }) => {
  const propVal = parseFloat(security.propertyValue) || 0;
  const loanAmt = parseFloat(security.loanAmount) || 0;
  if (!propVal || !loanAmt || propVal <= loanAmt) return null;

  const deposit    = propVal - loanAmt;
  const stampDuty  = calcStampDuty(propVal, security.state, !!security.isFirstHomeBuyer) || 0;
  const legal      = 2000;
  const inspection = 600;
  const totalNeeded = deposit + stampDuty + legal + inspection;

  const amounts = security.purchaseCompletionAmounts || {};
  const methods = security.purchaseCompletionMethods  || [];
  let confirmed = 0;
  methods.forEach(m => {
    if (m === 'Own Savings' || m === 'Gift from Family')
      confirmed += parseFloat((amounts[m] || '').replace(/,/g, '')) || 0;
    if (m === 'Equity from Existing Property') {
      const ep = (security.equityPropertyIndex !== '' && security.equityPropertyIndex !== undefined)
        ? allSecurities[parseInt(security.equityPropertyIndex)] : null;
      if (ep) confirmed += Math.max(0, (parseFloat(ep.propertyValue)||0)*0.8 - (parseFloat(ep.loanAmount)||0));
    }
    if (m === 'First Home Owner Grant')
      confirmed += calcFHOG(security.state, propVal, !!security.isNewHome);
  });

  const surplus  = confirmed - totalNeeded;
  const hasFunds = methods.length > 0;
  const fmt = n => `$${Math.round(n).toLocaleString()}`;

  const Row = ({ label, value, bold, green, muted, indent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0',
      borderBottom: '1px solid #d1fae5', fontSize: '13px',
      fontWeight: bold ? '700' : '400',
      color: green ? '#16a34a' : muted ? '#9ca3af' : 'var(--text-primary)',
      paddingLeft: indent ? '12px' : '0' }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div style={{ marginTop: '12px', padding: '14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#166534' }}>Funds to Complete</p>
      <Row label={`Deposit (${((deposit/propVal)*100).toFixed(1)}%)`} value={fmt(deposit)} />
      {stampDuty > 0 && <Row label={`Stamp Duty${security.isFirstHomeBuyer ? ' (FHB rate)' : ''}${security.state ? ` — ${security.state}` : ''}`} value={fmt(stampDuty)} />}
      {stampDuty === 0 && security.state && <Row label={`Stamp Duty — ${security.state}`} value="Exempt ✓" green />}
      {!security.state && <Row label="Stamp Duty" value="Select state above" muted />}
      <Row label="Legal Fees (est.)" value={fmt(legal)} muted />
      <Row label="Building Inspection (est.)" value={fmt(inspection)} muted />
      <Row label="Total Funds Needed" value={fmt(totalNeeded)} bold />
      {hasFunds && (
        <>
          <div style={{ margin: '8px 0 2px', fontSize: '11px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed Funds</div>
          {methods.map(m => {
            let amt = 0;
            if (m === 'Own Savings' || m === 'Gift from Family')
              amt = parseFloat((amounts[m] || '').replace(/,/g, '')) || 0;
            if (m === 'Equity from Existing Property') {
              const ep = (security.equityPropertyIndex !== '' && security.equityPropertyIndex !== undefined)
                ? allSecurities[parseInt(security.equityPropertyIndex)] : null;
              if (ep) amt = Math.max(0, (parseFloat(ep.propertyValue)||0)*0.8 - (parseFloat(ep.loanAmount)||0));
            }
            if (m === 'First Home Owner Grant')
              amt = calcFHOG(security.state, propVal, !!security.isNewHome);
            return amt > 0 ? <Row key={m} label={m} value={fmt(amt)} green indent /> : null;
          })}
          <Row
            label={surplus >= 0 ? '✓ Surplus' : '⚠ Shortfall'}
            value={fmt(Math.abs(surplus))}
            bold green={surplus >= 0}
          />
        </>
      )}
      <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
        * Estimates only. Stamp duty and FHOG figures should be confirmed with a solicitor.
      </div>
    </div>
  );
};

const Step0LoanStrategy = ({ formData, updateFormData }) => {

  const updateSecurity = (index, field, value) => {
    const securities = [...formData.securities];
    securities[index] = { ...securities[index], [field]: value };
    updateFormData('securities', securities);
  };

  const addSecurity = () => {
    const securities = [...formData.securities, {
      id: formData.securities.length + 1,
      address: '', propertyValue: '', loanAmount: '', lvr: '',
      primaryTransactionTypes: [], secondaryTransactionTypes: [],
      intendedOccupancy: '', applicationType: '',
      loanTerm: '', loanType: '', repaymentType: '', fixedRatePeriod: '', interestOnlyPeriod: '',
      split1Amount: '', split1Type: '', split1RateType: '', split1FixedYears: '', split1IOYears: '',
      split2Amount: '', split2Type: '', split2RateType: '', split2FixedYears: '', split2IOYears: '',
      currentLoanBalance: '', cashoutAmount: '', purchaseCompletionMethods: [],
      state: '', isFirstHomeBuyer: false, isNewHome: false,
      purchaseCompletionAmounts: {}, purchaseCompletionOther: '',
      equityPropertyIndex: '', giftRelationship: '',
      hasOffset: false, hasRedraw: false
    }];
    updateFormData('securities', securities);
  };

  const removeSecurity = (index) => {
    if (formData.securities.length > 1) {
      updateFormData('securities', formData.securities.filter((_, i) => i !== index));
    }
  };

  const toggleTransactionType = (securityIndex, type, isPrimary) => {
    const securities = [...formData.securities];
    const field = isPrimary ? 'primaryTransactionTypes' : 'secondaryTransactionTypes';
    const current = securities[securityIndex][field];
    securities[securityIndex][field] = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateFormData('securities', securities);
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

  const updateSecurityFields = (index, updates) => {
    const securities = [...formData.securities];
    securities[index] = { ...securities[index], ...updates };
    updateFormData('securities', securities);
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

  const handleLVRChange = (index, value) => {
    const lvrValue = value.replace(/[^0-9.]/g, '');
    const security = formData.securities[index];
    const updates = { lvr: lvrValue };
    if (security.propertyValue && lvrValue) updates.loanAmount = calculateLoanAmount(security.propertyValue, lvrValue);
    else if (security.loanAmount && lvrValue) updates.propertyValue = calculatePropertyValue(security.loanAmount, lvrValue);
    updateSecurityFields(index, updates);
  };

  // Refinance + Cashout: auto-calculate total loan amount from breakdown fields
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

  return (
    <div className="fade-in">

      {/* Applicant Type */}
      <div className="mb-8">
        <label>Applicant Type</label>
        <div className="grid grid-cols-2">
          {['Natural Person', 'Company'].map(type => (
            <button key={type} type="button"
              onClick={() => updateFormData('applicantType', type)}
              style={{
                padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500',
                border: formData.applicantType === type ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                background: formData.applicantType === type ? 'var(--color-primary)' : 'white',
                color: formData.applicantType === type ? 'white' : 'var(--text-primary)'
              }}
            >{type}</button>
          ))}
        </div>
      </div>

      {/* Broker Details */}
      <div className="card mb-8">
        <h3 className="card-title">Broker Details</h3>

        <div className="grid grid-cols-2 mb-4">
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
            <select value={formData.clientType} onChange={(e) => updateFormData('clientType', e.target.value)}>
              <option value="">Select...</option>
              <option value="New">New</option>
              <option value="Existing">Existing</option>
            </select>
          </div>
        </div>

        {formData.clientType === 'New' && (
          <div>
            <label>Lead Source</label>
            <select value={formData.leadSource} onChange={(e) => updateFormData('leadSource', e.target.value)}>
              <option value="">Select...</option>
              {LEAD_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Number of Applicants & Guarantors */}
      <div className="grid grid-cols-2 mb-8">
        <div>
          <label>Number of Applicants</label>
          <select value={formData.numApplicants} onChange={(e) => updateFormData('numApplicants', parseInt(e.target.value))}>
            {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label>Number of Guarantors</label>
          <select value={formData.numGuarantors} onChange={(e) => updateFormData('numGuarantors', parseInt(e.target.value))}>
            {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Security Properties */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Security Properties</h3>
          <button type="button" onClick={addSecurity} className="btn-secondary">+ Add Security</button>
        </div>

        {formData.securities.map((security, index) => (
          <div key={security.id} className="card mb-6">
            <div className="card-header">
              <div>
                <h4 className="card-title" style={{ margin: 0 }}>Security {index + 1}</h4>
                {security.address && <p className="card-subtitle">{security.address}</p>}
              </div>
              {formData.securities.length > 1 && (
                <button type="button" onClick={() => removeSecurity(index)} className="btn-danger">Remove</button>
              )}
            </div>

            {/* Property Address — Google Places autocomplete */}
            <div className="mb-4">
              <label>Property Address</label>
              <AddressAutocomplete
                value={security.address}
                onChange={(val) => updateSecurity(index, 'address', val)}
                placeholder="Start typing an address…"
              />
            </div>

            {/* Property Value / Loan Amount / LVR */}
            <div className="grid grid-cols-3 mb-4">
              <div>
                <label>Property Value</label>
                <input type="text" value={formatCurrency(security.propertyValue)}
                  onChange={(e) => handlePropertyValueChange(index, e.target.value)} placeholder="750,000" />
                {security.propertyValue && <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px' }}>{formatCurrencyDisplay(security.propertyValue)}</div>}
              </div>
              <div>
                <label>
                  {isRefinanceCashout(security) ? 'Total Loan Amount (auto-calculated)' : 'Loan Amount'}
                </label>
                <input type="text"
                  value={formatCurrency(security.loanAmount)}
                  onChange={(e) => handleLoanAmountChange(index, e.target.value)}
                  placeholder="600,000"
                  readOnly={isRefinanceCashout(security)}
                  style={isRefinanceCashout(security) ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
                />
                {security.loanAmount && <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px' }}>{formatCurrencyDisplay(security.loanAmount)}</div>}
              </div>
              <div>
                <label>LVR (%)</label>
                <input type="text" value={security.lvr}
                  onChange={(e) => handleLVRChange(index, e.target.value)} placeholder="80.00" />
                {security.lvr && (
                  <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px' }}>
                    {parseFloat(security.lvr) > 80 ? '⚠️ High LVR — may require LMI' : '✓ Standard LVR'}
                  </div>
                )}
              </div>
            </div>

            {/* Refinance + Cashout breakdown — Option B */}
            {isRefinanceCashout(security) && (
              <div className="mb-4" style={{ padding: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
                  Refinance + Cashout Breakdown
                </p>
                <div className="grid grid-cols-2">
                  <div>
                    <label style={{ fontSize: '13px' }}>Current Loan Balance</label>
                    <input type="text" value={formatCurrency(security.currentLoanBalance || '')}
                      onChange={(e) => handleRefinanceBreakdown(index, 'currentLoanBalance', e.target.value)}
                      placeholder="400,000" />
                    <div className="hint-text" style={{ fontSize: '11px', marginTop: '4px' }}>What you currently owe on this property</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px' }}>Cashout Amount</label>
                    <input type="text" value={formatCurrency(security.cashoutAmount || '')}
                      onChange={(e) => handleRefinanceBreakdown(index, 'cashoutAmount', e.target.value)}
                      placeholder="100,000" />
                    <div className="hint-text" style={{ fontSize: '11px', marginTop: '4px' }}>Additional funds you want to release</div>
                  </div>
                </div>
              </div>
            )}

            {/* Intended Occupancy — button group, above transaction types */}
            <div className="mb-4">
              <label style={{ fontWeight: '500' }}>Intended Occupancy</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Owner Occupied', 'Investment'].map(type => (
                  <ToggleButton key={type} label={type} color="primary"
                    active={security.intendedOccupancy === type}
                    onClick={() => updateSecurity(index, 'intendedOccupancy',
                      security.intendedOccupancy === type ? '' : type)}
                  />
                ))}
              </div>
            </div>

            {/* Primary Transaction Type */}
            <div className="mb-4">
              <label style={{ fontWeight: '500' }}>Primary Transaction Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {PRIMARY_TYPES.map(type => (
                  <ToggleButton key={type} label={type} color="success"
                    active={security.primaryTransactionTypes.includes(type)}
                    onClick={() => toggleTransactionType(index, type, true)}
                  />
                ))}
              </div>
            </div>

            {/* Purchase section — state, stamp duty, completion methods */}
            {security.primaryTransactionTypes.includes('Purchase') && (
              <div className="mb-4" style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>

                {/* State + FHB */}
                <div className="grid grid-cols-2 mb-3">
                  <div>
                    <label style={{ fontSize: '13px', color: '#166534' }}>State / Territory</label>
                    <select value={security.state || ''}
                      onChange={(e) => updateSecurity(index, 'state', e.target.value)}
                      style={{ fontSize: '13px' }}>
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
                    {security.isFirstHomeBuyer && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '13px' }}>
                        <input type="checkbox" checked={!!security.isNewHome}
                          onChange={(e) => updateSecurity(index, 'isNewHome', e.target.checked)} />
                        New / off-the-plan home
                      </label>
                    )}
                  </div>
                </div>

                {/* Stamp duty result */}
                {security.state && security.propertyValue && (() => {
                  const duty = calcStampDuty(parseFloat(security.propertyValue), security.state, !!security.isFirstHomeBuyer);
                  if (duty === null) return null;
                  return (
                    <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#166534' }}>
                          Estimated Stamp Duty — {security.state}{security.isFirstHomeBuyer ? ' (FHB rate)' : ''}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: duty === 0 ? '#16a34a' : '#166534' }}>
                          {duty === 0 ? 'Exempt ✓' : `$${duty.toLocaleString()}`}
                        </span>
                      </div>
                      {security.isFirstHomeBuyer && FHB_CONCESSIONS[security.state]?.note && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                          {FHB_CONCESSIONS[security.state].note}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* How does the client intend to complete the purchase */}
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                  How does the client intend to complete the purchase?
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', marginBottom: '12px' }}>
                  {PURCHASE_COMPLETION.map(method => (
                    <ToggleButton key={method} label={method} color="success"
                      active={(security.purchaseCompletionMethods || []).includes(method)}
                      onClick={() => togglePurchaseCompletion(index, method)}
                    />
                  ))}
                </div>

                {/* Per-method sub-fields */}
                {(security.purchaseCompletionMethods || []).map(method => (
                  <div key={method} style={{ marginBottom: '10px', padding: '10px 12px', background: 'white', borderRadius: '6px', border: '1px solid #d1fae5' }}>

                    {/* Own Savings / Gift from Family → amount + gift relationship */}
                    {(method === 'Own Savings' || method === 'Gift from Family') && (
                      <div>
                        <label style={{ fontSize: '13px' }}>{method} — Amount</label>
                        <input type="text"
                          value={formatCurrency(security.purchaseCompletionAmounts?.[method] || '')}
                          onChange={(e) => {
                            const val = parseCurrency(e.target.value);
                            updateSecurity(index, 'purchaseCompletionAmounts', {
                              ...(security.purchaseCompletionAmounts || {}), [method]: val,
                            });
                          }}
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

                    {/* Equity from Existing Property → link + equity calc */}
                    {method === 'Equity from Existing Property' && (() => {
                      const eqIdx = security.equityPropertyIndex;
                      const equityProp = (eqIdx !== '' && eqIdx !== undefined) ? formData.securities[parseInt(eqIdx)] : null;
                      const availEquity = equityProp
                        ? Math.max(0, (parseFloat(equityProp.propertyValue)||0) * 0.8 - (parseFloat(equityProp.loanAmount)||0))
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
                            <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '4px', fontSize: '12px' }}>
                              <div>Property Value: <strong>{formatCurrencyDisplay(equityProp.propertyValue)}</strong></div>
                              <div>Existing Loan: <strong>{formatCurrencyDisplay(equityProp.loanAmount)}</strong></div>
                              <div style={{ marginTop: '4px', color: availEquity > 0 ? '#166534' : '#dc2626', fontWeight: '600' }}>
                                Available Equity (80% LVR): <strong>${(availEquity || 0).toLocaleString()}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* First Home Owner Grant → eligibility + amount */}
                    {method === 'First Home Owner Grant' && (() => {
                      const st = security.state;
                      const fhogData = st ? FHOG_DATA[st] : null;
                      const fhogAmt = (fhogData && security.isFirstHomeBuyer)
                        ? calcFHOG(st, security.propertyValue, !!security.isNewHome)
                        : null;
                      return (
                        <div>
                          <label style={{ fontSize: '13px' }}>First Home Owner Grant Eligibility</label>
                          {!st ? (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                              Select a state above to check FHOG eligibility
                            </div>
                          ) : !security.isFirstHomeBuyer ? (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                              Tick "First Home Buyer" above to check eligibility
                            </div>
                          ) : fhogData?.amount === 0 ? (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{fhogData.note}</div>
                          ) : (
                            <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: '4px', fontSize: '12px', marginTop: '4px' }}>
                              <div style={{ fontWeight: '600', color: fhogAmt > 0 ? '#16a34a' : '#9ca3af' }}>
                                {fhogAmt > 0
                                  ? `Grant: $${fhogAmt.toLocaleString()} ✓`
                                  : fhogAmt === 0 && security.isNewHome
                                    ? `Not eligible — property value exceeds ${st} cap`
                                    : `Potential grant: $${fhogData?.amount?.toLocaleString()} — tick "New home" above to confirm`
                                }
                              </div>
                              <div style={{ color: '#4b5563', marginTop: '2px' }}>{fhogData?.note}</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Other → textarea */}
                    {method === 'Other' && (
                      <div>
                        <label style={{ fontSize: '13px' }}>Please describe</label>
                        <textarea
                          value={security.purchaseCompletionOther || ''}
                          onChange={(e) => updateSecurity(index, 'purchaseCompletionOther', e.target.value)}
                          placeholder="Describe how the client will complete the purchase…"
                          rows="2" style={{ fontSize: '13px' }} />
                      </div>
                    )}
                  </div>
                ))}

                {/* Funds to Complete summary */}
                <FundsToCompleteCard security={security} allSecurities={formData.securities} />
              </div>
            )}

            {/* Secondary Transaction Type */}
            <div className="mb-4">
              <label style={{ fontWeight: '500' }}>Secondary Transaction Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {SECONDARY_TYPES.map(type => (
                  <ToggleButton key={type} label={type} color="info"
                    active={security.secondaryTransactionTypes.includes(type)}
                    onClick={() => toggleTransactionType(index, type, false)}
                  />
                ))}
              </div>
            </div>

            {/* Application Type — button group */}
            <div className="mb-4">
              <label style={{ fontWeight: '500' }}>Application Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Full Doc', 'Low Doc'].map(type => (
                  <ToggleButton key={type} label={type} color="primary"
                    active={security.applicationType === type}
                    onClick={() => updateSecurity(index, 'applicationType',
                      security.applicationType === type ? '' : type)}
                  />
                ))}
              </div>
            </div>

            {/* Loan Structure */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>Loan Structure</h4>

              <div className="grid grid-cols-2 mb-4">
                <div>
                  <label>Loan Term (years)</label>
                  <input type="number" value={security.loanTerm}
                    onChange={(e) => updateSecurity(index, 'loanTerm', e.target.value)} placeholder="30" />
                </div>
                <div>
                  <label>Repayment Type</label>
                  <select value={security.repaymentType}
                    onChange={(e) => updateSecurity(index, 'repaymentType', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Variable">Variable</option>
                    <option value="Split">Split</option>
                  </select>
                </div>
              </div>

              {security.repaymentType === 'Fixed' && (
                <div className="mb-4">
                  <label>Fixed Rate Period (years)</label>
                  <select value={security.fixedRatePeriod || ''}
                    onChange={(e) => updateSecurity(index, 'fixedRatePeriod', e.target.value)}>
                    <option value="">Select...</option>
                    {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              )}

              {security.repaymentType !== 'Split' && (
                <div className="mb-4">
                  <label>Loan Type</label>
                  <select value={security.loanType}
                    onChange={(e) => updateSecurity(index, 'loanType', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Principal & Interest">Principal & Interest</option>
                    <option value="Interest Only">Interest Only</option>
                  </select>
                </div>
              )}

              {security.loanType === 'Interest Only' && security.repaymentType !== 'Split' && (
                <div className="mb-4">
                  <label>Interest Only Period (years)</label>
                  <select value={security.interestOnlyPeriod}
                    onChange={(e) => updateSecurity(index, 'interestOnlyPeriod', e.target.value)}>
                    <option value="">Select...</option>
                    {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              )}

              {/* Split Details */}
              {security.repaymentType === 'Split' && (
                <div className="mb-4" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Split Details</h4>

                  {[1, 2].map(splitNum => {
                    const amtKey = `split${splitNum}Amount`;
                    const typeKey = `split${splitNum}Type`;
                    const rateKey = `split${splitNum}RateType`;
                    const fixedKey = `split${splitNum}FixedYears`;
                    const ioKey = `split${splitNum}IOYears`;
                    return (
                      <div key={splitNum} className="mb-4" style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <p style={{ fontWeight: '600', fontSize: '13px', margin: '0 0 10px 0' }}>Split {splitNum}</p>
                        <div className="grid grid-cols-2 mb-3">
                          <div>
                            <label style={{ fontSize: '13px' }}>Loan Amount</label>
                            <input type="text" value={formatCurrency(security[amtKey] || '')}
                              onChange={(e) => updateSecurity(index, amtKey, parseCurrency(e.target.value))}
                              placeholder="300,000" style={{ fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '13px' }}>Loan Type (P&I / IO)</label>
                            <select value={security[typeKey] || ''} style={{ fontSize: '13px' }}
                              onChange={(e) => updateSecurity(index, typeKey, e.target.value)}>
                              <option value="">Select...</option>
                              <option value="Principal & Interest">Principal & Interest</option>
                              <option value="Interest Only">Interest Only</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 mb-2">
                          <div>
                            <label style={{ fontSize: '13px' }}>Rate Type</label>
                            <select value={security[rateKey] || ''} style={{ fontSize: '13px' }}
                              onChange={(e) => updateSecurity(index, rateKey, e.target.value)}>
                              <option value="">Select...</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          </div>
                          {security[rateKey] === 'Fixed' && (
                            <div>
                              <label style={{ fontSize: '13px' }}>Fixed Years</label>
                              <select value={security[fixedKey] || ''} style={{ fontSize: '13px' }}
                                onChange={(e) => updateSecurity(index, fixedKey, e.target.value)}>
                                <option value="">Select...</option>
                                {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} yr{y > 1 ? 's' : ''}</option>)}
                              </select>
                            </div>
                          )}
                          {security[typeKey] === 'Interest Only' && (
                            <div>
                              <label style={{ fontSize: '13px' }}>IO Period (years)</label>
                              <select value={security[ioKey] || ''} style={{ fontSize: '13px' }}
                                onChange={(e) => updateSecurity(index, ioKey, e.target.value)}>
                                <option value="">Select...</option>
                                {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} yr{y > 1 ? 's' : ''}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {security.split1Amount && security.split2Amount && (
                    <div className="hint-text" style={{ marginTop: '8px' }}>
                      {(() => {
                        const s1 = parseFloat(parseCurrency(security.split1Amount)) || 0;
                        const s2 = parseFloat(parseCurrency(security.split2Amount)) || 0;
                        const total = s1 + s2;
                        const loan = parseFloat(parseCurrency(security.loanAmount)) || 0;
                        return Math.abs(total - loan) < 1
                          ? `✓ Total: ${formatCurrencyDisplay(total.toString())} — matches loan amount`
                          : `⚠️ Total: ${formatCurrencyDisplay(total.toString())} — loan amount is ${formatCurrencyDisplay(security.loanAmount)}`;
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={security.hasOffset}
                    onChange={(e) => updateSecurity(index, 'hasOffset', e.target.checked)} />
                  <span>Offset Account</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={security.hasRedraw}
                    onChange={(e) => updateSecurity(index, 'hasRedraw', e.target.checked)} />
                  <span>Redraw Facility</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lender Preference */}
      <div className="mb-8">
        <label style={{ fontWeight: '500' }}>Lender Preference (select all that apply)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px' }}>
          {['ANZ','CBA','Westpac','NAB','Macquarie','Bankwest','ING','Suncorp','BOQ','Bendigo','Others'].map(lender => (
            <label key={lender} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={(formData.lenderPreference || []).includes(lender)}
                onChange={() => toggleLender(lender)} style={{ marginRight: '8px' }} />
              <span>{lender}</span>
            </label>
          ))}
        </div>
        {formData.lenderPreference?.length > 0 && (
          <div className="hint-text" style={{ marginTop: '8px' }}>Selected: {formData.lenderPreference.join(', ')}</div>
        )}
      </div>

      {/* Broker Strategy Notes */}
      <div>
        <label>Broker Strategy Notes</label>
        <textarea value={formData.brokerNotes} onChange={(e) => updateFormData('brokerNotes', e.target.value)}
          placeholder="Enter any additional notes about the loan strategy, client preferences, or special circumstances..."
          rows="5" />
      </div>
    </div>
  );
};

export default Step0LoanStrategy;
