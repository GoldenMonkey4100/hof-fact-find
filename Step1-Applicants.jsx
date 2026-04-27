import React, { useState } from 'react';

const Step1Applicants = ({ formData, updateFormData }) => {
  const [applicants, setApplicants] = useState([]);

  // Initialize applicants based on numApplicants and applicantType
  React.useEffect(() => {
    const totalCount = formData.numApplicants + formData.numGuarantors;
    const newApplicants = [];

    // Create applicant objects
    for (let i = 0; i < totalCount; i++) {
      const isApplicant = i < formData.numApplicants;
      const applicantNumber = isApplicant ? i + 1 : i - formData.numApplicants + 1;
      
      if (formData.applicantType === 'Natural Person' && isApplicant) {
        newApplicants.push({
          id: i + 1,
          type: 'Natural Person',
          role: 'Applicant',
          number: applicantNumber,
          firstName: '',
          lastName: '',
          dob: '',
          phone: '',
          email: '',
          address: '',
          gender: '',
          maritalStatus: '',
          residencyStatus: '',
          visaNumber: '',
          relationshipToApplicant1: i === 0 ? 'Primary' : '',
          numDependants: 0,
          dependants: [],
          documents: {
            driverLicence: null,
            payslips: null,
            other: null
          }
        });
      } else if (formData.applicantType === 'Company' || !isApplicant) {
        // Company applicants or guarantors
        newApplicants.push({
          id: i + 1,
          type: 'Company Guarantor',
          role: isApplicant ? 'Applicant' : 'Guarantor',
          number: applicantNumber,
          firstName: '',
          lastName: '',
          dob: '',
          phone: '',
          email: '',
          relationshipToCompany: '',
          documents: {
            driverLicence: null,
            payslips: null,
            other: null
          }
        });
      }
    }

    setApplicants(newApplicants);
  }, [formData.numApplicants, formData.numGuarantors, formData.applicantType]);

  const updateApplicant = (index, field, value) => {
    const updated = [...applicants];
    updated[index] = { ...updated[index], [field]: value };
    
    // Handle dependants number change
    if (field === 'numDependants') {
      const numDeps = parseInt(value) || 0;
      const currentDeps = updated[index].dependants || [];
      
      if (numDeps > currentDeps.length) {
        // Add new dependants
        const newDeps = [...currentDeps];
        for (let i = currentDeps.length; i < numDeps; i++) {
          newDeps.push({ name: '', age: '' });
        }
        updated[index].dependants = newDeps;
      } else if (numDeps < currentDeps.length) {
        // Remove excess dependants
        updated[index].dependants = currentDeps.slice(0, numDeps);
      }
    }
    
    setApplicants(updated);
    updateFormData('applicants', updated);
  };

  const updateDependant = (applicantIndex, dependantIndex, field, value) => {
    const updated = [...applicants];
    updated[applicantIndex].dependants[dependantIndex][field] = value;
    setApplicants(updated);
    updateFormData('applicants', updated);
  };

  const handleFileUpload = (applicantIndex, docType, files) => {
    const updated = [...applicants];
    updated[applicantIndex].documents[docType] = files[0];
    setApplicants(updated);
    updateFormData('applicants', updated);
  };

  // Check if dependants should be shared (Applicant 2 is spouse of Applicant 1)
  const shouldShareDependants = (index) => {
    if (index !== 1) return false;
    const applicant2 = applicants[1];
    return applicant2?.relationshipToApplicant1 === 'Spouse';
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Complete details for {formData.numApplicants} applicant{formData.numApplicants > 1 ? 's' : ''} 
          {formData.numGuarantors > 0 && ` and ${formData.numGuarantors} guarantor${formData.numGuarantors > 1 ? 's' : ''}`}
        </p>
      </div>

      {applicants.map((applicant, index) => (
        <div 
          key={applicant.id} 
          style={{ 
            background: 'var(--color-background-primary)', 
            border: '0.5px solid var(--color-border-tertiary)', 
            borderRadius: 'var(--border-radius-lg)', 
            padding: '1.25rem', 
            marginBottom: '1.5rem' 
          }}
        >
          {/* Card Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 4px 0' }}>
              {applicant.role} {applicant.number}
              {applicant.type === 'Company Guarantor' && ' (Company Guarantor)'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {applicant.type === 'Natural Person' ? 'Natural person details' : 'Guarantor details'}
            </p>
          </div>

          {/* Natural Person Fields */}
          {applicant.type === 'Natural Person' && (
            <>
              {/* Personal Details */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '500', marginTop: 0, marginBottom: '1rem' }}>
                  Personal Details
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={applicant.firstName}
                      onChange={(e) => updateApplicant(index, 'firstName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={applicant.lastName}
                      onChange={(e) => updateApplicant(index, 'lastName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={applicant.dob}
                      onChange={(e) => updateApplicant(index, 'dob', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={applicant.phone}
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      placeholder="0400 000 000"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Gender
                    </label>
                    <select
                      value={applicant.gender}
                      onChange={(e) => updateApplicant(index, 'gender', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={applicant.email}
                    onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={applicant.address}
                    onChange={(e) => updateApplicant(index, 'address', e.target.value)}
                    placeholder="123 Main Street, Sydney NSW 2000"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Marital & Residency Status */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Marital Status
                    </label>
                    <select
                      value={applicant.maritalStatus}
                      onChange={(e) => updateApplicant(index, 'maritalStatus', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select...</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="De Facto">De Facto</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Residency Status
                    </label>
                    <select
                      value={applicant.residencyStatus}
                      onChange={(e) => updateApplicant(index, 'residencyStatus', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select...</option>
                      <option value="Australian Citizen">Australian Citizen</option>
                      <option value="Permanent Resident">Permanent Resident</option>
                      <option value="Temporary Resident">Temporary Resident</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Visa Number */}
                {applicant.residencyStatus === 'Temporary Resident' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Visa Number
                    </label>
                    <input
                      type="text"
                      value={applicant.visaNumber}
                      onChange={(e) => updateApplicant(index, 'visaNumber', e.target.value)}
                      placeholder="Enter visa number"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* Relationship to Applicant 1 (for co-applicants) */}
              {index > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Relationship to Applicant 1
                  </label>
                  <select
                    value={applicant.relationshipToApplicant1}
                    onChange={(e) => updateApplicant(index, 'relationshipToApplicant1', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select...</option>
                    <option value="Spouse">Spouse</option>
                    <option value="De Facto Partner">De Facto Partner</option>
                    <option value="Brother/Sister">Brother/Sister</option>
                    <option value="Business Partner">Business Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Dependants Section */}
              {(!shouldShareDependants(index) || index === 0) && (
                <div style={{ 
                  background: 'var(--color-background-secondary)', 
                  padding: '1rem', 
                  borderRadius: 'var(--border-radius-md)',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '500', marginTop: 0, marginBottom: '1rem' }}>
                    Dependants
                    {shouldShareDependants(1) && index === 0 && (
                      <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                        (Shared with Applicant 2)
                      </span>
                    )}
                  </h4>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Number of Dependants
                    </label>
                    <select
                      value={applicant.numDependants}
                      onChange={(e) => updateApplicant(index, 'numDependants', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {[0, 1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  {applicant.dependants && applicant.dependants.map((dep, depIndex) => (
                    <div 
                      key={depIndex}
                      style={{ 
                        background: 'var(--color-background-primary)',
                        padding: '12px',
                        borderRadius: 'var(--border-radius-md)',
                        marginBottom: '8px',
                        border: '0.5px solid var(--color-border-tertiary)'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
                        Dependant {depIndex + 1}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            Name
                          </label>
                          <input
                            type="text"
                            value={dep.name}
                            onChange={(e) => updateDependant(index, depIndex, 'name', e.target.value)}
                            placeholder="Full name"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            Age
                          </label>
                          <input
                            type="number"
                            value={dep.age}
                            onChange={(e) => updateDependant(index, depIndex, 'age', e.target.value)}
                            placeholder="Age"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show message for shared dependants */}
              {shouldShareDependants(index) && index === 1 && (
                <div style={{ 
                  background: 'var(--color-background-info)', 
                  color: 'var(--color-text-info)',
                  padding: '12px', 
                  borderRadius: 'var(--border-radius-md)',
                  marginBottom: '1.5rem',
                  fontSize: '13px'
                }}>
                  ℹ️ Dependants are shared with Applicant 1 (spouse). Edit dependants in Applicant 1's card.
                </div>
              )}
            </>
          )}

          {/* Company Guarantor Fields */}
          {applicant.type === 'Company Guarantor' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={applicant.firstName}
                      onChange={(e) => updateApplicant(index, 'firstName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={applicant.lastName}
                      onChange={(e) => updateApplicant(index, 'lastName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={applicant.dob}
                      onChange={(e) => updateApplicant(index, 'dob', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={applicant.phone}
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      placeholder="0400 000 000"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={applicant.email}
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      placeholder="email@example.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Relationship to Company
                  </label>
                  <select
                    value={applicant.relationshipToCompany}
                    onChange={(e) => updateApplicant(index, 'relationshipToCompany', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select...</option>
                    <option value="Director">Director</option>
                    <option value="Shareholder">Shareholder</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Document Upload Section */}
          <div style={{ 
            borderTop: '0.5px solid var(--color-border-tertiary)', 
            paddingTop: '1.5rem',
            marginTop: '1.5rem'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '500', marginTop: 0, marginBottom: '1rem' }}>
              Document Upload
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Driver Licence
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(index, 'driverLicence', e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ width: '100%', fontSize: '12px' }}
                />
                {applicant.documents.driverLicence && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-success)', marginTop: '4px' }}>
                    ✓ {applicant.documents.driverLicence.name}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Payslips
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(index, 'payslips', e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ width: '100%', fontSize: '12px' }}
                />
                {applicant.documents.payslips && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-success)', marginTop: '4px' }}>
                    ✓ {applicant.documents.payslips.name}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Other Documents
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(index, 'other', e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ width: '100%', fontSize: '12px' }}
                />
                {applicant.documents.other && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-success)', marginTop: '4px' }}>
                    ✓ {applicant.documents.other.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Step1Applicants;
