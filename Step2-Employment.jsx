import React, { useState, useEffect } from 'react';

const Step2Employment = ({ formData, updateFormData }) => {
  const [employmentRecords, setEmploymentRecords] = useState([]);

  // Initialize employment records for all applicants
  useEffect(() => {
    if (formData.applicants && formData.applicants.length > 0) {
      const records = formData.applicants.map((applicant, index) => ({
        applicantId: applicant.id,
        applicantName: `${applicant.firstName} ${applicant.lastName}`.trim() || `${applicant.role} ${applicant.number}`,
        currentEmployment: {
          employmentType: '',
          employer: '',
          role: '',
          startDate: '',
          abn: ''
        },
        previousEmployments: [],
        totalYears: 0,
        meetsRequirement: false
      }));
      setEmploymentRecords(records);
    }
  }, [formData.applicants]);

  // Calculate employment tenure
  const calculateTenure = (startDate, endDate = null) => {
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    return diffYears;
  };

  // Calculate total employment years for an applicant
  const calculateTotalYears = (record) => {
    let total = 0;
    
    // Add current employment
    if (record.currentEmployment.startDate && 
        record.currentEmployment.employmentType !== 'Unemployed' && 
        record.currentEmployment.employmentType !== 'Retired') {
      total += calculateTenure(record.currentEmployment.startDate);
    }
    
    // Add previous employments
    record.previousEmployments.forEach(emp => {
      if (emp.startDate && emp.endDate) {
        total += calculateTenure(emp.startDate, emp.endDate);
      }
    });
    
    return total;
  };

  // Update current employment
  const updateCurrentEmployment = (applicantIndex, field, value) => {
    const updated = [...employmentRecords];
    updated[applicantIndex].currentEmployment[field] = value;
    
    // Recalculate total years
    updated[applicantIndex].totalYears = calculateTotalYears(updated[applicantIndex]);
    updated[applicantIndex].meetsRequirement = updated[applicantIndex].totalYears >= 3;
    
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  // Add previous employment
  const addPreviousEmployment = (applicantIndex) => {
    const updated = [...employmentRecords];
    updated[applicantIndex].previousEmployments.push({
      id: Date.now(),
      employmentType: '',
      employer: '',
      role: '',
      startDate: '',
      endDate: '',
      abn: ''
    });
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  // Update previous employment
  const updatePreviousEmployment = (applicantIndex, empIndex, field, value) => {
    const updated = [...employmentRecords];
    updated[applicantIndex].previousEmployments[empIndex][field] = value;
    
    // Recalculate total years
    updated[applicantIndex].totalYears = calculateTotalYears(updated[applicantIndex]);
    updated[applicantIndex].meetsRequirement = updated[applicantIndex].totalYears >= 3;
    
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  // Remove previous employment
  const removePreviousEmployment = (applicantIndex, empIndex) => {
    const updated = [...employmentRecords];
    updated[applicantIndex].previousEmployments = updated[applicantIndex].previousEmployments.filter((_, i) => i !== empIndex);
    
    // Recalculate total years
    updated[applicantIndex].totalYears = calculateTotalYears(updated[applicantIndex]);
    updated[applicantIndex].meetsRequirement = updated[applicantIndex].totalYears >= 3;
    
    setEmploymentRecords(updated);
    updateFormData('employment', updated);
  };

  // Check if employment type should show additional fields
  const shouldShowEmploymentFields = (employmentType) => {
    return employmentType !== '' && employmentType !== 'Unemployed' && employmentType !== 'Retired';
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Provide employment history for all applicants. Minimum 3 years total employment required.
        </p>
      </div>

      {employmentRecords.map((record, applicantIndex) => (
        <div 
          key={record.applicantId}
          style={{ 
            background: 'var(--color-background-primary)', 
            border: '0.5px solid var(--color-border-tertiary)', 
            borderRadius: 'var(--border-radius-lg)', 
            padding: '1.25rem', 
            marginBottom: '1.5rem' 
          }}
        >
          {/* Header with validation status */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                {record.applicantName}
              </h3>
              <div style={{ 
                padding: '6px 12px', 
                borderRadius: 'var(--border-radius-md)',
                background: record.meetsRequirement ? 'var(--color-background-success)' : 'var(--color-background-warning)',
                color: record.meetsRequirement ? 'var(--color-text-success)' : 'var(--color-text-warning)',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {record.totalYears.toFixed(1)} years {record.meetsRequirement ? '✓' : '⚠'}
              </div>
            </div>
            {!record.meetsRequirement && record.totalYears > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-warning)', margin: '4px 0 0 0' }}>
                Needs {(3 - record.totalYears).toFixed(1)} more years of employment history
              </p>
            )}
          </div>

          {/* Current Employment */}
          <div style={{ 
            background: 'var(--color-background-info)', 
            padding: '1rem', 
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border-info)'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '500', marginTop: 0, marginBottom: '1rem', color: 'var(--color-text-info)' }}>
              Current Employment
            </h4>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Employment Type
              </label>
              <select
                value={record.currentEmployment.employmentType}
                onChange={(e) => updateCurrentEmployment(applicantIndex, 'employmentType', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Select...</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Casual">Casual</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Contractor">Contractor</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            {shouldShowEmploymentFields(record.currentEmployment.employmentType) && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Employer
                    </label>
                    <input
                      type="text"
                      value={record.currentEmployment.employer}
                      onChange={(e) => updateCurrentEmployment(applicantIndex, 'employer', e.target.value)}
                      placeholder="Company name"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Role / Position
                    </label>
                    <input
                      type="text"
                      value={record.currentEmployment.role}
                      onChange={(e) => updateCurrentEmployment(applicantIndex, 'role', e.target.value)}
                      placeholder="Job title"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: record.currentEmployment.employmentType === 'Self-Employed' || record.currentEmployment.employmentType === 'Contractor' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={record.currentEmployment.startDate}
                      onChange={(e) => updateCurrentEmployment(applicantIndex, 'startDate', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  {(record.currentEmployment.employmentType === 'Self-Employed' || record.currentEmployment.employmentType === 'Contractor') && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                        ABN
                      </label>
                      <input
                        type="text"
                        value={record.currentEmployment.abn}
                        onChange={(e) => updateCurrentEmployment(applicantIndex, 'abn', e.target.value)}
                        placeholder="12 345 678 901"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>

                {record.currentEmployment.startDate && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-info)' }}>
                    Tenure: {calculateTenure(record.currentEmployment.startDate).toFixed(1)} years
                  </div>
                )}
              </>
            )}
          </div>

          {/* Previous Employments */}
          {record.previousEmployments.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '500', marginTop: 0, marginBottom: '1rem' }}>
                Previous Employment
              </h4>

              {record.previousEmployments.map((prevEmp, empIndex) => (
                <div 
                  key={prevEmp.id}
                  style={{ 
                    background: 'var(--color-background-secondary)', 
                    padding: '1rem', 
                    borderRadius: 'var(--border-radius-md)',
                    marginBottom: '1rem',
                    border: '0.5px solid var(--color-border-tertiary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Previous Employment {empIndex + 1}</span>
                    <button 
                      onClick={() => removePreviousEmployment(applicantIndex, empIndex)}
                      style={{ fontSize: '12px', color: 'var(--color-text-danger)' }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Employment Type
                    </label>
                    <select
                      value={prevEmp.employmentType}
                      onChange={(e) => updatePreviousEmployment(applicantIndex, empIndex, 'employmentType', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select...</option>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Casual">Casual</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Contractor">Contractor</option>
                    </select>
                  </div>

                  {shouldShowEmploymentFields(prevEmp.employmentType) && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                            Employer
                          </label>
                          <input
                            type="text"
                            value={prevEmp.employer}
                            onChange={(e) => updatePreviousEmployment(applicantIndex, empIndex, 'employer', e.target.value)}
                            placeholder="Company name"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                            Role / Position
                          </label>
                          <input
                            type="text"
                            value={prevEmp.role}
                            onChange={(e) => updatePreviousEmployment(applicantIndex, empIndex, 'role', e.target.value)}
                            placeholder="Job title"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: prevEmp.employmentType === 'Self-Employed' || prevEmp.employmentType === 'Contractor' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={prevEmp.startDate}
                            onChange={(e) => updatePreviousEmployment(applicantIndex, empIndex, 'startDate', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            value={prevEmp.endDate}
                            onChange={(e) => updatePreviousEmployment(applicantIndex, empIndex, 'endDate', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </div>
                        
                        {(prevEmp.employmentType === 'Self-Employed' || prevEmp.employmentType === 'Contractor') && (
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                              ABN
                            </label>
                            <input
                              type="text"
                              value={prevEmp.abn}
                              onChange={(e) => updatePreviousEmployment(applicantIndex, empIndex, 'abn', e.target.value)}
                              placeholder="12 345 678 901"
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                      </div>

                      {prevEmp.startDate && prevEmp.endDate && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          Duration: {calculateTenure(prevEmp.startDate, prevEmp.endDate).toFixed(1)} years
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Previous Employment Button */}
          {!record.meetsRequirement && (
            <div style={{ 
              background: 'var(--color-background-warning)', 
              padding: '12px', 
              borderRadius: 'var(--border-radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-warning)' }}>
                Add previous employment to meet 3-year requirement
              </span>
              <button 
                onClick={() => addPreviousEmployment(applicantIndex)}
                style={{ fontSize: '13px' }}
              >
                + Add Previous Employment
              </button>
            </div>
          )}

          {record.meetsRequirement && record.previousEmployments.length === 0 && (
            <button 
              onClick={() => addPreviousEmployment(applicantIndex)}
              style={{ fontSize: '13px', width: '100%' }}
            >
              + Add Previous Employment (Optional)
            </button>
          )}
        </div>
      ))}

      {/* Note about income calculation */}
      <div style={{ 
        background: 'var(--color-background-secondary)', 
        padding: '1rem', 
        borderRadius: 'var(--border-radius-md)',
        fontSize: '13px',
        color: 'var(--color-text-secondary)'
      }}>
        <strong>Note:</strong> Income will be calculated from uploaded payslips. Manual income entry has been removed to ensure accuracy.
      </div>
    </div>
  );
};

export default Step2Employment;
