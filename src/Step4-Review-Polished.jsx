import React from 'react';
import './styles.css';

const Step4Review = ({ formData, onSubmit, submission = {} }) => {
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
          errors.push(`${emp.applicantName || `Applicant ${index + 1}`} needs 3 years minimum employment history`);
        }
      });
    }
    
    return errors;
  };

  const errors = validateForm();
  const isValid = errors.length === 0;

  return (
    <div className="fade-in">
      
      {/* Validation Status */}
      <div className="mb-8" style={{ 
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        background: isValid ? 'var(--color-success-light)' : 'var(--color-warning-light)',
        border: `2px solid ${isValid ? 'var(--color-success)' : 'var(--color-warning)'}`
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          margin: '0 0 12px 0',
          color: isValid ? 'var(--color-success-dark)' : 'var(--color-warning-dark)'
        }}>
          {isValid ? '✓ Ready to Submit' : '⚠️ Validation Errors'}
        </h3>
        {!isValid && (
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--color-warning-dark)', lineHeight: '1.8' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
        {isValid && (
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-success-dark)' }}>
            All required fields completed. Review the summary below and submit when ready.
          </p>
        )}
      </div>

      {/* Loan Strategy Summary */}
      <div className="card mb-6">
        <h3 className="card-title">Loan Strategy</h3>
        
        <div className="grid grid-cols-2 mb-4">
          <div>
            <label style={{ marginBottom: '4px' }}>Applicant Type</label>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{formData.applicantType}</div>
          </div>
          <div>
            <label style={{ marginBottom: '4px' }}>Client Type</label>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{formData.clientType || 'Not specified'}</div>
          </div>
          <div>
            <label style={{ marginBottom: '4px' }}>Broker</label>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{formData.brokerName}</div>
          </div>
          <div>
            <label style={{ marginBottom: '4px' }}>Applicants / Guarantors</label>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{formData.numApplicants} / {formData.numGuarantors}</div>
          </div>
        </div>

        {formData.lenderPreference?.length > 0 && (
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <label style={{ marginBottom: '4px' }}>Lender Preference</label>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{formData.lenderPreference.join(', ')}</div>
          </div>
        )}
        {formData.priority && (
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <label style={{ marginBottom: '4px' }}>Priority</label>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{formData.priority}</div>
          </div>
        )}
      </div>

      {/* Securities Summary */}
      <div className="card mb-6">
        <h3 className="card-title">Securities ({formData.securities.length})</h3>
        
        {formData.securities.map((security, index) => (
          <div 
            key={security.id}
            style={{ 
              background: 'var(--bg-secondary)', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)',
              marginBottom: index < formData.securities.length - 1 ? '12px' : 0
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Security {index + 1}</h4>
              {security.lvr && (
                <span className={parseFloat(security.lvr) > 80 ? 'badge badge-warning' : 'badge badge-success'}>
                  LVR: {security.lvr}%
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '12px 24px' }}>
              <div>
                <label style={{ marginBottom: '4px' }}>Address</label>
                <div style={{ fontSize: '14px' }}>{security.address || 'Not specified'}</div>
              </div>
              <div>
                <label style={{ marginBottom: '4px' }}>Property Value</label>
                <div style={{ fontSize: '14px' }}>${parseFloat(security.propertyValue || 0).toLocaleString()}</div>
              </div>
              <div>
                <label style={{ marginBottom: '4px' }}>Loan Amount</label>
                <div style={{ fontSize: '14px' }}>${parseFloat(security.loanAmount || 0).toLocaleString()}</div>
              </div>
              <div>
                <label style={{ marginBottom: '4px' }}>Transaction Types</label>
                <div style={{ fontSize: '14px' }}>
                  {[...security.primaryTransactionTypes, ...security.secondaryTransactionTypes].join(', ') || 'Not specified'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Applicants Summary */}
      {formData.applicants && formData.applicants.length > 0 && (
        <div className="card mb-6">
          <h3 className="card-title">Applicants ({formData.applicants.length})</h3>
          
          {formData.applicants.map((applicant, index) => (
            <div 
              key={applicant.id}
              style={{ 
                background: 'var(--bg-secondary)', 
                padding: '16px', 
                borderRadius: 'var(--radius-md)',
                marginBottom: index < formData.applicants.length - 1 ? '12px' : 0
              }}
            >
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', marginTop: 0 }}>
                {applicant.role} {applicant.number}: {applicant.firstName} {applicant.lastName}
              </h4>
              
              <div className="grid grid-cols-3" style={{ gap: '12px' }}>
                <div>
                  <label style={{ marginBottom: '4px' }}>Email</label>
                  <div style={{ fontSize: '14px' }}>{applicant.email || 'Not provided'}</div>
                </div>
                <div>
                  <label style={{ marginBottom: '4px' }}>Phone</label>
                  <div style={{ fontSize: '14px' }}>{applicant.phone || 'Not provided'}</div>
                </div>
                <div>
                  <label style={{ marginBottom: '4px' }}>Date of Birth</label>
                  <div style={{ fontSize: '14px' }}>{applicant.dob || 'Not provided'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employment Summary */}
      {formData.employment && formData.employment.length > 0 && (
        <div className="card mb-6">
          <h3 className="card-title">Employment History</h3>
          
          {formData.employment.map((emp, index) => (
            <div 
              key={index}
              style={{ 
                background: 'var(--bg-secondary)', 
                padding: '16px', 
                borderRadius: 'var(--radius-md)',
                marginBottom: index < formData.employment.length - 1 ? '12px' : 0
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>
                  {emp.applicantName}
                </h4>
                {emp.meetsRequirement ? (
                  <span className="badge badge-success">✓ {emp.totalYears.toFixed(1)} years</span>
                ) : (
                  <span className="badge badge-warning">⚠️ {emp.totalYears.toFixed(1)} / 3 years</span>
                )}
              </div>
              
              {emp.currentEmployment && emp.currentEmployment.employer && (
                <div>
                  <label style={{ marginBottom: '4px' }}>Current Employer</label>
                  <div style={{ fontSize: '14px' }}>
                    {emp.currentEmployment.employer} - {emp.currentEmployment.role}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Broker Notes */}
      {formData.brokerNotes && (
        <div className="card mb-6">
          <h3 className="card-title">Broker Strategy Notes</h3>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {formData.brokerNotes}
          </p>
        </div>
      )}

      {/* Submit Section */}
      <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 12px 0' }}>
          Ready to Submit?
        </h3>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Once submitted, this fact find will be sent to your processing team for review.
        </p>
        
        <button
          onClick={onSubmit}
          disabled={!isValid || submission.status === 'checking' || submission.status === 'submitting'}
          className="btn-success"
          style={{
            fontSize: '16px',
            padding: '14px 40px',
            minWidth: '220px',
            opacity: (submission.status === 'checking' || submission.status === 'submitting') ? 0.7 : 1,
          }}
        >
          {submission.status === 'checking'   ? 'Checking for duplicates…' :
           submission.status === 'submitting' ? 'Submitting to Notion…'    :
           isValid                            ? 'Submit to Processing →'   :
           <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
             Complete Required Fields
           </span>}
        </button>

        {!isValid && (
          <p style={{ margin: '16px 0 0 0', fontSize: '13px', color: 'var(--color-warning-dark)' }}>
            Please complete all required fields before submitting
          </p>
        )}
      </div>
    </div>
  );
};

export default Step4Review;
