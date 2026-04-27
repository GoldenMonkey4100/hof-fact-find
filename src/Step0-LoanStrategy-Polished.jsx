import React from 'react';
import './styles.css';
import { getBrokerEmail, formatCurrency, parseCurrency, calculateLVR, calculatePropertyValue, calculateLoanAmount, formatCurrencyDisplay } from './utils';

const Step0LoanStrategy = ({ formData, updateFormData }) => {

  const updateSecurity = (index, field, value) => {
    const securities = [...formData.securities];
    securities[index] = { ...securities[index], [field]: value };
    updateFormData('securities', securities);
  };

  const addSecurity = () => {
    const securities = [...formData.securities, {
      id: formData.securities.length + 1,
      address: '',
      propertyValue: '',
      loanAmount: '',
      lvr: '',
      primaryTransactionTypes: [],
      secondaryTransactionTypes: [],
      intendedOccupancy: '',
      applicationType: '',
      loanTerm: '',
      loanType: '',
      repaymentType: '',
      fixedRatePeriod: '',
      interestOnlyPeriod: '',
      split1Amount: '',
      split1Type: '',
      split2Amount: '',
      split2Type: '',
      ratePreference: '',
      hasOffset: false,
      hasRedraw: false
    }];
    updateFormData('securities', securities);
  };

  const removeSecurity = (index) => {
    if (formData.securities.length > 1) {
      const securities = formData.securities.filter((_, i) => i !== index);
      updateFormData('securities', securities);
    }
  };

  const toggleTransactionType = (securityIndex, type, isPrimary) => {
    const securities = [...formData.securities];
    const field = isPrimary ? 'primaryTransactionTypes' : 'secondaryTransactionTypes';
    const current = securities[securityIndex][field];
    if (current.includes(type)) {
      securities[securityIndex][field] = current.filter(t => t !== type);
    } else {
      securities[securityIndex][field] = [...current, type];
    }
    updateFormData('securities', securities);
  };

  // Change 1: Broker dropdown with auto-email
  const handleBrokerChange = (e) => {
    const brokerName = e.target.value;
    updateFormData('brokerName', brokerName);
    updateFormData('brokerEmail', getBrokerEmail(brokerName));
  };

  // Atomic multi-field update — prevents stale closure race condition
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
    if (security.propertyValue && lvrValue) {
      updates.loanAmount = calculateLoanAmount(security.propertyValue, lvrValue);
    } else if (security.loanAmount && lvrValue) {
      updates.propertyValue = calculatePropertyValue(security.loanAmount, lvrValue);
    }
    updateSecurityFields(index, updates);
  };

  // Change 5: Lender multi-select toggle
  const toggleLender = (lender) => {
    const currentLenders = formData.lenderPreference || [];
    if (currentLenders.includes(lender)) {
      updateFormData('lenderPreference', currentLenders.filter(l => l !== lender));
    } else {
      updateFormData('lenderPreference', [...currentLenders, lender]);
    }
  };

  return (
    <div className="fade-in">

      {/* Applicant Type */}
      <div className="mb-8">
        <label>Applicant Type</label>
        <div className="grid grid-cols-2">
          {['Natural Person', 'Company'].map(type => (
            <button
              key={type}
              onClick={() => updateFormData('applicantType', type)}
              className={formData.applicantType === type ? 'btn-primary' : 'btn-secondary'}
              style={{
                border: formData.applicantType === type ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                background: formData.applicantType === type ? 'var(--color-primary)' : 'white',
                color: formData.applicantType === type ? 'white' : 'var(--text-primary)'
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Broker Details Card */}
      <div className="card mb-8">
        <h3 className="card-title">Broker Details</h3>

        <div className="grid grid-cols-2 mb-4">
          {/* Change 1: Broker dropdown - email auto-fills in background */}
          <div>
            <label>Broker Name</label>
            <select
              value={formData.brokerName}
              onChange={handleBrokerChange}
              required
            >
              <option value="">Select Broker...</option>
              <option value="Laith Hana">Laith Hana</option>
              <option value="Mehdi Amirilayeghi">Mehdi Amirilayeghi</option>
              <option value="Yousif Jirjis">Yousif Jirjis</option>
            </select>
          </div>
          <div>
            <label>Client Type</label>
            <select
              value={formData.clientType}
              onChange={(e) => updateFormData('clientType', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="New">New</option>
              <option value="Existing">Existing</option>
              <option value="Family & Friends">Family & Friends</option>
            </select>
          </div>
        </div>

        {formData.clientType === 'New' && (
          <div>
            <label>Lead Source</label>
            <select
              value={formData.leadSource}
              onChange={(e) => updateFormData('leadSource', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Referral">Referral</option>
              <option value="Website">Website</option>
              <option value="Social Media">Social Media</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}
      </div>

      {/* Number of Applicants & Guarantors */}
      <div className="grid grid-cols-2 mb-8">
        <div>
          <label>Number of Applicants</label>
          <select
            value={formData.numApplicants}
            onChange={(e) => updateFormData('numApplicants', parseInt(e.target.value))}
          >
            {[1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Number of Guarantors</label>
          <select
            value={formData.numGuarantors}
            onChange={(e) => updateFormData('numGuarantors', parseInt(e.target.value))}
          >
            {[0, 1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Security Properties */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Security Properties</h3>
          <button onClick={addSecurity} className="btn-secondary">
            + Add Security
          </button>
        </div>

        {formData.securities.map((security, index) => (
          <div key={security.id} className="card mb-6">
            <div className="card-header">
              <div>
                <h4 className="card-title" style={{ margin: 0 }}>Security {index + 1}</h4>
                {security.address && (
                  <p className="card-subtitle">{security.address}</p>
                )}
              </div>
              {formData.securities.length > 1 && (
                <button onClick={() => removeSecurity(index)} className="btn-danger">
                  Remove
                </button>
              )}
            </div>

            {/* Property Details */}
            <div className="mb-4">
              <label>Property Address</label>
              <input
                type="text"
                value={security.address}
                onChange={(e) => updateSecurity(index, 'address', e.target.value)}
                placeholder="123 Main Street, Sydney NSW 2000"
              />
            </div>

            {/* Change 2: Currency-formatted Property Value & Loan Amount */}
            {/* Change 3: LVR is now editable with 3-way calculation */}
            <div className="grid grid-cols-3 mb-4">
              <div>
                <label>Property Value</label>
                <input
                  type="text"
                  value={formatCurrency(security.propertyValue)}
                  onChange={(e) => handlePropertyValueChange(index, e.target.value)}
                  placeholder="750,000"
                />
                {security.propertyValue && (
                  <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                    {formatCurrencyDisplay(security.propertyValue)}
                  </div>
                )}
              </div>
              <div>
                <label>Loan Amount</label>
                <input
                  type="text"
                  value={formatCurrency(security.loanAmount)}
                  onChange={(e) => handleLoanAmountChange(index, e.target.value)}
                  placeholder="600,000"
                />
                {security.loanAmount && (
                  <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                    {formatCurrencyDisplay(security.loanAmount)}
                  </div>
                )}
              </div>
              <div>
                <label>LVR (%)</label>
                <input
                  type="text"
                  value={security.lvr}
                  onChange={(e) => handleLVRChange(index, e.target.value)}
                  placeholder="80.00"
                />
                {security.lvr && (
                  <div className="hint-text" style={{ fontSize: '12px', marginTop: '4px' }}>
                    {parseFloat(security.lvr) > 80
                      ? '⚠️ High LVR - May require LMI'
                      : '✓ Standard LVR'}
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Types */}
            <div className="mb-4">
              <label style={{ fontWeight: '500' }}>Primary Transaction Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Purchase', 'Refinance', 'Construction'].map(type => (
                  <button
                    key={type}
                    onClick={() => toggleTransactionType(index, type, true)}
                    className="btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      border: security.primaryTransactionTypes.includes(type) ? '2px solid var(--color-success)' : '1px solid var(--border-primary)',
                      background: security.primaryTransactionTypes.includes(type) ? 'var(--color-success-light)' : 'white',
                      color: security.primaryTransactionTypes.includes(type) ? 'var(--color-success-dark)' : 'var(--text-primary)'
                    }}
                  >
                    {security.primaryTransactionTypes.includes(type) && '✓ '}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label style={{ fontWeight: '500' }}>Secondary Transaction Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Cashout', 'Vacant Land', 'SMSF', 'Bridging', 'Off the Plan'].map(type => (
                  <button
                    key={type}
                    onClick={() => toggleTransactionType(index, type, false)}
                    className="btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      border: security.secondaryTransactionTypes.includes(type) ? '2px solid var(--color-info)' : '1px solid var(--border-primary)',
                      background: security.secondaryTransactionTypes.includes(type) ? 'var(--color-info-light)' : 'white',
                      color: security.secondaryTransactionTypes.includes(type) ? 'var(--color-info-dark)' : 'var(--text-primary)'
                    }}
                  >
                    {security.secondaryTransactionTypes.includes(type) && '✓ '}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Occupancy & Application Type */}
            <div className="grid grid-cols-2 mb-4">
              <div>
                <label>Intended Occupancy</label>
                <select
                  value={security.intendedOccupancy}
                  onChange={(e) => updateSecurity(index, 'intendedOccupancy', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Owner Occupied">Owner Occupied</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>
              <div>
                <label>Application Type</label>
                <select
                  value={security.applicationType}
                  onChange={(e) => updateSecurity(index, 'applicationType', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Full Doc">Full Doc</option>
                  <option value="Low Doc">Low Doc</option>
                  <option value="Alt Doc">Alt Doc</option>
                </select>
              </div>
            </div>

            {/* Loan Structure */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                Loan Structure
              </h4>

              <div className="grid grid-cols-2 mb-4">
                <div>
                  <label>Loan Term (years)</label>
                  <input
                    type="number"
                    value={security.loanTerm}
                    onChange={(e) => updateSecurity(index, 'loanTerm', e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label>Repayment Type</label>
                  <select
                    value={security.repaymentType}
                    onChange={(e) => updateSecurity(index, 'repaymentType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Variable">Variable</option>
                    <option value="Split">Split</option>
                  </select>
                </div>
              </div>

              {/* Fixed Rate Period — only shown when Fixed is selected */}
              {security.repaymentType === 'Fixed' && (
                <div className="mb-4">
                  <label>Fixed Rate Period (years)</label>
                  <select
                    value={security.fixedRatePeriod || ''}
                    onChange={(e) => updateSecurity(index, 'fixedRatePeriod', e.target.value)}
                  >
                    <option value="">Select...</option>
                    {[1, 2, 3, 4, 5].map(year => (
                      <option key={year} value={year}>{year} year{year > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Loan Type — hidden when Split (each split has its own type) */}
              {security.repaymentType !== 'Split' && (
                <div className="mb-4">
                  <label>Loan Type</label>
                  <select
                    value={security.loanType}
                    onChange={(e) => updateSecurity(index, 'loanType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Principal & Interest">Principal & Interest</option>
                    <option value="Interest Only">Interest Only</option>
                  </select>
                </div>
              )}

              {/* Interest Only Period — only when IO and not Split */}
              {security.loanType === 'Interest Only' && security.repaymentType !== 'Split' && (
                <div className="mb-4">
                  <label>Interest Only Period (years)</label>
                  <select
                    value={security.interestOnlyPeriod}
                    onChange={(e) => updateSecurity(index, 'interestOnlyPeriod', e.target.value)}
                  >
                    <option value="">Select...</option>
                    {[1, 2, 3, 4, 5].map(year => (
                      <option key={year} value={year}>{year} year{year > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Split Details — shown instead of Loan Type when Split is selected */}
              {security.repaymentType === 'Split' && (
                <div className="mb-4" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Split Details</h4>

                  <div className="mb-4">
                    <label>Split 1 — Loan Amount</label>
                    <input
                      type="text"
                      value={formatCurrency(security.split1Amount || '')}
                      onChange={(e) => updateSecurity(index, 'split1Amount', parseCurrency(e.target.value))}
                      placeholder="300,000"
                    />
                    <div className="mt-2">
                      <label style={{ fontSize: '13px' }}>Split 1 — Loan Type</label>
                      <select
                        value={security.split1Type || ''}
                        onChange={(e) => updateSecurity(index, 'split1Type', e.target.value)}
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">Select Type...</option>
                        <option value="Principal & Interest">Principal & Interest</option>
                        <option value="Interest Only">Interest Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label>Split 2 — Loan Amount</label>
                    <input
                      type="text"
                      value={formatCurrency(security.split2Amount || '')}
                      onChange={(e) => updateSecurity(index, 'split2Amount', parseCurrency(e.target.value))}
                      placeholder="300,000"
                    />
                    <div className="mt-2">
                      <label style={{ fontSize: '13px' }}>Split 2 — Loan Type</label>
                      <select
                        value={security.split2Type || ''}
                        onChange={(e) => updateSecurity(index, 'split2Type', e.target.value)}
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">Select Type...</option>
                        <option value="Principal & Interest">Principal & Interest</option>
                        <option value="Interest Only">Interest Only</option>
                      </select>
                    </div>
                  </div>

                  {security.split1Amount && security.split2Amount && (
                    <div className="hint-text" style={{ marginTop: '8px' }}>
                      {(() => {
                        const s1 = parseFloat(parseCurrency(security.split1Amount)) || 0;
                        const s2 = parseFloat(parseCurrency(security.split2Amount)) || 0;
                        const total = s1 + s2;
                        const loan = parseFloat(parseCurrency(security.loanAmount)) || 0;
                        return Math.abs(total - loan) < 1
                          ? `✓ Total: ${formatCurrencyDisplay(total.toString())} (matches loan amount)`
                          : `⚠️ Total: ${formatCurrencyDisplay(total.toString())} (loan amount is ${formatCurrencyDisplay(security.loanAmount)})`;
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <label>Rate Preference</label>
                <select
                  value={security.ratePreference}
                  onChange={(e) => updateSecurity(index, 'ratePreference', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Lowest Rate">Lowest Rate</option>
                  <option value="Competitive Rate">Competitive Rate</option>
                  <option value="Not Important">Not Important</option>
                </select>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={security.hasOffset}
                    onChange={(e) => updateSecurity(index, 'hasOffset', e.target.checked)}
                  />
                  <span>Offset Account</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={security.hasRedraw}
                    onChange={(e) => updateSecurity(index, 'hasRedraw', e.target.checked)}
                  />
                  <span>Redraw Facility</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Change 5: Lender Preference multi-select checkboxes */}
      <div className="mb-8">
        <label style={{ fontWeight: '500' }}>Lender Preference (select all that apply)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
          {['ANZ', 'CBA', 'Westpac', 'NAB', 'Macquarie', 'Bankwest', 'ING', 'Suncorp', 'BOQ', 'Bendigo', 'Others'].map(lender => (
            <label key={lender} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(formData.lenderPreference || []).includes(lender)}
                onChange={() => toggleLender(lender)}
                style={{ marginRight: '8px' }}
              />
              <span>{lender}</span>
            </label>
          ))}
        </div>
        {formData.lenderPreference && formData.lenderPreference.length > 0 && (
          <div className="hint-text" style={{ marginTop: '8px' }}>
            Selected: {formData.lenderPreference.join(', ')}
          </div>
        )}
      </div>

      {/* Broker Strategy Notes */}
      <div>
        <label>Broker Strategy Notes</label>
        <textarea
          value={formData.brokerNotes}
          onChange={(e) => updateFormData('brokerNotes', e.target.value)}
          placeholder="Enter any additional notes about the loan strategy, client preferences, or special circumstances..."
          rows="5"
        />
      </div>
    </div>
  );
};

export default Step0LoanStrategy;
