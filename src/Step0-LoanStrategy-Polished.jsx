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
    securities[securityIndex].purchaseCompletionMethods = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
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

            {/* Purchase completion method */}
            {security.primaryTransactionTypes.includes('Purchase') && (
              <div className="mb-4" style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>How does the client intend to complete the purchase?</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {PURCHASE_COMPLETION.map(method => (
                    <ToggleButton key={method} label={method} color="success"
                      active={(security.purchaseCompletionMethods || []).includes(method)}
                      onClick={() => togglePurchaseCompletion(index, method)}
                    />
                  ))}
                </div>
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
