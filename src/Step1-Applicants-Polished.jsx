import React, { useState } from 'react';
import './styles.css';
import AddressAutocomplete from './AddressAutocomplete';

const Step1Applicants = ({ formData, updateFormData }) => {
  const [applicants, setApplicants] = useState([]);
  const [mercuryMatches, setMercuryMatches] = useState({});
  const [dlExtracting, setDlExtracting] = useState({});
  const [dlExtracted, setDlExtracted] = useState({});

  // ── Mercury lookup ────────────────────────────────────────────────────────
  const lookupMercury = async (applicantIndex, email, phone) => {
    const hasValue = (email && email.includes('@')) || (phone && phone.replace(/\D/g, '').length >= 10);
    if (!hasValue) return;

    setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'loading' } }));
    try {
      const params = new URLSearchParams();
      if (email && email.includes('@')) params.set('email', email);
      if (phone && phone.replace(/\D/g, '').length >= 10) params.set('phone', phone.replace(/\s/g, ''));

      const res = await fetch(`/api/mercury-search?${params}`);
      const data = await res.json();

      if (data.error) {
        setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'error', message: data.error } }));
      } else if (data.results && data.results.length > 0) {
        setMercuryMatches(prev => ({
          ...prev,
          [applicantIndex]: { status: 'found', contacts: data.results, totalCount: data.totalCount }
        }));
      } else {
        setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'not_found' } }));
      }
    } catch (err) {
      setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'error', message: err.message } }));
    }
  };

  // ── Driver Licence AI extraction ──────────────────────────────────────────
  const handleDLUpload = (index, file) => {
    if (!file) return;
    setDlExtracting(prev => ({ ...prev, [index]: true }));
    setDlExtracted(prev => ({ ...prev, [index]: null }));

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const mediaType = file.type || 'image/jpeg';

        const res = await fetch('/api/extract-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType })
        });

        const data = await res.json();
        setDlExtracting(prev => ({ ...prev, [index]: false }));

        if (data.error) {
          setDlExtracted(prev => ({ ...prev, [index]: { error: data.error } }));
          return;
        }

        // Pre-fill form fields from extracted data
        const updates = {};
        if (data.firstName)     updates.firstName     = data.firstName;
        if (data.lastName)      updates.lastName      = data.lastName;
        if (data.middleName)    updates.middleName    = data.middleName;
        if (data.dob)           updates.dob           = data.dob;
        if (data.address)       updates.address       = data.address;
        if (data.gender)        updates.gender        = data.gender;
        if (data.licenceNumber) updates.licenceNumber = data.licenceNumber;

        // Apply all updates atomically
        setApplicants(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...updates };
          updateFormData('applicants', updated);
          return updated;
        });

        setDlExtracted(prev => ({ ...prev, [index]: { success: true, fields: Object.keys(updates) } }));
      } catch (err) {
        setDlExtracting(prev => ({ ...prev, [index]: false }));
        setDlExtracted(prev => ({ ...prev, [index]: { error: err.message } }));
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Mercury banner ────────────────────────────────────────────────────────
  const renderMercuryBanner = (applicantIndex) => {
    const match = mercuryMatches[applicantIndex];
    if (!match) return null;

    if (match.status === 'loading') {
      return (
        <div style={{ padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#0369a1' }}>
          Searching Mercury database…
        </div>
      );
    }

    if (match.status === 'found') {
      const { contacts, totalCount } = match;
      return (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: contacts.length > 1 ? '1px solid #bbf7d0' : 'none', color: '#166534', fontWeight: '600' }}>
            ✓ {totalCount} existing {totalCount === 1 ? 'client' : 'clients'} found in Mercury
            {totalCount > contacts.length && <span style={{ fontWeight: '400' }}> (showing {contacts.length})</span>}
          </div>
          {contacts.map((contact, i) => {
            const isCompany = !contact.firstName && !contact.lastName && contact.company;
            const name = isCompany
              ? contact.company
              : [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.company || 'Unknown';
            const type = isCompany ? 'Company' : 'Person';
            const mercuryUrl = `https://crm.connective.com.au/#/people/${contact.uniqueId}`;
            return (
              <div key={contact.uniqueId || i} style={{
                padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                borderBottom: i < contacts.length - 1 ? '1px solid #bbf7d0' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(134,239,172,0.1)'
              }}>
                <div>
                  <span style={{ color: '#166534', fontWeight: '500' }}>{name}</span>
                  <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: isCompany ? '#dbeafe' : '#f3f4f6', color: isCompany ? '#1d4ed8' : '#374151' }}>
                    {type}
                  </span>
                </div>
                <a href={mercuryUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '13px' }}>
                  View in Mercury →
                </a>
              </div>
            );
          })}
        </div>
      );
    }

    if (match.status === 'not_found') {
      return (
        <div style={{ padding: '10px 14px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#854d0e' }}>
          No existing client found in Mercury for these details.
        </div>
      );
    }

    if (match.status === 'error') {
      return (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#991b1b' }}>
          Mercury lookup error: {match.message || 'Unknown error — check Vercel function logs.'}
        </div>
      );
    }

    return null;
  };

  // ── Compact document upload ───────────────────────────────────────────────
  const renderDocumentUpload = (applicant, index) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        border: '1px dashed var(--border-primary)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--bg-secondary)'
      }}>
        <span style={{ fontSize: '16px' }}>📎</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Supporting Documents
          </span>
          {applicant.uploadedDocuments?.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-primary)', marginLeft: '8px' }}>
              ({applicant.uploadedDocuments.length} file{applicant.uploadedDocuments.length !== 1 ? 's' : ''} selected)
            </span>
          )}
        </div>
        <label style={{ cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              updateApplicant(index, 'uploadedDocuments', [...(applicant.uploadedDocuments || []), ...files]);
            }}
            style={{ display: 'none' }}
          />
          <span style={{
            display: 'inline-block',
            padding: '5px 14px',
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}>
            Browse
          </span>
        </label>
      </div>
    </div>
  );

  // ── Driver Licence upload with AI extraction ──────────────────────────────
  const renderDLUpload = (applicant, index) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>🪪</span>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '2px' }}>
            Driver Licence — Auto-fill
          </div>
          <div style={{ fontSize: '12px', color: '#0284c7' }}>
            Upload a photo or scan to automatically fill in personal details
          </div>
        </div>
        <label style={{ cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleDLUpload(index, e.target.files[0])}
          />
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            background: dlExtracting[index] ? '#93c5fd' : '#0369a1',
            color: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: dlExtracting[index] ? 'default' : 'pointer',
            transition: 'background 0.2s'
          }}>
            {dlExtracting[index] ? (
              <>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Reading…
              </>
            ) : 'Upload DL'}
          </span>
        </label>
      </div>

      {dlExtracted[index]?.success && (
        <div style={{ marginTop: '6px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
          ✓ {dlExtracted[index].fields.length} field{dlExtracted[index].fields.length !== 1 ? 's' : ''} pre-filled from driver licence
        </div>
      )}
      {dlExtracted[index]?.error && (
        <div style={{ marginTop: '6px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', color: '#991b1b' }}>
          ⚠️ Could not extract data: {dlExtracted[index].error}
        </div>
      )}
    </div>
  );

  // ── Applicant seeding ─────────────────────────────────────────────────────
  React.useEffect(() => {
    const totalCount = formData.numApplicants + formData.numGuarantors;
    const newApplicants = [];

    for (let i = 0; i < totalCount; i++) {
      const isApplicant = i < formData.numApplicants;
      const applicantNumber = isApplicant ? i + 1 : i - formData.numApplicants + 1;
      const role = isApplicant ? 'Applicant' : 'Guarantor';

      const existing = (formData.applicants || []).find(a => a.id === i + 1);

      if (formData.applicantType === 'Company') {
        if (isApplicant) {
          newApplicants.push(existing && existing.type === 'Company Borrower' ? existing : {
            id: i + 1,
            type: 'Company Borrower',
            role,
            number: applicantNumber,
            companyName: '',
            tradingName: '',
            companyABN: '',
            companyACN: '',
            entityType: '',
            registeredAddress: '',
            phone: '',
            email: '',
            uploadedDocuments: [],
            assets: [],
            liabilities: []
          });
        } else {
          newApplicants.push(existing && existing.type === 'Director Guarantor' ? existing : {
            id: i + 1,
            type: 'Director Guarantor',
            role,
            number: applicantNumber,
            firstName: '',
            middleName: '',
            lastName: '',
            dob: '',
            phone: '',
            email: '',
            licenceNumber: '',
            address: '',
            yearsAtCurrentAddress: '',
            monthsAtCurrentAddress: '',
            addressHistory: [],
            relationshipToCompany: '',
            numDependants: 0,
            dependants: [],
            uploadedDocuments: [],
            assets: [],
            liabilities: []
          });
        }
      } else {
        newApplicants.push(existing && existing.type === 'Natural Person' ? existing : {
          id: i + 1,
          type: 'Natural Person',
          role,
          number: applicantNumber,
          firstName: '',
          middleName: '',
          lastName: '',
          dob: '',
          phone: '',
          email: '',
          licenceNumber: '',
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
      }
    }

    setApplicants(newApplicants);
    updateFormData('applicants', newApplicants);
  }, [formData.numApplicants, formData.numGuarantors, formData.applicantType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── State helpers ─────────────────────────────────────────────────────────
  const updateApplicant = (index, field, value) => {
    setApplicants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'numDependants') {
        const numDeps = parseInt(value) || 0;
        const currentDeps = updated[index].dependants || [];
        if (numDeps > currentDeps.length) {
          const newDeps = [...currentDeps];
          for (let i = currentDeps.length; i < numDeps; i++) newDeps.push({ name: '', age: '' });
          updated[index].dependants = newDeps;
        } else {
          updated[index].dependants = currentDeps.slice(0, numDeps);
        }
      }

      updateFormData('applicants', updated);
      return updated;
    });
  };

  const updateDependant = (applicantIndex, dependantIndex, field, value) => {
    setApplicants(prev => {
      const updated = [...prev];
      updated[applicantIndex] = { ...updated[applicantIndex] };
      updated[applicantIndex].dependants = [...updated[applicantIndex].dependants];
      updated[applicantIndex].dependants[dependantIndex] = {
        ...updated[applicantIndex].dependants[dependantIndex],
        [field]: value
      };
      updateFormData('applicants', updated);
      return updated;
    });
  };

  const shouldShareDependants = (index) => {
    if (index !== 1) return false;
    return applicants[1]?.relationshipToApplicant1 === 'Spouse';
  };

  const getCardSubtitle = (type) => {
    if (type === 'Company Borrower') return 'Company / entity details';
    if (type === 'Director Guarantor') return 'Director / personal guarantor details';
    return 'Natural person details';
  };

  // ── Address history (with autocomplete) ──────────────────────────────────
  const renderAddressHistory = (applicant, index) => (
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

      {/* Current address */}
      <div className="mb-3" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-primary)' }}>
        <label style={{ fontSize: '13px', fontWeight: '500' }}>Current Address</label>
        <AddressAutocomplete
          value={applicant.address || ''}
          onChange={(val) => updateApplicant(index, 'address', val)}
          placeholder="Start typing current address…"
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

      {/* Previous addresses */}
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
          <AddressAutocomplete
            value={addr.address}
            onChange={(val) => {
              const updated = [...applicant.addressHistory];
              updated[addrIndex] = { ...updated[addrIndex], address: val };
              updateApplicant(index, 'addressHistory', updated);
            }}
            placeholder="Start typing previous address…"
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

      {/* Totals hint */}
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
          }
          return `✓ Total: ${totalYears} years ${remainingMonths} months`;
        })()}
      </div>
    </div>
  );

  // ── Dependants ─────────────────────────────────────────────────────────────
  const renderDependants = (applicant, index) => (
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
  );

  // ── Render ────────────────────────────────────────────────────────────────
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

          {/* Card Header */}
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                {applicant.role} {applicant.number}
                {applicant.type === 'Company Borrower' && applicant.companyName && (
                  <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    — {applicant.companyName}
                  </span>
                )}
                {(applicant.type === 'Natural Person' || applicant.type === 'Director Guarantor') &&
                  (applicant.firstName || applicant.lastName) && (
                  <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    — {[applicant.firstName, applicant.lastName].filter(Boolean).join(' ')}
                  </span>
                )}
              </h3>
              <p className="card-subtitle">{getCardSubtitle(applicant.type)}</p>
            </div>
          </div>

          {/* ── Company Borrower Fields ── */}
          {applicant.type === 'Company Borrower' && (
            <>
              {/* Compact doc upload at top */}
              {renderDocumentUpload(applicant, index)}

              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                  Company Details
                </h4>

                <div className="mb-4">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={applicant.companyName || ''}
                    onChange={(e) => updateApplicant(index, 'companyName', e.target.value)}
                    placeholder="XYZ Pty Ltd"
                  />
                </div>

                <div className="mb-4">
                  <label>Trading Name <span style={{ fontWeight: '400', color: 'var(--text-tertiary)' }}>(if different)</span></label>
                  <input
                    type="text"
                    value={applicant.tradingName || ''}
                    onChange={(e) => updateApplicant(index, 'tradingName', e.target.value)}
                    placeholder="Trading name (optional)"
                  />
                </div>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>ABN</label>
                    <input
                      type="text"
                      value={applicant.companyABN || ''}
                      onChange={(e) => updateApplicant(index, 'companyABN', e.target.value)}
                      placeholder="12 345 678 901"
                    />
                  </div>
                  <div>
                    <label>ACN</label>
                    <input
                      type="text"
                      value={applicant.companyACN || ''}
                      onChange={(e) => updateApplicant(index, 'companyACN', e.target.value)}
                      placeholder="123 456 789"
                    />
                  </div>
                  <div>
                    <label>Entity Type</label>
                    <select
                      value={applicant.entityType || ''}
                      onChange={(e) => updateApplicant(index, 'entityType', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="Company">Company</option>
                      <option value="Trust">Trust</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label>Registered Address</label>
                  <input
                    type="text"
                    value={applicant.registeredAddress || ''}
                    onChange={(e) => updateApplicant(index, 'registeredAddress', e.target.value)}
                    placeholder="Registered business address"
                  />
                </div>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={applicant.phone || ''}
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      placeholder="02 9000 0000"
                    />
                  </div>
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      value={applicant.email || ''}
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      placeholder="info@company.com.au"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Director Guarantor Fields ── */}
          {applicant.type === 'Director Guarantor' && (
            <>
              {renderMercuryBanner(index)}
              {renderDocumentUpload(applicant, index)}
              {renderDLUpload(applicant, index)}

              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                  Director / Guarantor Details
                </h4>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>First Name</label>
                    <input
                      type="text"
                      value={applicant.firstName || ''}
                      onChange={(e) => updateApplicant(index, 'firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={applicant.middleName || ''}
                      onChange={(e) => updateApplicant(index, 'middleName', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={applicant.lastName || ''}
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
                      value={applicant.dob || ''}
                      onChange={(e) => updateApplicant(index, 'dob', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={applicant.phone || ''}
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      onBlur={(e) => lookupMercury(index, applicant.email, e.target.value)}
                      placeholder="0400 000 000"
                    />
                  </div>
                  <div>
                    <label>Licence Number</label>
                    <input
                      type="text"
                      value={applicant.licenceNumber || ''}
                      onChange={(e) => updateApplicant(index, 'licenceNumber', e.target.value)}
                      placeholder="e.g. 12345678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      value={applicant.email || ''}
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      onBlur={(e) => lookupMercury(index, e.target.value, applicant.phone)}
                      placeholder="john.smith@company.com.au"
                    />
                  </div>
                  <div>
                    <label>Relationship to Company</label>
                    <select
                      value={applicant.relationshipToCompany || ''}
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
                </div>

                {renderAddressHistory(applicant, index)}
              </div>

              {renderDependants(applicant, index)}
            </>
          )}

          {/* ── Natural Person Fields ── */}
          {applicant.type === 'Natural Person' && (
            <>
              {renderMercuryBanner(index)}
              {renderDocumentUpload(applicant, index)}
              {renderDLUpload(applicant, index)}

              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
                  Personal Details
                </h4>

                <div className="grid grid-cols-3 mb-4">
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
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={applicant.middleName || ''}
                      onChange={(e) => updateApplicant(index, 'middleName', e.target.value)}
                      placeholder="Optional"
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
                      onBlur={(e) => lookupMercury(index, applicant.email, e.target.value)}
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

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      value={applicant.email}
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      onBlur={(e) => lookupMercury(index, e.target.value, applicant.phone)}
                      placeholder="john.smith@example.com"
                    />
                  </div>
                  <div>
                    <label>Licence Number</label>
                    <input
                      type="text"
                      value={applicant.licenceNumber || ''}
                      onChange={(e) => updateApplicant(index, 'licenceNumber', e.target.value)}
                      placeholder="e.g. 12345678"
                    />
                  </div>
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

                {renderAddressHistory(applicant, index)}
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

              {!shouldShareDependants(index) && renderDependants(applicant, index)}

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
