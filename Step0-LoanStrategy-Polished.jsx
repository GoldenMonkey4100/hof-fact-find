import React from 'react';
import './styles.css';

const Step0LoanStrategy = ({ formData, updateFormData }) => {
  
  const updateSecurity = (index, field, value) => {
    const securities = [...formData.securities];
    securities[index] = { ...securities[index], [field]: value };
    
    // Auto-calculate LVR
    if (field === 'propertyValue' || field === 'loanAmount') {
      const propValue = field === 'propertyValue' ? parseFloat(value) : parseFloat(securities[index].propertyValue);
      const loanAmt = field === 'loanAmount' ? parseFloat(value) : parseFloat(securities[index].loanAmount);
      if (propValue && loanAmt) {
        securities[index].lvr = ((loanAmt / propValue) * 100).toFixed(2);
      }
    }
    
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
      interestOnlyPeriod: '',
      splits: [],
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

  const addLoanSplit = (securityIndex) => {
    const securities = [...formData.securities];
    const splits = securities[securityIndex].splits || [];
    splits.push({
      id: splits.length + 1,
      portion: '',
      repaymentType: ''
    });
    securities[securityIndex].splits = splits;
    updateFormData('securities', securities);
  };

  const removeLoanSplit = (securityIndex, splitIndex) => {
    const securities = [...formData.securities];
    securities[securityIndex].splits = securities[securityIndex].splits.filter((_, i) => i !== splitIndex);
    updateFormData('securities', securities);
  };

  const updateLoanSplit = (securityIndex, splitIndex, field, value) => {
    const securities = [...formData.securities];
    securities[securityIndex].splits[splitIndex][field] = value;
    updateFormData('securities', securities);
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
          <div>
            <label>Broker Name</label>
            <input
              type="text"
              value={formData.brokerName}
              onChange={(e) => updateFormData('brokerName', e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label>Broker Email</label>
            <input
              type="email"
              value={formData.brokerEmail}
              onChange={(e) => updateFormData('brokerEmail', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2">
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
                <button 
                  onClick={() => removeSecurity(index)}
                  className="btn-danger"
                >
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

            <div className="grid grid-cols-3 mb-4">
              <div>
                <label>Property Value ($)</label>
                <input
                  type="number"
                  value={security.propertyValue}
                  onChange={(e) => updateSecurity(index, 'propertyValue', e.target.value)}
                  placeholder="750000"
                />
              </div>
              <div>
                <label>Loan Amount ($)</label>
                <input
                  type="number"
                  value={security.loanAmount}
                  onChange={(e) => updateSecurity(index, 'loanAmount', e.target.value)}
                  placeholder="600000"
                />
              </div>
              <div>
                <label>LVR (%)</label>
                <input
                  type="text"
                  value={security.lvr}
                  readOnly
                  placeholder="Auto-calculated"
                  style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                />
                {security.lvr && (
                  <div className="hint-text">
                    {parseFloat(security.lvr) > 80 ? '⚠️ High LVR - May require LMI' : '✓ Standard LVR'}
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

            {/* Loan Structure Card */}
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
              </div>

              <div className="mb-4">
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

              {security.loanType === 'Interest Only' && (
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

              {/* Split Loan Details */}
              {security.repaymentType === 'Split' && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ margin: 0, fontWeight: '500' }}>Split Portions</label>
                    <button 
                      onClick={() => addLoanSplit(index)}
                      className="btn-secondary"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      + Add Split
                    </button>
                  </div>
                  
                  {security.splits && security.splits.map((split, splitIndex) => (
                    <div key={split.id} style={{ 
                      background: 'var(--bg-primary)', 
                      padding: '12px', 
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '8px',
                      border: '1px solid var(--border-primary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Split {splitIndex + 1}</span>
                        <button 
                          onClick={() => removeLoanSplit(index, splitIndex)}
                          className="btn-danger"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2">
                        <div>
                          <label>Portion (%)</label>
                          <input
                            type="number"
                            value={split.portion}
                            onChange={(e) => updateLoanSplit(index, splitIndex, 'portion', e.target.value)}
                            placeholder="50"
                          />
                        </div>
                        <div>
                          <label>Type</label>
                          <select
                            value={split.repaymentType}
                            onChange={(e) => updateLoanSplit(index, splitIndex, 'repaymentType', e.target.value)}
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

      {/* Lender Preference */}
      <div className="mb-8">
        <label>Lender Preference</label>
        <select
          value={formData.lenderPreference}
          onChange={(e) => updateFormData('lenderPreference', e.target.value)}
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
