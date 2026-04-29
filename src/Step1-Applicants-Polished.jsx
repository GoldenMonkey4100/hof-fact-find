import React, { useState } from 'react';
import './styles.css';
import AddressAutocomplete from './AddressAutocomplete';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const normalizeMediaType = (file) => {
  const MIME_MAP = {
    'image/jpeg':    'image/jpeg',
    'image/jpg':     'image/jpeg',  // browsers sometimes return image/jpg
    'image/png':     'image/png',
    'image/gif':     'image/gif',
    'image/webp':    'image/webp',
    'application/pdf': 'application/pdf',
  };
  return MIME_MAP[(file.type || '').toLowerCase()] || 'image/jpeg';
};

// ── Component ─────────────────────────────────────────────────────────────────

const Step1Applicants = ({ formData, updateFormData }) => {
  const [applicants,    setApplicants]    = useState([]);
  const [mercuryMatches, setMercuryMatches] = useState({});

  // DL upload state: { [index]: { front: File|null, back: File|null } }
  const [dlFiles,      setDlFilesState]  = useState({});
  const [dlExtracting, setDlExtracting]  = useState({});
  const [dlExtracted,  setDlExtracted]   = useState({});

  // Increments when AI pre-fills the address → forces AddressAutocomplete remount
  const [addrResetKey, setAddrResetKey]  = useState({});

  // ── Mercury lookup ──────────────────────────────────────────────────────────
  const lookupMercury = async (applicantIndex, email, phone) => {
    const hasValue = (email && email.includes('@')) || (phone && phone.replace(/\D/g, '').length >= 10);
    if (!hasValue) return;

    setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'loading' } }));
    try {
      const params = new URLSearchParams();
      if (email && email.includes('@')) params.set('email', email);
      if (phone && phone.replace(/\D/g, '').length >= 10) params.set('phone', phone.replace(/\s/g, ''));

      const res  = await fetch(`/api/mercury-search?${params}`);
      const data = await res.json();

      if (data.error) {
        setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'error', message: data.error } }));
      } else if (data.results && data.results.length > 0) {
        setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'found', contacts: data.results, totalCount: data.totalCount } }));
      } else {
        setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'not_found' } }));
      }
    } catch (err) {
      setMercuryMatches(prev => ({ ...prev, [applicantIndex]: { status: 'error', message: err.message } }));
    }
  };

  // ── DL upload helpers ───────────────────────────────────────────────────────
  const setDLFile = (index, side, file) => {
    setDlFilesState(prev => ({
      ...prev,
      [index]: { ...(prev[index] || { front: null, back: null }), [side]: file || null }
    }));
  };

  const handleDLExtract = async (index) => {
    const files = dlFiles[index] || {};
    const { front, back } = files;
    if (!front) return;

    setDlExtracting(prev => ({ ...prev, [index]: true }));
    setDlExtracted(prev => ({ ...prev, [index]: null }));

    try {
      const images = [{ base64: await fileToBase64(front), mediaType: normalizeMediaType(front) }];
      if (back) images.push({ base64: await fileToBase64(back), mediaType: normalizeMediaType(back) });

      const res  = await fetch('/api/extract-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });
      const data = await res.json();

      setDlExtracting(prev => ({ ...prev, [index]: false }));

      if (data.error) {
        setDlExtracted(prev => ({ ...prev, [index]: { error: data.error } }));
        return;
      }

      // Pre-fill form fields
      const updates = {};
      if (data.firstName)     updates.firstName     = data.firstName;
      if (data.lastName)      updates.lastName      = data.lastName;
      if (data.middleName)    updates.middleName    = data.middleName;
      if (data.dob)           updates.dob           = data.dob;
      if (data.address)       updates.address       = data.address;
      if (data.gender)        updates.gender        = data.gender;
      if (data.licenceNumber) updates.licenceNumber = data.licenceNumber;

      setApplicants(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        updateFormData('applicants', updated);
        return updated;
      });

      // If address was pre-filled, increment reset key so AddressAutocomplete
      // remounts with a fresh Google Places instance (prevents stale autocomplete)
      if (data.address) {
        setAddrResetKey(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
      }

      setDlExtracted(prev => ({ ...prev, [index]: { success: true, fields: Object.keys(updates) } }));
    } catch (err) {
      setDlExtracting(prev => ({ ...prev, [index]: false }));
      setDlExtracted(prev => ({ ...prev, [index]: { error: err.message } }));
    }
  };

  // ── Mercury banner ──────────────────────────────────────────────────────────
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

  // ── Compact supporting document upload ──────────────────────────────────────
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

  // ── Driver Licence upload (front + back) with AI extraction ─────────────────
  const renderDLUpload = (applicant, index) => {
    const files    = dlFiles[index] || {};
    const hasFront = !!files.front;
    const hasBack  = !!files.back;
    const isReady  = hasFront && !dlExtracting[index];

    const FileZone = ({ side, label, hint, file }) => (
      <label style={{ cursor: 'pointer', display: 'block' }}>
        <input
          type="file"
          accept="image/*,.pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => setDLFile(index, side, e.target.files[0])}
        />
        <div style={{
          padding: '8px 10px',
          background: file ? '#dcfce7' : 'white',
          border: `1px solid ${file ? '#86efac' : '#cbd5e1'}`,
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>{file ? '✓' : '📷'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', color: file ? '#166534' : '#334155' }}>
              {label}
              {hint && <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '4px' }}>{hint}</span>}
            </div>
            <div style={{ color: file ? '#166534' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file ? file.name : 'Click to upload'}
            </div>
          </div>
        </div>
      </label>
    );

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '14px 16px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>🪪</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1' }}>Driver Licence — Auto-fill</div>
              <div style={{ fontSize: '12px', color: '#0284c7' }}>
                Upload front &amp; back — AI reads both sides and picks the most recent address
              </div>
            </div>
          </div>

          {/* Front / Back file zones */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <FileZone side="front" label="Front *"               file={files.front} />
            <FileZone side="back"  label="Back"  hint="(recommended)" file={files.back} />
          </div>

          {/* Extract button */}
          <button
            type="button"
            disabled={!isReady}
            onClick={() => handleDLExtract(index)}
            style={{
              width: '100%',
              padding: '8px',
              background: isReady ? '#0369a1' : '#93c5fd',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isReady ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {dlExtracting[index] ? (
              <>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Reading licence…
              </>
            ) : !hasFront
              ? 'Upload front of licence first'
              : `Extract & Auto-fill${hasBack ? ' (Front + Back)' : ' (Front only)'}`}
          </button>
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
  };

  // ── Applicant seeding ───────────────────────────────────────────────────────
  React.useEffect(() => {
    const totalCount = formData.numApplicants + formData.numGuarantors;
    const newApplicants = [];

    for (let i = 0; i < totalCount; i++) {
      const isApplicant    = i < formData.numApplicants;
      const applicantNumber = isApplicant ? i + 1 : i - formData.numApplicants + 1;
      const role           = isApplicant ? 'Applicant' : 'Guarantor';
      const existing       = (formData.applicants || []).find(a => a.id === i + 1);

      if (formData.applicantType === 'Company') {
        if (isApplicant) {
          newApplicants.push(existing && existing.type === 'Company Borrower' ? existing : {
            id: i + 1, type: 'Company Borrower', role, number: applicantNumber,
            companyName: '', tradingName: '', companyABN: '', companyACN: '',
            entityType: '', registeredAddress: '', phone: '', email: '',
            uploadedDocuments: [], assets: [], liabilities: []
          });
        } else {
          newApplicants.push(existing && existing.type === 'Director Guarantor' ? existing : {
            id: i + 1, type: 'Director Guarantor', role, number: applicantNumber,
            firstName: '', middleName: '', lastName: '', dob: '',
            phone: '', email: '', licenceNumber: '',
            address: '', yearsAtCurrentAddress: '', monthsAtCurrentAddress: '',
            addressHistory: [], relationshipToCompany: '',
            numDependants: 0, dependants: [],
            uploadedDocuments: [], assets: [], liabilities: []
          });
        }
      } else {
        newApplicants.push(existing && existing.type === 'Natural Person' ? existing : {
          id: i + 1, type: 'Natural Person', role, number: applicantNumber,
          firstName: '', middleName: '', lastName: '', dob: '',
          phone: '', email: '', licenceNumber: '',
          address: '', yearsAtCurrentAddress: '', monthsAtCurrentAddress: '',
          addressHistory: [], gender: '', maritalStatus: '',
          residencyStatus: '', visaNumber: '',
          relationshipToApplicant1: i === 0 ? 'Primary' : '',
          numDependants: 0, dependants: [],
          uploadedDocuments: [], assets: [], liabilities: []
        });
      }
    }

    setApplicants(newApplicants);
    updateFormData('applicants', newApplicants);
  }, [formData.numApplicants, formData.numGuarantors, formData.applicantType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── State helpers ───────────────────────────────────────────────────────────
  const updateApplicant = (index, field, value) => {
    setApplicants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'numDependants') {
        const numDeps    = parseInt(value) || 0;
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
    if (type === 'Company Borrower')   return 'Company / entity details';
    if (type === 'Director Guarantor') return 'Director / personal guarantor details';
    return 'Natural person details';
  };

  // ── Address history (with Google Places autocomplete) ──────────────────────
  // Key includes addrResetKey[index] so the current-address field remounts after
  // AI pre-fill, giving a fresh Google Places instance that works correctly.
  const renderAddressHistory = (applicant, index) => (
    <div className="mb-4" style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
      <div className="flex justify-between items-center mb-3">
        <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>3-Year Residential Address History</h4>
        <button
          type="button"
          onClick={() => {
            const current = applicant.addressHistory || [];
            updateApplicant(index, 'addressHistory', [
              ...current,
              { id: Date.now(), address: '', yearsAtAddress: '', monthsAtAddress: '' }
            ]);
          }}
          className="btn-secondary"
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          + Add Previous Address
        </button>
      </div>

      {/* Current address — key changes when AI pre-fills to force remount */}
      <div className="mb-3" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-primary)' }}>
        <label style={{ fontSize: '13px', fontWeight: '500' }}>Current Address</label>
        <AddressAutocomplete
          key={`current-addr-${index}-${addrResetKey[index] || 0}`}
          value={applicant.address || ''}
          onChange={(val) => updateApplicant(index, 'address', val)}
          placeholder="Start typing current address…"
          style={{ fontSize: '13px' }}
        />
        <div className="grid grid-cols-2" style={{ marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: '12px' }}>Years</label>
            <input type="number" value={applicant.yearsAtCurrentAddress || ''} placeholder="0" min="0" style={{ fontSize: '13px' }}
              onChange={(e) => updateApplicant(index, 'yearsAtCurrentAddress', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '12px' }}>Months</label>
            <input type="number" value={applicant.monthsAtCurrentAddress || ''} placeholder="0" min="0" max="11" style={{ fontSize: '13px' }}
              onChange={(e) => updateApplicant(index, 'monthsAtCurrentAddress', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Previous addresses */}
      {(applicant.addressHistory || []).map((addr, addrIndex) => (
        <div key={addr.id} className="mb-3" style={{ paddingTop: '12px' }}>
          <div className="flex justify-between items-center mb-2">
            <label style={{ fontSize: '13px', fontWeight: '500' }}>Previous Address {addrIndex + 1}</label>
            <button type="button" className="btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}
              onClick={() => updateApplicant(index, 'addressHistory', applicant.addressHistory.filter((_, i) => i !== addrIndex))}>
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
              <input type="number" value={addr.yearsAtAddress} placeholder="0" min="0" style={{ fontSize: '13px' }}
                onChange={(e) => {
                  const updated = [...applicant.addressHistory];
                  updated[addrIndex] = { ...updated[addrIndex], yearsAtAddress: e.target.value };
                  updateApplicant(index, 'addressHistory', updated);
                }} />
            </div>
            <div>
              <label style={{ fontSize: '12px' }}>Months</label>
              <input type="number" value={addr.monthsAtAddress} placeholder="0" min="0" max="11" style={{ fontSize: '13px' }}
                onChange={(e) => {
                  const updated = [...applicant.addressHistory];
                  updated[addrIndex] = { ...updated[addrIndex], monthsAtAddress: e.target.value };
                  updateApplicant(index, 'addressHistory', updated);
                }} />
            </div>
          </div>
        </div>
      ))}

      {/* Running total */}
      <div className="hint-text" style={{ marginTop: '12px', fontSize: '12px' }}>
        {(() => {
          const cy = parseInt(applicant.yearsAtCurrentAddress) || 0;
          const cm = parseInt(applicant.monthsAtCurrentAddress) || 0;
          const hy = (applicant.addressHistory || []).reduce((s, a) => s + (parseInt(a.yearsAtAddress) || 0), 0);
          const hm = (applicant.addressHistory || []).reduce((s, a) => s + (parseInt(a.monthsAtAddress) || 0), 0);
          const total = cy * 12 + cm + hy * 12 + hm;
          const ty = Math.floor(total / 12), tm = total % 12;
          return total < 36
            ? `⚠️ Total: ${ty} years ${tm} months (need 3 years minimum)`
            : `✓ Total: ${ty} years ${tm} months`;
        })()}
      </div>
    </div>
  );

  // ── Dependants ──────────────────────────────────────────────────────────────
  const renderDependants = (applicant, index) => (
    <div className="mb-6">
      <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>Dependants</h4>
        <div className="mb-4">
          <label>Number of Dependants</label>
          <select value={applicant.numDependants} onChange={(e) => updateApplicant(index, 'numDependants', e.target.value)}>
            {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {(applicant.dependants || []).map((dep, depIndex) => (
          <div key={depIndex} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '8px', border: '1px solid var(--border-primary)' }}>
            <div className="grid grid-cols-2">
              <div>
                <label>Name</label>
                <input type="text" value={dep.name} placeholder="Dependant name"
                  onChange={(e) => updateDependant(index, depIndex, 'name', e.target.value)} />
              </div>
              <div>
                <label>Age</label>
                <input type="number" value={dep.age} placeholder="Age"
                  onChange={(e) => updateDependant(index, depIndex, 'age', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
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
                  <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '8px' }}>— {applicant.companyName}</span>
                )}
                {(applicant.type === 'Natural Person' || applicant.type === 'Director Guarantor') && (applicant.firstName || applicant.lastName) && (
                  <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    — {[applicant.firstName, applicant.lastName].filter(Boolean).join(' ')}
                  </span>
                )}
              </h3>
              <p className="card-subtitle">{getCardSubtitle(applicant.type)}</p>
            </div>
          </div>

          {/* ── Company Borrower ── */}
          {applicant.type === 'Company Borrower' && (
            <>
              {renderDocumentUpload(applicant, index)}
              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>Company Details</h4>
                <div className="mb-4">
                  <label>Company Name *</label>
                  <input type="text" value={applicant.companyName || ''} placeholder="XYZ Pty Ltd"
                    onChange={(e) => updateApplicant(index, 'companyName', e.target.value)} />
                </div>
                <div className="mb-4">
                  <label>Trading Name <span style={{ fontWeight: '400', color: 'var(--text-tertiary)' }}>(if different)</span></label>
                  <input type="text" value={applicant.tradingName || ''} placeholder="Trading name (optional)"
                    onChange={(e) => updateApplicant(index, 'tradingName', e.target.value)} />
                </div>
                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>ABN</label>
                    <input type="text" value={applicant.companyABN || ''} placeholder="12 345 678 901"
                      onChange={(e) => updateApplicant(index, 'companyABN', e.target.value)} />
                  </div>
                  <div>
                    <label>ACN</label>
                    <input type="text" value={applicant.companyACN || ''} placeholder="123 456 789"
                      onChange={(e) => updateApplicant(index, 'companyACN', e.target.value)} />
                  </div>
                  <div>
                    <label>Entity Type</label>
                    <select value={applicant.entityType || ''} onChange={(e) => updateApplicant(index, 'entityType', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Company">Company</option>
                      <option value="Trust">Trust</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label>Registered Address</label>
                  <input type="text" value={applicant.registeredAddress || ''} placeholder="Registered business address"
                    onChange={(e) => updateApplicant(index, 'registeredAddress', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Phone</label>
                    <input type="tel" value={applicant.phone || ''} placeholder="02 9000 0000"
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)} />
                  </div>
                  <div>
                    <label>Email</label>
                    <input type="email" value={applicant.email || ''} placeholder="info@company.com.au"
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Director Guarantor ── */}
          {applicant.type === 'Director Guarantor' && (
            <>
              {renderMercuryBanner(index)}
              {renderDocumentUpload(applicant, index)}
              {renderDLUpload(applicant, index)}

              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>Director / Guarantor Details</h4>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>First Name</label>
                    <input type="text" value={applicant.firstName || ''} placeholder="John"
                      onChange={(e) => updateApplicant(index, 'firstName', e.target.value)} />
                  </div>
                  <div>
                    <label>Middle Name</label>
                    <input type="text" value={applicant.middleName || ''} placeholder="Optional"
                      onChange={(e) => updateApplicant(index, 'middleName', e.target.value)} />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input type="text" value={applicant.lastName || ''} placeholder="Smith"
                      onChange={(e) => updateApplicant(index, 'lastName', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>Date of Birth</label>
                    <input type="date" value={applicant.dob || ''}
                      onChange={(e) => updateApplicant(index, 'dob', e.target.value)} />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input type="tel" value={applicant.phone || ''} placeholder="0400 000 000"
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      onBlur={(e) => lookupMercury(index, applicant.email, e.target.value)} />
                  </div>
                  <div>
                    <label>Licence Number</label>
                    <input type="text" value={applicant.licenceNumber || ''} placeholder="e.g. 12345678"
                      onChange={(e) => updateApplicant(index, 'licenceNumber', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Email</label>
                    <input type="email" value={applicant.email || ''} placeholder="john.smith@company.com.au"
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      onBlur={(e) => lookupMercury(index, e.target.value, applicant.phone)} />
                  </div>
                  <div>
                    <label>Relationship to Company</label>
                    <select value={applicant.relationshipToCompany || ''} onChange={(e) => updateApplicant(index, 'relationshipToCompany', e.target.value)}>
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

          {/* ── Natural Person ── */}
          {applicant.type === 'Natural Person' && (
            <>
              {renderMercuryBanner(index)}
              {renderDocumentUpload(applicant, index)}
              {renderDLUpload(applicant, index)}

              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>Personal Details</h4>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>First Name</label>
                    <input type="text" value={applicant.firstName} placeholder="John"
                      onChange={(e) => updateApplicant(index, 'firstName', e.target.value)} />
                  </div>
                  <div>
                    <label>Middle Name</label>
                    <input type="text" value={applicant.middleName || ''} placeholder="Optional"
                      onChange={(e) => updateApplicant(index, 'middleName', e.target.value)} />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input type="text" value={applicant.lastName} placeholder="Smith"
                      onChange={(e) => updateApplicant(index, 'lastName', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>Date of Birth</label>
                    <input type="date" value={applicant.dob}
                      onChange={(e) => updateApplicant(index, 'dob', e.target.value)} />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input type="tel" value={applicant.phone} placeholder="0400 000 000"
                      onChange={(e) => updateApplicant(index, 'phone', e.target.value)}
                      onBlur={(e) => lookupMercury(index, applicant.email, e.target.value)} />
                  </div>
                  <div>
                    <label>Gender</label>
                    <select value={applicant.gender} onChange={(e) => updateApplicant(index, 'gender', e.target.value)}>
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
                    <input type="email" value={applicant.email} placeholder="john.smith@example.com"
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      onBlur={(e) => lookupMercury(index, e.target.value, applicant.phone)} />
                  </div>
                  <div>
                    <label>Licence Number</label>
                    <input type="text" value={applicant.licenceNumber || ''} placeholder="e.g. 12345678"
                      onChange={(e) => updateApplicant(index, 'licenceNumber', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 mb-4">
                  <div>
                    <label>Marital Status</label>
                    <select value={applicant.maritalStatus} onChange={(e) => updateApplicant(index, 'maritalStatus', e.target.value)}>
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
                    <select value={applicant.residencyStatus} onChange={(e) => updateApplicant(index, 'residencyStatus', e.target.value)}>
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
                    <input type="text" value={applicant.visaNumber} placeholder="Enter visa number"
                      onChange={(e) => updateApplicant(index, 'visaNumber', e.target.value)} />
                  </div>
                )}

                {renderAddressHistory(applicant, index)}
              </div>

              {index > 0 && (
                <div className="mb-6">
                  <label>Relationship to Applicant 1</label>
                  <select value={applicant.relationshipToApplicant1} onChange={(e) => updateApplicant(index, 'relationshipToApplicant1', e.target.value)}>
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
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-primary)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            No applicants configured. Please complete Step 0 (Loan Strategy) first.
          </p>
        </div>
      )}
    </div>
  );
};

export default Step1Applicants;
