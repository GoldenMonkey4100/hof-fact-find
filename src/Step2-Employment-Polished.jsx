import React, { useState, useEffect } from 'react';
import './styles.css';

const Step2Employment = ({ formData, updateFormData }) => {
  const [employmentRecords, setEmploymentRecords] = useState([]);

  // Initialize employment records for all applicants
  useEffect(() => {
    if (formData.applicants && formData.applicants.length > 0) {
      const records = formData.applicants.map((applicant) => ({
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

  return (
    <div className="fade-in">
      <div className="mb-6">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
          Provide employment history for all applicants. Minimum 3 years total employment required.
        </p>
        <div style={{ 
          padding: '12px 16px', 
          background: 'var(--color-warning-light)', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-warning)'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-warning-dark)' }}>
            ⚠️ <strong>Important:</strong> If current employment is less than 3 years, add previous employment to meet the requirement.
          </p>
        </div>
      </div>

      {employmentRecords.map((record, index) => (
        <div key={record.applicantId} className="card mb-6">
          
          {/* Card Header */}
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                {record.applicantName}
              </h3>
              <p className="card-subtitle">
                Employment & Income History
              </p>
            </div>
            <div>
              {record.meetsRequirement ? (
                <span className="badge badge-success">
                  ✓ {record.totalYears.toFixed(1)} years
                </span>
              ) : (
                <span className="badge badge-warning">
                  ⚠️ {record.totalYears.toFixed(1)} / 3 years
                </span>
              )}
            </div>
          </div>

          {/* Current Employment */}
          <div className="mb-6">
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
              Current Employment
            </h4>

            <div className="mb-4">
              <label>Employment Type</label>
              <select
                value={record.currentEmployment.employmentType}
                onChange={(e) => updateCurrentEmployment(index, 'employmentType', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Casual">Casual</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Contract">Contract</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            {/* Change 11: Entity Type for Self-Employed */}
            {record.currentEmployment.employmentType === 'Self-Employed' && (
              <div className="mb-4">
                <label>Entity Type</label>
                <select
                  value={record.currentEmployment.entityType || ''}
                  onChange={(e) => updateCurrentEmployment(index, 'entityType', e.target.value)}
                  required
                >
                  <option value="">Select Entity Type...</option>
                  <option value="Sole Trader">Sole Trader</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Company">Company</option>
                  <option value="Trust">Trust</option>
                </select>
              </div>
            )}

            {/* Change 12: Centrelink checkbox for Unemployed */}
            {record.currentEmployment.employmentType === 'Unemployed' && (
              <div className="mb-4" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={record.currentEmployment.receivingCentrelink || false}
                    onChange={(e) => updateCurrentEmployment(index, 'receivingCentrelink', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
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
                    <input
                      type="text"
                      value={record.currentEmployment.employer}
                      onChange={(e) => updateCurrentEmployment(index, 'employer', e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label>Job Title / Role</label>
                    <input
                      type="text"
                      value={record.currentEmployment.role}
                      onChange={(e) => updateCurrentEmployment(index, 'role', e.target.value)}
                      placeholder="e.g., Senior Developer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <div>
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={record.currentEmployment.startDate}
                      onChange={(e) => updateCurrentEmployment(index, 'startDate', e.target.value)}
                    />
                    {record.currentEmployment.startDate && (
                      <div className="hint-text">
                        {calculateTenure(record.currentEmployment.startDate).toFixed(1)} years
                      </div>
                    )}
                  </div>
                  {record.currentEmployment.employmentType === 'Self-Employed' && (
                    <div>
                      <label>ABN (if applicable)</label>
                      <input
                        type="text"
                        value={record.currentEmployment.abn}
                        onChange={(e) => updateCurrentEmployment(index, 'abn', e.target.value)}
                        placeholder="12 345 678 901"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Previous Employment */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>
                Previous Employment
              </h4>
              <button 
                onClick={() => addPreviousEmployment(index)}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                + Add Previous Employment
              </button>
            </div>

            {record.previousEmployments.length === 0 && (
              <div style={{ 
                padding: '32px', 
                textAlign: 'center', 
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--border-primary)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                  No previous employment added.
                  {!record.meetsRequirement && ' Add employment history to meet 3-year requirement.'}
                </p>
              </div>
            )}

            {record.previousEmployments.map((prevEmp, empIndex) => (
              <div 
                key={prevEmp.id}
                style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '12px',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    Previous Employment {empIndex + 1}
                  </span>
                  <button
                    onClick={() => removePreviousEmployment(index, empIndex)}
                    className="btn-danger"
                    style={{ fontSize: '12px', padding: '4px 12px' }}
                  >
                    Remove
                  </button>
                </div>

                <div className="mb-4">
                  <label>Employment Type</label>
                  <select
                    value={prevEmp.employmentType}
                    onChange={(e) => updatePreviousEmployment(index, empIndex, 'employmentType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Casual">Casual</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Employer Name</label>
                    <input
                      type="text"
                      value={prevEmp.employer}
                      onChange={(e) => updatePreviousEmployment(index, empIndex, 'employer', e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label>Job Title / Role</label>
                    <input
                      type="text"
                      value={prevEmp.role}
                      onChange={(e) => updatePreviousEmployment(index, empIndex, 'role', e.target.value)}
                      placeholder="e.g., Developer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3">
                  <div>
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={prevEmp.startDate}
                      onChange={(e) => updatePreviousEmployment(index, empIndex, 'startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>End Date</label>
                    <input
                      type="date"
                      value={prevEmp.endDate}
                      onChange={(e) => updatePreviousEmployment(index, empIndex, 'endDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Duration</label>
                    <input
                      type="text"
                      value={prevEmp.startDate && prevEmp.endDate ? 
                        `${calculateTenure(prevEmp.startDate, prevEmp.endDate).toFixed(1)} years` : 
                        'Calculating...'}
                      readOnly
                      style={{ background: 'var(--bg-primary)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {prevEmp.employmentType === 'Self-Employed' && (
                  <div className="mt-4">
                    <label>ABN (if applicable)</label>
                    <input
                      type="text"
                      value={prevEmp.abn}
                      onChange={(e) => updatePreviousEmployment(index, empIndex, 'abn', e.target.value)}
                      placeholder="12 345 678 901"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Employment Summary */}
          {(record.currentEmployment.employmentType || record.previousEmployments.length > 0) && (
            <div className="mt-6" style={{ 
              padding: '16px', 
              background: record.meetsRequirement ? 'var(--color-success-light)' : 'var(--color-warning-light)', 
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${record.meetsRequirement ? 'var(--color-success)' : 'var(--color-warning)'}` 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '500', color: record.meetsRequirement ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
                    Total Employment History
                  </p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: record.meetsRequirement ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
                    {record.totalYears.toFixed(1)} years
                  </p>
                </div>
                <div>
                  {record.meetsRequirement ? (
                    <span className="badge badge-success" style={{ fontSize: '13px', padding: '8px 16px' }}>
                      ✓ Meets Requirement
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '13px', padding: '8px 16px' }}>
                      ⚠️ {(3 - record.totalYears).toFixed(1)} years needed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {employmentRecords.length === 0 && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-primary)'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            No applicants available. Please complete Step 1 (Applicants) first.
          </p>
        </div>
      )}
    </div>
  );
};

export default Step2Employment;
