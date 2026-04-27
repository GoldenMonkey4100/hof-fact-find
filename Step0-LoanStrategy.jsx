import React, { useState } from 'react';

const FactFindApp = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 0 - Loan Strategy
    applicantType: 'Natural Person',
    brokerName: '',
    brokerEmail: '',
    clientType: '',
    leadSource: '',
    numApplicants: 1,
    numGuarantors: 0,
    securities: [{
      id: 1,
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
      interestOnlyPeriod: '',
      splits: [],
      ratePreference: '',
      hasOffset: false,
      hasRedraw: false
    }],
    lenderPreference: '',
    brokerNotes: '',
    
    // Step 1 - Applicants (placeholder)
    applicants: [],
    
    // Step 2 - Employment (placeholder)
    employment: [],
    
    // Step 3 - Assets & Liabilities (placeholder)
    assets: [],
    liabilities: [],
    
    // Step 4 - Review (placeholder)
    reviewComplete: false
  });

  const steps = [
    'Loan Strategy',
    'Applicants',
    'Employment & Income',
    'Assets & Liabilities',
    'Review'
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSecurity = (index, field, value) => {
    setFormData(prev => {
      const newSecurities = [...prev.securities];
      newSecurities[index] = { ...newSecurities[index], [field]: value };
      
      // Auto-calculate LVR
      if (field === 'propertyValue' || field === 'loanAmount') {
        const propValue = field === 'propertyValue' ? parseFloat(value) : parseFloat(newSecurities[index].propertyValue);
        const loanAmt = field === 'loanAmount' ? parseFloat(value) : parseFloat(newSecurities[index].loanAmount);
        if (propValue && loanAmt) {
          newSecurities[index].lvr = ((loanAmt / propValue) * 100).toFixed(2);
        }
      }
      
      return { ...prev, securities: newSecurities };
    });
  };

  const addSecurity = () => {
    setFormData(prev => ({
      ...prev,
      securities: [...prev.securities, {
        id: prev.securities.length + 1,
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
        interestOnlyPeriod: '',
        splits: [],
        ratePreference: '',
        hasOffset: false,
        hasRedraw: false
      }]
    }));
  };

  const removeSecurity = (index) => {
    if (formData.securities.length > 1) {
      setFormData(prev => ({
        ...prev,
        securities: prev.securities.filter((_, i) => i !== index)
      }));
    }
  };

  const addLoanSplit = (securityIndex) => {
    setFormData(prev => {
      const newSecurities = [...prev.securities];
      const splits = newSecurities[securityIndex].splits || [];
      splits.push({
        id: splits.length + 1,
        portion: '',
        repaymentType: ''
      });
      newSecurities[securityIndex].splits = splits;
      return { ...prev, securities: newSecurities };
    });
  };

  const removeLoanSplit = (securityIndex, splitIndex) => {
    setFormData(prev => {
      const newSecurities = [...prev.securities];
      newSecurities[securityIndex].splits = newSecurities[securityIndex].splits.filter((_, i) => i !== splitIndex);
      return { ...prev, securities: newSecurities };
    });
  };

  const updateLoanSplit = (securityIndex, splitIndex, field, value) => {
    setFormData(prev => {
      const newSecurities = [...prev.securities];
      newSecurities[securityIndex].splits[splitIndex][field] = value;
      return { ...prev, securities: newSecurities };
    });
  };

  const toggleTransactionType = (securityIndex, type, isPrimary) => {
    setFormData(prev => {
      const newSecurities = [...prev.securities];
      const field = isPrimary ? 'primaryTransactionTypes' : 'secondaryTransactionTypes';
      const current = newSecurities[securityIndex][field];
      
      if (current.includes(type)) {
        newSecurities[securityIndex][field] = current.filter(t => t !== type);
      } else {
        newSecurities[securityIndex][field] = [...current, type];
      }
      
      return { ...prev, securities: newSecurities };
    });
  };

  // Step 0 - Loan Strategy Component
  const renderStep0 = () => (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Applicant Type */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
          Applicant Type
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Natural Person', 'Company'].map(type => (
            <button
              key={type}
              onClick={() => updateFormData('applicantType', type)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--border-radius-md)',
                border: `2px solid ${formData.applicantType === type ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                background: formData.applicantType === type ? 'var(--color-background-info)' : 'transparent',
                color: formData.applicantType === type ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Broker Details */}
      <div style={{ background: 'var(--color-background-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius-lg)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '1rem', marginTop: 0 }}>Broker Details</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Broker Name
            </label>
            <input
              type="text"
              value={formData.brokerName}
              onChange={(e) => updateFormData('brokerName', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Broker Email
            </label>
            <input
              type="email"
              value={formData.brokerEmail}
              onChange={(e) => updateFormData('brokerEmail', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Client Type
            </label>
            <select
              value={formData.clientType}
              onChange={(e) => updateFormData('clientType', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Select...</option>
              <option value="New">New</option>
              <option value="Existing">Existing</option>
              <option value="Family & Friends">Family & Friends</option>
            </select>
          </div>
          
          {formData.clientType === 'New' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Lead Source
              </label>
              <select
                value={formData.leadSource}
                onChange={(e) => updateFormData('leadSource', e.target.value)}
                style={{ width: '100%' }}
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
      </div>

      {/* Number of Applicants & Guarantors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Number of Applicants
          </label>
          <select
            value={formData.numApplicants}
            onChange={(e) => updateFormData('numApplicants', parseInt(e.target.value))}
            style={{ width: '100%' }}
          >
            {[1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Number of Guarantors
          </label>
          <select
            value={formData.numGuarantors}
            onChange={(e) => updateFormData('numGuarantors', parseInt(e.target.value))}
            style={{ width: '100%' }}
          >
            {[0, 1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Security Properties */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>Security Properties</h3>
          <button onClick={addSecurity} style={{ fontSize: '14px' }}>
            + Add Security
          </button>
        </div>

        {formData.securities.map((security, index) => (
          <div key={security.id} style={{ 
            background: 'var(--color-background-primary)', 
            border: '0.5px solid var(--color-border-tertiary)', 
            borderRadius: 'var(--border-radius-lg)', 
            padding: '1.25rem', 
            marginBottom: '1rem' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>
                Security {index + 1}
              </h4>
              {formData.securities.length > 1 && (
                <button 
                  onClick={() => removeSecurity(index)}
                  style={{ fontSize: '13px', color: 'var(--color-text-danger)' }}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Property Details */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Property Address
              </label>
              <input
                type="text"
                value={security.address}
                onChange={(e) => updateSecurity(index, 'address', e.target.value)}
                placeholder="123 Main Street, Sydney NSW 2000"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Property Value ($)
                </label>
                <input
                  type="number"
                  value={security.propertyValue}
                  onChange={(e) => updateSecurity(index, 'propertyValue', e.target.value)}
                  placeholder="750000"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Loan Amount ($)
                </label>
                <input
                  type="number"
                  value={security.loanAmount}
                  onChange={(e) => updateSecurity(index, 'loanAmount', e.target.value)}
                  placeholder="600000"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  LVR (%)
                </label>
                <input
                  type="text"
                  value={security.lvr}
                  readOnly
                  placeholder="Auto-calculated"
                  style={{ width: '100%', background: 'var(--color-background-secondary)' }}
                />
              </div>
            </div>

            {/* Transaction Types */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                Primary Transaction Type
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Purchase', 'Refinance', 'Construction'].map(type => (
                  <button
                    key={type}
                    onClick={() => toggleTransactionType(index, type, true)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      borderRadius: 'var(--border-radius-md)',
                      border: `0.5px solid ${security.primaryTransactionTypes.includes(type) ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                      background: security.primaryTransactionTypes.includes(type) ? 'var(--color-background-info)' : 'transparent',
                      color: security.primaryTransactionTypes.includes(type) ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                Secondary Transaction Type
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Cashout', 'Vacant Land', 'SMSF', 'Bridging', 'Off the Plan'].map(type => (
                  <button
                    key={type}
                    onClick={() => toggleTransactionType(index, type, false)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      borderRadius: 'var(--border-radius-md)',
                      border: `0.5px solid ${security.secondaryTransactionTypes.includes(type) ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                      background: security.secondaryTransactionTypes.includes(type) ? 'var(--color-background-info)' : 'transparent',
                      color: security.secondaryTransactionTypes.includes(type) ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Occupancy & Application Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Intended Occupancy
                </label>
                <select
                  value={security.intendedOccupancy}
                  onChange={(e) => updateSecurity(index, 'intendedOccupancy', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select...</option>
                  <option value="Owner Occupied">Owner Occupied</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Application Type
                </label>
                <select
                  value={security.applicationType}
                  onChange={(e) => updateSecurity(index, 'applicationType', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select...</option>
                  <option value="Full Doc">Full Doc</option>
                  <option value="Low Doc">Low Doc</option>
                  <option value="Alt Doc">Alt Doc</option>
                </select>
              </div>
            </div>

            {/* Loan Structure */}
            <div style={{ background: 'var(--color-background-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }}>
              <h5 style={{ fontSize: '14px', fontWeight: '500', marginTop: 0, marginBottom: '1rem' }}>Loan Structure</h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Loan Term (years)
                  </label>
                  <input
                    type="number"
                    value={security.loanTerm}
                    onChange={(e) => updateSecurity(index, 'loanTerm', e.target.value)}
                    placeholder="30"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Loan Type
                  </label>
                  <select
                    value={security.loanType}
                    onChange={(e) => updateSecurity(index, 'loanType', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select...</option>
                    <option value="Principal & Interest">Principal & Interest</option>
                    <option value="Interest Only">Interest Only</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Repayment Type
                </label>
                <select
                  value={security.repaymentType}
                  onChange={(e) => updateSecurity(index, 'repaymentType', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select...</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                  <option value="Split">Split</option>
                </select>
              </div>

              {security.loanType === 'Interest Only' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Interest Only Period (years)
                  </label>
                  <select
                    value={security.interestOnlyPeriod}
                    onChange={(e) => updateSecurity(index, 'interestOnlyPeriod', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select...</option>
                    {[1, 2, 3, 4, 5].map(year => (
                      <option key={year} value={year}>{year} year{year > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Split Loan Details */}
              {security.repaymentType === 'Split' && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>Split Portions</label>
                    <button 
                      onClick={() => addLoanSplit(index)}
                      style={{ fontSize: '12px' }}
                    >
                      + Add Split
                    </button>
                  </div>
                  
                  {security.splits && security.splits.map((split, splitIndex) => (
                    <div key={split.id} style={{ 
                      background: 'var(--color-background-primary)', 
                      padding: '12px', 
                      borderRadius: 'var(--border-radius-md)',
                      marginBottom: '8px',
                      border: '0.5px solid var(--color-border-tertiary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>Split {splitIndex + 1}</span>
                        <button 
                          onClick={() => removeLoanSplit(index, splitIndex)}
                          style={{ fontSize: '11px', color: 'var(--color-text-danger)' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            Portion (%)
                          </label>
                          <input
                            type="number"
                            value={split.portion}
                            onChange={(e) => updateLoanSplit(index, splitIndex, 'portion', e.target.value)}
                            placeholder="50"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            Type
                          </label>
                          <select
                            value={split.repaymentType}
                            onChange={(e) => updateLoanSplit(index, splitIndex, 'repaymentType', e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="">Select...</option>
                            <option value="Fixed">Fixed</option>
                            <option value="Variable">Variable</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Rate Preference
                </label>
                <select
                  value={security.ratePreference}
                  onChange={(e) => updateSecurity(index, 'ratePreference', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select...</option>
                  <option value="Lowest Rate">Lowest Rate</option>
                  <option value="Competitive Rate">Competitive Rate</option>
                  <option value="Not Important">Not Important</option>
                </select>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={security.hasOffset}
                    onChange={(e) => updateSecurity(index, 'hasOffset', e.target.checked)}
                  />
                  <span style={{ fontSize: '13px' }}>Offset Account</span>
                </label>
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={security.hasRedraw}
                    onChange={(e) => updateSecurity(index, 'hasRedraw', e.target.checked)}
                  />
                  <span style={{ fontSize: '13px' }}>Redraw Facility</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lender Preference */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
          Lender Preference
        </label>
        <select
          value={formData.lenderPreference}
          onChange={(e) => updateFormData('lenderPreference', e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">No preference</option>
          <option value="ANZ">ANZ</option>
          <option value="CBA">Commonwealth Bank</option>
          <option value="NAB">NAB</option>
          <option value="Westpac">Westpac</option>
          <option value="Macquarie">Macquarie</option>
          <option value="Bankwest">Bankwest</option>
          <option value="Suncorp">Suncorp</option>
          <option value="ING">ING</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Broker Strategy Notes */}
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
          Broker Strategy Notes
        </label>
        <textarea
          value={formData.brokerNotes}
          onChange={(e) => updateFormData('brokerNotes', e.target.value)}
          placeholder="Enter any additional notes about the loan strategy, client preferences, or special circumstances..."
          style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
        />
      </div>
    </div>
  );

  // Placeholder steps
  const renderStep1 = () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Step 1 - Applicants (Coming next)</p>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Step 2 - Employment & Income (Coming next)</p>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Step 3 - Assets & Liabilities (Coming next)</p>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Step 4 - Review (Coming next)</p>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep0();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '500', margin: '0 0 8px 0' }}>
          HOF Broker Fact Find
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Complete all sections to submit to processing team
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            style={{
              flex: '1',
              minWidth: '120px',
              padding: '12px 8px',
              fontSize: '13px',
              fontWeight: currentStep === index ? '500' : '400',
              borderRadius: 'var(--border-radius-md)',
              border: `0.5px solid ${currentStep === index ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
              background: currentStep === index ? 'var(--color-background-info)' : 'transparent',
              color: currentStep === index ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {index + 1}. {step}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ 
        background: 'var(--color-background-primary)', 
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1.5rem',
        minHeight: '400px'
      }}>
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          style={{ 
            padding: '12px 24px',
            fontSize: '14px',
            opacity: currentStep === 0 ? 0.5 : 1,
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          style={{ 
            padding: '12px 24px',
            fontSize: '14px',
            opacity: currentStep === steps.length - 1 ? 0.5 : 1,
            cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default FactFindApp;
