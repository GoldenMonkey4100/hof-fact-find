import React, { useState } from 'react';
import './styles.css';

const Step1Applicants = ({ formData, updateFormData }) => {
  const [applicants, setApplicants] = useState([]);

  React.useEffect(() => {
    const totalCount = formData.numApplicants + formData.numGuarantors;
    const newApplicants = [];

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
          yearsAtCurrentAddress: '',
          monthsAtCurrentAddress: '',
          addressHistory: [],
          gender: '',
          maritalStatus: '',
          residencyStatus: '',
          visaNumber: '',
          relationshipToApplicant1: i === 0 ? 'Primary' : '',
          numDependants: 0,
          dependants: [],
          uploadedDocuments: [],
          assets: [],
          liabilities: []
        });
      } else {
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
          companyName: '',
          companyABN: '',
          companyACN: '',
          relationshipToCompany: '',
          uploadedDocuments: [],
          assets: [],
          liabilities: []
        });
      }
    }

    setApplicants(newApplicants);
  }, [formData.numApplicants, formData.numGuarantors, formData.applicantType]);

  const updateApplicant = (index, field, value) => {
    const updated = [...applicants];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'numDependants') {
      const numDeps = parseInt(value) || 0;
      const currentDeps = updated[index].dependants || [];
      if (numDeps > currentDeps.length) {
        const newDeps = [...currentDeps];
        for (let i = currentDeps.length; i < numDeps; i++) {
          newDeps.push({ name: '', age: '' });
        }
        updated[index].dependants = newDeps;
      } else {
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

  const shouldShareDependants = (index) => {
    if (index !== 1) return false;
    const applicant2 = applicants[1];
    return applicant2?.relationshipToApplicant1 === 'Spouse';
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Complete details for {formData.numApplicants} applicant{formData.numApplicants > 1 ? 's' : ''}
          {formData.numGuarantors > 0 && ` and ${formData.numGuarantors} guarantor${formData.numGuarantors > 1 ? 's' : ''}`}
        </p>
      </div>

      {applicants.map((applicant, index) => (
        <div key={applicant.id} className="card mb-6">

          {/* Card Header - Change 7: removed Company Guarantor blue bubble */}
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                {applicant.role} {applicant.number}
              </h3>
              <p className="card-subtitle">
                {applicant.type === 'Natural Person' ? 'Natural person details' : 'Guarantor details'}
              </p>
            </div>
          </div>

          {/* Natural Person Fields */}
          {applicant.type === 'Natural Person' && (
            <>
              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                  Personal Details
                </h4>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>First Name</label>
                    <input
                      type="text"
                      value={applicant.firstName}
                      onChange={(e) => updateApplicant(index, 'firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={applicant.lastName}
                      onChange={(e) => updateApplicant(index, 'lastName', e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={applicant.dob}
                      onChange={(e) => updateApplicant(index, 'dob', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={applicant.phone}
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      placeholder="0400 000 000"
                    />
                  </div>
                  <div>
                    <label>Gender</label>
                    <select
                      value={applicant.gender}
                      onChange={(e) => updateApplicant(index, 'gender', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label>Email</label>
                  <input
                    type="email"
                    value={applicant.email}
                    onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                    placeholder="john.smith@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Marital Status</label>
                    <select
                      value={applicant.maritalStatus}
                      onChange={(e) => updateApplicant(index, 'maritalStatus', e.target.value)}
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
                    <label>Residency Status</label>
                    <select
                      value={applicant.residencyStatus}
                      onChange={(e) => updateApplicant(index, 'residencyStatus', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="Australian Citizen">Australian Citizen</option>
                      <option value="Permanent Resident">Permanent Resident</option>
                      <option value="Temporary Visa">Temporary Visa</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {applicant.residencyStatus === 'Temporary Visa' && (
                  <div className="mb-4">
                    <label>Visa Number</label>
                    <input
                      type="text"
                      value={applicant.visaNumber}
                      onChange={(e) => updateApplicant(index, 'visaNumber', e.target.value)}
                      placeholder="Enter visa number"
                    />
                  </div>
                )}

                {/* Change 10: 3-Year Residential Address History */}
                <div className="mb-4" style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                      3-Year Residential Address History
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const currentAddresses = applicant.addressHistory || [];
                        updateApplicant(index, 'addressHistory', [
                          ...currentAddresses,
                          { id: Date.now(), address: '', yearsAtAddress: '', monthsAtAddress: '' }
                        ]);
                      }}
                      className="btn-secondary"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      + Add Previous Address
                    </button>
                  </div>

                  <div className="mb-3" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-primary)' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>Current Address</label>
                    <input
                      type="text"
                      value={applicant.address || ''}
                      onChange={(e) => updateApplicant(index, 'address', e.target.value)}
                      placeholder="Current residential address"
                      style={{ fontSize: '13px' }}
                    />
                    <div className="grid grid-cols-2" style={{ marginTop: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px' }}>Years</label>
                        <input
                          type="number"
                          value={applicant.yearsAtCurrentAddress || ''}
                          onChange={(e) => updateApplicant(index, 'yearsAtCurrentAddress', e.target.value)}
                          placeholder="0"
                          min="0"
                          style={{ fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px' }}>Months</label>
                        <input
                          type="number"
                          value={applicant.monthsAtCurrentAddress || ''}
                          onChange={(e) => updateApplicant(index, 'monthsAtCurrentAddress', e.target.value)}
                          placeholder="0"
                          min="0"
                          max="11"
                          style={{ fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {(applicant.addressHistory || []).map((addr, addrIndex) => (
                    <div key={addr.id} className="mb-3" style={{ paddingTop: '12px' }}>
                      <div className="flex justify-between items-center mb-2">
                        <label style={{ fontSize: '13px', fontWeight: '500' }}>Previous Address {addrIndex + 1}</label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = applicant.addressHistory.filter((_, i) => i !== addrIndex);
                            updateApplicant(index, 'addressHistory', updated);
                          }}
                          className="btn-danger"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={addr.address}
                        onChange={(e) => {
                          const updated = [...applicant.addressHistory];
                          updated[addrIndex] = { ...updated[addrIndex], address: e.target.value };
                          updateApplicant(index, 'addressHistory', updated);
                        }}
                        placeholder="Previous residential address"
                        style={{ fontSize: '13px' }}
                      />
                      <div className="grid grid-cols-2" style={{ marginTop: '8px' }}>
                        <div>
                          <label style={{ fontSize: '12px' }}>Years</label>
                          <input
                            type="number"
                            value={addr.yearsAtAddress}
                            onChange={(e) => {
                              const updated = [...applicant.addressHistory];
                              updated[addrIndex] = { ...updated[addrIndex], yearsAtAddress: e.target.value };
                              updateApplicant(index, 'addressHistory', updated);
                            }}
                            placeholder="0"
                            min="0"
                            style={{ fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px' }}>Months</label>
                          <input
                            type="number"
                            value={addr.monthsAtAddress}
                            onChange={(e) => {
                              const updated = [...applicant.addressHistory];
                              updated[addrIndex] = { ...updated[addrIndex], monthsAtAddress: e.target.value };
                              updateApplicant(index, 'addressHistory', updated);
                            }}
                            placeholder="0"
                            min="0"
                            max="11"
                            style={{ fontSize: '13px' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="hint-text" style={{ marginTop: '12px', fontSize: '12px' }}>
                    {(() => {
                      const currentYears = parseInt(applicant.yearsAtCurrentAddress) || 0;
                      const currentMonths = parseInt(applicant.monthsAtCurrentAddress) || 0;
                      const historyYears = (applicant.addressHistory || []).reduce((sum, addr) =>
                        sum + (parseInt(addr.yearsAtAddress) || 0), 0);
                      const historyMonths = (applicant.addressHistory || []).reduce((sum, addr) =>
                        sum + (parseInt(addr.monthsAtAddress) || 0), 0);
                      const totalMonths = (currentYears * 12) + currentMonths + (historyYears * 12) + historyMonths;
                      const totalYears = Math.floor(totalMonths / 12);
                      const remainingMonths = totalMonths % 12;
                      if (totalMonths < 36) {
                        return `⚠️ Total: ${totalYears} years ${remainingMonths} months (need 3 years minimum)`;
                      } else {
                        return `✓ Total: ${totalYears} years ${remainingMonths} months`;
                      }
                    })()}
                  </div>
                </div>
              </div>

              {index > 0 && (
                <div className="mb-6">
                  <label>Relationship to Applicant 1</label>
                  <select
                    value={applicant.relationshipToApplicant1}
                    onChange={(e) => updateApplicant(index, 'relationshipToApplicant1', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Spouse">Spouse</option>
                    <option value="De Facto Partner">De Facto Partner</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Business Partner">Business Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {!shouldShareDependants(index) && (
                <div className="mb-6">
                  <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                      Dependants
                    </h4>
                    <div className="mb-4">
                      <label>Number of Dependants</label>
                      <select
                        value={applicant.numDependants}
                        onChange={(e) => updateApplicant(index, 'numDependants', e.target.value)}
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    {applicant.dependants && applicant.dependants.map((dependant, depIndex) => (
                      <div
                        key={depIndex}
                        style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '8px', border: '1px solid var(--border-primary)' }}
                      >
                        <div className="grid grid-cols-2">
                          <div>
                            <label>Name</label>
                            <input
                              type="text"
                              value={dependant.name}
                              onChange={(e) => updateDependant(index, depIndex, 'name', e.target.value)}
                              placeholder="Dependant name"
                            />
                          </div>
                          <div>
                            <label>Age</label>
                            <input
                              type="number"
                              value={dependant.age}
                              onChange={(e) => updateDependant(index, depIndex, 'age', e.target.value)}
                              placeholder="Age"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shouldShareDependants(index) && (
                <div className="mb-6">
                  <div style={{ padding: '16px', background: 'var(--color-info-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-info)' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-info-dark)' }}>
                      ℹ️ <strong>Shared Dependants:</strong> As the spouse of Applicant 1, dependants are automatically shared and managed in Applicant 1's section.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Company Guarantor Fields */}
          {applicant.type === 'Company Guarantor' && (
            <>
              <div className="grid grid-cols-2 mb-4">
                <div>
                  <label>First Name</label>
                  <input
                    type="text"
                    value={applicant.firstName}
                    onChange={(e) => updateApplicant(index, 'firstName', e.target.value)}
                    placeholder="Director first name"
                  />
                </div>
                <div>
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={applicant.lastName}
                    onChange={(e) => updateApplicant(index, 'lastName', e.target.value)}
                    placeholder="Director last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 mb-4">
                <div>
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={applicant.dob}
                    onChange={(e) => updateApplicant(index, 'dob', e.target.value)}
                  />
                </div>
                <div>
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={applicant.phone}
                    onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                    placeholder="0400 000 000"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label>Email</label>
                <input
                  type="email"
                  value={applicant.email}
                  onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                  placeholder="director@company.com.au"
                />
              </div>

              <div className="mb-4">
                <label>Relationship to Company</label>
                <select
                  value={applicant.relationshipToCompany}
                  onChange={(e) => updateApplicant(index, 'relationshipToCompany', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Director">Director</option>
                  <option value="Shareholder">Shareholder</option>
                  <option value="Beneficial Owner">Beneficial Owner</option>
                  <option value="Trustee">Trustee</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Change 8: Company Details section */}
              <div className="mb-4" style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Company Details</h4>

                <div className="mb-3">
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={applicant.companyName || ''}
                    onChange={(e) => updateApplicant(index, 'companyName', e.target.value)}
                    placeholder="XYZ Pty Ltd"
                  />
                </div>

                <div className="mb-3">
                  <label>ABN</label>
                  <input
                    type="text"
                    value={applicant.companyABN || ''}
                    onChange={(e) => updateApplicant(index, 'companyABN', e.target.value)}
                    placeholder="12 345 678 901"
                  />
                </div>

                <div className="mb-3">
                  <label>ACN</label>
                  <input
                    type="text"
                    value={applicant.companyACN || ''}
                    onChange={(e) => updateApplicant(index, 'companyACN', e.target.value)}
                    placeholder="123 456 789"
                  />
                </div>

                <div className="hint-text" style={{ marginTop: '8px', fontSize: '12px' }}>
                  ℹ️ Additional company details can be refined later
                </div>
              </div>
            </>
          )}

          {/* Change 9: Single Document Upload Zone */}
          <div className="mt-6">
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                Document Upload
              </h4>

              <div
                className="document-upload-zone"
                style={{
                  border: '2px dashed var(--border-primary)',
                  borderRadius: '8px',
                  padding: '32px',
                  textAlign: 'center',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
                onClick={() => document.getElementById(`fileInput-${index}`).click()}
              >
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📎</div>
                <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Drag and drop files here</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>or click to browse</p>
                <input
                  id={`fileInput-${index}`}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    updateApplicant(index, 'uploadedDocuments', files);
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {applicant.uploadedDocuments && applicant.uploadedDocuments.length > 0 && (
                <div className="mt-2">
                  <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    {applicant.uploadedDocuments.length} file(s) selected:
                  </p>
                  <ul style={{ fontSize: '12px', margin: '0', paddingLeft: '20px' }}>
                    {applicant.uploadedDocuments.map((file, i) => (
                      <li key={i}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="hint-text" style={{ marginTop: '12px' }}>
                Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 5MB per file)
              </p>
            </div>
          </div>

        </div>
      ))}

      {applicants.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-primary)'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            No applicants configured. Please complete Step 0 (Loan Strategy) first.
          </p>
        </div>
      )}
    </div>
  );
};

export default Step1Applicants;
