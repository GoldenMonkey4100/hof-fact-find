import React from 'react';

const Step4Review = ({ formData, onSubmit }) => {
  // Validation checks
  const validateForm = () => {
    const errors = [];
    
    // Step 0 validation
    if (!formData.brokerName) errors.push('Broker name is required');
    if (!formData.brokerEmail) errors.push('Broker email is required');
    if (!formData.clientType) errors.push('Client type is required');
    if (formData.securities.length === 0) errors.push('At least one security property is required');
    
    // Step 1 validation
    if (!formData.applicants || formData.applicants.length === 0) {
      errors.push('Applicant information is required');
    }
    
    // Step 2 validation
    if (formData.employment && formData.employment.length > 0) {
      formData.employment.forEach((emp, index) => {
        if (!emp.meetsRequirement) {
          errors.push(`Applicant ${index + 1} needs 3 years minimum employment history`);
        }
      });
    }
    
    return errors;
  };

  const errors = validateForm();
  const isValid = errors.length === 0;

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Validation Status */}
      <div style={{ 
        marginBottom: '2rem',
        padding: '1rem',
        borderRadius: 'var(--border-radius-md)',
        background: isValid ? 'var(--color-background-success)' : 'var(--color-background-warning)',
        border: `0.5px solid ${isValid ? 'var(--color-border-success)' : 'var(--color-border-warning)'}`
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '500', 
          margin: '0 0 8px 0',
          color: isValid ? 'var(--color-text-success)' : 'var(--color-text-warning)'
        }}>
          {isValid ? '✓ Ready to Submit' : '⚠ Validation Errors'}
        </h3>
        {!isValid && (
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--color-text-warning)' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
        {isValid && (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-success)' }}>
            All required fields completed. Review the summary below and submit when ready.
          </p>
        )}
      </div>

      {/* Loan Strategy Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1rem 0' }}>Loan Strategy</h3>
        
        <div style={{ background: 'var(--color-background-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius-lg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Applicant Type</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{formData.applicantType}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Client Type</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{formData.clientType || 'Not specified'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Broker</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{formData.brokerName}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Applicants / Guarantors</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{formData.numApplicants} / {formData.numGuarantors}</div>
            </div>
          </div>

          {formData.lenderPreference && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Lender Preference</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{formData.lenderPreference}</div>
            </div>
          )}
        </div>
      </div>

      {/* Securities Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1rem 0' }}>
          Securities ({formData.securities.length})
        </h3>
        
        {formData.securities.map((security, index) => (
          <div key={security.id} style={{ 
            background: 'var(--color-background-secondary)', 
            padding: '1.25rem', 
            borderRadius: 'var(--border-radius-lg)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 1rem 0' }}>
              Security {index + 1}
            </h4>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Address</div>
              <div style={{ fontSize: '14px' }}>{security.address || 'Not specified'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Property Value</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  ${security.propertyValue ? parseFloat(security.propertyValue).toLocaleString() : '0'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Loan Amount</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  ${security.loanAmount ? parseFloat(security.loanAmount).toLocaleString() : '0'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>LVR</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{security.lvr || '0'}%</div>
              </div>
            </div>

            {(security.primaryTransactionTypes.length > 0 || security.secondaryTransactionTypes.length > 0) && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Transaction Types
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {security.primaryTransactionTypes.map(type => (
                    <span key={type} style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px', 
                      borderRadius: 'var(--border-radius-md)',
                      background: 'var(--color-background-info)',
                      color: 'var(--color-text-info)'
                    }}>
                      {type}
                    </span>
                  ))}
                  {security.secondaryTransactionTypes.map(type => (
                    <span key={type} style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px', 
                      borderRadius: 'var(--border-radius-md)',
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid var(--color-border-tertiary)'
                    }}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Occupancy</div>
                <div style={{ fontSize: '14px' }}>{security.intendedOccupancy || 'Not specified'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Application Type</div>
                <div style={{ fontSize: '14px' }}>{security.applicationType || 'Not specified'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Applicants Summary */}
      {formData.applicants && formData.applicants.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1rem 0' }}>
            Applicants ({formData.applicants.length})
          </h3>
          
          {formData.applicants.map((applicant, index) => (
            <div key={applicant.id} style={{ 
              background: 'var(--color-background-secondary)', 
              padding: '1.25rem', 
              borderRadius: 'var(--border-radius-lg)',
              marginBottom: '1rem'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 1rem 0' }}>
                {applicant.role} {applicant.number}: {applicant.firstName} {applicant.lastName}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>DOB</div>
                  <div style={{ fontSize: '14px' }}>{applicant.dob || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Email</div>
                  <div style={{ fontSize: '14px' }}>{applicant.email || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Phone</div>
                  <div style={{ fontSize: '14px' }}>{applicant.phone || 'Not provided'}</div>
                </div>
              </div>

              {applicant.numDependants > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Dependants</div>
                  <div style={{ fontSize: '14px' }}>{applicant.numDependants} dependant{applicant.numDependants > 1 ? 's' : ''}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Employment Summary */}
      {formData.employment && formData.employment.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1rem 0' }}>Employment History</h3>
          
          {formData.employment.map((emp, index) => (
            <div key={index} style={{ 
              background: 'var(--color-background-secondary)', 
              padding: '1.25rem', 
              borderRadius: 'var(--border-radius-lg)',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>
                  {emp.applicantName}
                </h4>
                <div style={{ 
                  padding: '4px 12px', 
                  borderRadius: 'var(--border-radius-md)',
                  background: emp.meetsRequirement ? 'var(--color-background-success)' : 'var(--color-background-warning)',
                  color: emp.meetsRequirement ? 'var(--color-text-success)' : 'var(--color-text-warning)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {emp.totalYears.toFixed(1)} years
                </div>
              </div>

              {emp.currentEmployment.employmentType && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Current Employment</div>
                  <div style={{ fontSize: '14px' }}>
                    {emp.currentEmployment.employmentType}
                    {emp.currentEmployment.employer && ` at ${emp.currentEmployment.employer}`}
                    {emp.currentEmployment.role && ` - ${emp.currentEmployment.role}`}
                  </div>
                </div>
              )}

              {emp.previousEmployments && emp.previousEmployments.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Previous: {emp.previousEmployments.length} position{emp.previousEmployments.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assets & Liabilities Summary */}
      {(formData.assets || formData.liabilities) && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1rem 0' }}>Financial Position</h3>
          
          <div style={{ 
            background: 'var(--color-background-secondary)', 
            padding: '1.25rem', 
            borderRadius: 'var(--border-radius-lg)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Assets</div>
                <div style={{ fontSize: '14px' }}>
                  {formData.assets?.realProperty?.length || 0} properties, 
                  {' '}{formData.assets?.savings?.length || 0} accounts,
                  {' '}{formData.assets?.vehicles?.length || 0} vehicles
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Liabilities</div>
                <div style={{ fontSize: '14px' }}>
                  {formData.liabilities?.creditCards?.length || 0} credit cards,
                  {' '}{formData.liabilities?.personalLoans?.length || 0} loans
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broker Notes */}
      {formData.brokerNotes && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 1rem 0' }}>Broker Notes</h3>
          
          <div style={{ 
            background: 'var(--color-background-secondary)', 
            padding: '1.25rem', 
            borderRadius: 'var(--border-radius-lg)',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap'
          }}>
            {formData.brokerNotes}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div style={{ 
        borderTop: '0.5px solid var(--color-border-tertiary)', 
        paddingTop: '2rem',
        marginTop: '2rem'
      }}>
        <button
          onClick={onSubmit}
          disabled={!isValid}
          style={{ 
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '500',
            background: isValid ? 'var(--color-background-info)' : 'var(--color-background-secondary)',
            color: isValid ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
            border: `0.5px solid ${isValid ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
            borderRadius: 'var(--border-radius-lg)',
            cursor: isValid ? 'pointer' : 'not-allowed',
            opacity: isValid ? 1 : 0.6
          }}
        >
          {isValid ? 'Submit to Processing Team →' : 'Complete Required Fields to Submit'}
        </button>

        {isValid && (
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--color-text-secondary)', 
            textAlign: 'center',
            margin: '12px 0 0 0'
          }}>
            This will send the fact find to Mercury Nexus and your Notion pipeline
          </p>
        )}
      </div>
    </div>
  );
};

export default Step4Review;
