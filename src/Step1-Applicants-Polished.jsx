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
  const [abnLookup,     setAbnLookup]     = useState({}); // { [index]: { loading, result, error } }

  // DL upload state: { [index]: { front: File|null, back: File|null } }
  const [dlFiles,      setDlFilesState]  = useState({});
  const [dlExtracting, setDlExtracting]  = useState({});
  const [dlExtracted,  setDlExtracted]   = useState({});
  const [dlDragging,   setDlDragging]    = useState({}); // { '[index]-front': bool }

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

  // ── ABN lookup (Company Borrower) ───────────────────────────────────────────
  const mapEntityCode = (code) => {
    if (!code) return '';
    if (code === 'PRV' || code === 'PUB') return 'Company';
    if (code === 'TRU' || code === 'ATF') return 'Trust';
    if (code === 'IND') return 'Sole Trader';
    if (code === 'PTN') return 'Partnership';
    if (code === 'SMF') return 'SMSF';
    return '';
  };

  const formatACN = (cleanABN) => {
    const acn = cleanABN.slice(2); // last 9 digits
    return `${acn.slice(0,3)} ${acn.slice(3,6)} ${acn.slice(6)}`;
  };

  const lookupCompanyABN = async (index, abn) => {
    const clean = (abn || '').replace(/\D/g, '');
    if (clean.length !== 11) return;
    setAbnLookup(p => ({ ...p, [index]: { loading: true, result: null, error: null } }));
    try {
      const res  = await fetch(`/api/abn-lookup?abn=${clean}`);
      const data = await res.json();
      if (data.error) {
        setAbnLookup(p => ({ ...p, [index]: { loading: false, result: null, error: data.error } }));
      } else {
        setAbnLookup(p => ({ ...p, [index]: { loading: false, result: data, error: null } }));
        // Batch-update all auto-filled fields in one state transaction
        setApplicants(prev => {
          const updated = [...prev];
          const ex = updated[index] || {};
          updated[index] = {
            ...ex,
            abnVerification:       data,
            companyName:           ex.companyName       || data.entityName || '',
            companyACN:            ex.companyACN        || formatACN(clean),
            entityType:            ex.entityType        || mapEntityCode(data.entityCode),
            abnStatus:             data.status          || '',
            abnFrom:               data.abnFrom         || '',
            gstRegistered:         data.gstRegistered,
            gstDate:               data.gstDate         || '',
            mainBusinessLocation:  ex.mainBusinessLocation ||
                                   [data.state, data.postcode].filter(Boolean).join(' '),
          };
          updateFormData('applicants', updated);
          return updated;
        });
      }
    } catch (err) {
      setAbnLookup(p => ({ ...p, [index]: { loading: false, result: null, error: err.message } }));
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

      // ── Upload DL images to Vercel Blob so URLs can be stored in Notion ──
      const uploadToBlob = async (file, side) => {
        try {
          const b64 = await fileToBase64(file);
          const ext = file.name.split('.').pop() || 'jpg';
          const blobRes = await fetch('/api/upload-blob', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64: b64,
              filename: `dl-${side}-${Date.now()}.${ext}`,
              contentType: normalizeMediaType(file),
            }),
          });
          const blobData = await blobRes.json();
          return blobData.url || null;
        } catch (e) {
          console.warn(`[DL Blob upload ${side}] failed:`, e.message);
          return null;
        }
      };

      const [frontUrl, backUrl] = await Promise.all([
        front ? uploadToBlob(front, 'front') : Promise.resolve(null),
        back  ? uploadToBlob(back,  'back')  : Promise.resolve(null),
      ]);

      if (frontUrl || backUrl) {
        setApplicants(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            ...(frontUrl ? { dlFrontUrl: frontUrl } : {}),
            ...(backUrl  ? { dlBackUrl:  backUrl  } : {}),
          };
          updateFormData('applicants', updated);
          return updated;
        });
      }

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
        <div style={{ padding: '10px 14px', background: 'var(--bg-info-surface)', border: '1px solid var(--border-info)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-info)' }}>
          Searching Mercury database…
        </div>
      );
    }

    if (match.status === 'found') {
      const { contacts, totalCount } = match;

      // Comprehensive company detection — checks multiple CRM field conventions
      const resolveContact = (contact) => {
        // 1. Explicit type/category fields (various CRM conventions)
        const typeStr = [
          contact.type, contact.entityType, contact.contactType,
          contact.recordType, contact.category, contact.contactCategory
        ].filter(Boolean).join(' ').toLowerCase();

        if (typeStr.match(/compan|organis|organizat|business|corporate|entity/)) {
          return { isCompany: true };
        }
        if (typeStr.match(/person|individual|contact|client/)) {
          return { isCompany: false };
        }

        // 2. Has ABN → company
        if (contact.abn) return { isCompany: true };

        // 3. Has a company name distinctly different from the person name
        const personName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim().toLowerCase();
        const companyName = (contact.company || '').trim().toLowerCase();
        if (companyName && companyName !== personName) return { isCompany: true };

        // 4. No person name at all but has company name
        if (!contact.firstName && !contact.lastName && contact.company) return { isCompany: true };

        return { isCompany: false };
      };

      return (
        <div style={{ background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: contacts.length > 1 ? '1px solid var(--border-success)' : 'none', color: 'var(--text-success-emphasis)', fontWeight: '600' }}>
            ✓ {totalCount} existing {totalCount === 1 ? 'client' : 'clients'} found in Mercury
            {totalCount > contacts.length && <span style={{ fontWeight: '400' }}> (showing {contacts.length})</span>}
          </div>
          {contacts.map((contact, i) => {
            const { isCompany } = resolveContact(contact);
            const personName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
            const name = isCompany
              ? (contact.company || personName || 'Unknown')
              : (personName || contact.company || 'Unknown');
            // For company records, show the contact person's name as a subtitle if available
            const contactPerson = isCompany && personName && personName !== contact.company ? personName : null;
            const type = isCompany ? 'Company' : 'Person';
            const mercuryUrl = `https://crm.connective.com.au/#/people/${contact.uniqueId}`;
            return (
              <div key={contact.uniqueId || i} style={{
                padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                borderBottom: i < contacts.length - 1 ? '1px solid var(--border-success)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(134,239,172,0.1)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-success-emphasis)', fontWeight: '500' }}>{name}</span>
                  <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: isCompany ? '#dbeafe' : '#f3f4f6', color: isCompany ? '#1d4ed8' : '#374151' }}>
                    {type}
                  </span>
                  {contactPerson && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      c/- {contactPerson}
                    </span>
                  )}
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
        <div style={{ padding: '10px 14px', background: 'var(--bg-warning-surface)', border: '1px solid var(--border-warning)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-warning-emphasis)' }}>
          No existing client found in Mercury for these details.
        </div>
      );
    }

    if (match.status === 'error') {
      return (
        <div style={{ padding: '10px 14px', background: 'var(--bg-danger-surface)', border: '1px solid var(--border-danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-danger-emphasis)' }}>
          Mercury lookup error: {match.message || 'Unknown error — check Vercel function logs.'}
        </div>
      );
    }

    return null;
  };

  // ── E-Signature request section ─────────────────────────────────────────────
  const [eSignOpen,    setESignOpen]    = useState({}); // { [index]: bool }
  const [eSignSending, setESignSending] = useState({}); // { [index]: bool }
  const [eSignChecking,setESignChecking]= useState({}); // { [index]: bool }
  const [eSignError,   setESignError]   = useState({}); // { [index]: string }
  // Local form state for the send form: { [index]: { name, email, mobile } }
  const [eSignForm,    setESignForm]    = useState({});

  const updateESignForm = (index, field, value) =>
    setESignForm(p => ({ ...p, [index]: { ...(p[index] || {}), [field]: value } }));

  const handleSendESign = async (applicant, index) => {
    // Use _override fields (set by renderESignatureSection) or fall back to applicant record
    const name  = applicant._overrideName  || [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(' ') || applicant.companyName || '';
    const email = applicant._overrideEmail || applicant.email || '';
    const mobile= applicant._overridePhone || applicant.phone || '';

    if (!name || !email) {
      setESignError(p => ({ ...p, [index]: 'Add the applicant\'s name and email above first.' }));
      return;
    }
    if (!formData.brokerName) {
      setESignError(p => ({ ...p, [index]: 'Please select a broker in Step 0 first.' }));
      return;
    }

    setESignSending(p => ({ ...p, [index]: true }));
    setESignError(p => ({ ...p, [index]: null }));

    try {
      const res  = await fetch('/api/docuseal-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName: name, signerEmail: email, signerPhone: mobile, brokerName: formData.brokerName, applicantRef: `${applicant.role} ${applicant.number}` }),
      });
      const data = await res.json();

      if (data.error) {
        setESignError(p => ({ ...p, [index]: data.error }));
        setESignSending(p => ({ ...p, [index]: false }));
        return;
      }

      // Save submission details to applicant record
      updateApplicant(index, 'eSignature', {
        status: 'pending',
        name, email, mobile,
        submissionId: data.submissionId,
        signingUrl: data.signingUrl,
        requestedAt: data.sentAt || new Date().toISOString(),
        broker: formData.brokerName,
      });
      setESignOpen(p => ({ ...p, [index]: false }));
      setESignSending(p => ({ ...p, [index]: false }));
    } catch (err) {
      setESignError(p => ({ ...p, [index]: err.message }));
      setESignSending(p => ({ ...p, [index]: false }));
    }
  };

  const handleCheckStatus = async (applicant, index) => {
    const sig = applicant.eSignature || {};
    if (!sig.submissionId) return;
    setESignChecking(p => ({ ...p, [index]: true }));
    try {
      const res  = await fetch(`/api/docuseal-status?submissionId=${sig.submissionId}`);
      const data = await res.json();
      if (data.error) { setESignChecking(p => ({ ...p, [index]: false })); return; }

      // DocuSeal statuses: pending | completed | declined | expired
      const newStatus = data.status === 'completed' ? 'signed' : data.status === 'declined' ? 'declined' : 'pending';
      updateApplicant(index, 'eSignature', {
        ...sig,
        status: newStatus,
        signedAt: data.signedAt || sig.signedAt,
        docusealStatus: data.status,
      });
      setESignChecking(p => ({ ...p, [index]: false }));
    } catch {
      setESignChecking(p => ({ ...p, [index]: false }));
    }
  };

  const renderESignatureSection = (applicant, index) => {
    const sig        = applicant.eSignature || {};
    const sending    = !!eSignSending[index];
    const checking   = !!eSignChecking[index];
    const error      = eSignError[index];
    const isPending  = sig.status === 'pending';
    const isSigned   = sig.status === 'signed';
    const isDeclined = sig.status === 'declined';

    // Auto-populate from applicant fields — no re-entry needed
    const signerName  = [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(' ') || applicant.companyName || '';
    const signerEmail = applicant.email || '';
    const signerPhone = applicant.phone || '';
    const canSend     = signerName && signerEmail && formData.brokerName;

    const bgColor     = isSigned ? '#f0fdf4' : isDeclined ? '#fef2f2' : isPending ? '#f0f9ff' : '#fafafa';
    const borderColor = isSigned ? '#86efac' : isDeclined ? '#fca5a5' : isPending ? '#bae6fd' : 'var(--border-primary)';
    const icon        = isSigned ? '✅' : isDeclined ? '❌' : isPending ? '🕐' : '✍️';

    return (
      <div style={{ marginBottom: '12px', padding: '14px 16px', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Credit Guide — E-Signature</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {isSigned   ? `Signed by ${sig.name} on ${sig.signedAt ? new Date(sig.signedAt).toLocaleDateString('en-AU') : '—'}`
                : isDeclined ? `Declined by ${sig.name}`
                : isPending  ? `Sent to ${sig.email} · Awaiting signature`
                : signerEmail ? `Will send to: ${signerName} <${signerEmail}>`
                : 'Complete name & email above before sending'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {isPending && sig.submissionId && (
              <button type="button" onClick={() => handleCheckStatus(applicant, index)} disabled={checking}
                style={{ padding: '5px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '11px', cursor: checking ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}>
                {checking ? 'Checking…' : '↻ Check Status'}
              </button>
            )}
            {!isSigned && (
              <button type="button"
                disabled={sending || (!isPending && !canSend)}
                onClick={() => handleSendESign({ ...applicant, _overrideName: signerName, _overrideEmail: signerEmail, _overridePhone: signerPhone }, index)}
                style={{ padding: '6px 16px', background: !canSend && !isPending ? '#e2e8f0' : sending ? '#93c5fd' : isPending ? 'white' : 'var(--color-primary)', color: !canSend && !isPending ? '#9ca3af' : isPending ? 'var(--text-primary)' : 'var(--bg-primary)', border: isPending ? '1px solid var(--border-primary)' : 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: !canSend && !isPending || sending ? 'not-allowed' : 'pointer' }}>
                {sending ? 'Sending…' : isPending ? '↺ Resend' : '✉ Send for Signature'}
              </button>
            )}
          </div>
        </div>

        {!canSend && !sig.status && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-warning-emphasis)', background: 'var(--bg-warning-surface)', border: '1px solid var(--border-warning)', borderRadius: '5px', padding: '5px 10px' }}>
            {!formData.brokerName ? '⚠ Select broker in Step 0 first' : !signerEmail ? '⚠ Enter the applicant\'s email above to enable sending' : ''}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'var(--bg-danger-surface)', border: '1px solid var(--border-danger)', borderRadius: '5px', fontSize: '12px', color: 'var(--text-danger-emphasis)' }}>
            ⚠️ {error}
          </div>
        )}

        {isSigned && sig.submissionId && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <a href={`/api/docuseal-download?submissionId=${sig.submissionId}&type=signed`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '5px 12px', background: 'var(--color-success)', color: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}>
              ⬇ Signed Credit Guide
            </a>
            <a href={`/api/docuseal-download?submissionId=${sig.submissionId}&type=audit`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '5px 12px', background: 'var(--color-gold)', color: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}>
              ⬇ Audit Trail
            </a>
          </div>
        )}
      </div>
    );
  };

  // ── Driver Licence upload — single drop zone (accepts 1–2 files) ────────────
  const renderDLUpload = (applicant, index) => {
    const files      = dlFiles[index] || {};
    const hasFront   = !!files.front;
    const hasBack    = !!files.back;
    const fileCount  = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);
    const isReady    = hasFront && !dlExtracting[index];
    const isDragging = !!dlDragging[`${index}-zone`];
    const inputId    = `dl-input-${index}`;

    const handleFiles = (fileList) => {
      const arr = Array.from(fileList).filter(f =>
        f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      if (arr[0]) setDLFile(index, 'front', arr[0]);
      if (arr[1]) setDLFile(index, 'back',  arr[1]);
    };

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-info-surface)', border: '1px solid var(--border-info)', borderRadius: '8px', padding: '14px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>🪪</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-info)' }}>Driver Licence — Auto-fill</div>
              <div style={{ fontSize: '12px', color: '#0284c7' }}>
                Drop both sides at once — AI reads front &amp; back and pre-fills all fields
              </div>
            </div>
          </div>

          {/* Single unified drop zone */}
          <input id={inputId} type="file" accept="image/*,.pdf,application/pdf" multiple style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)} />
          <div
            onClick={() => document.getElementById(inputId)?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDlDragging(p => ({ ...p, [`${index}-zone`]: true })); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDlDragging(p => ({ ...p, [`${index}-zone`]: true })); }}
            onDragLeave={(e) => { e.stopPropagation(); setDlDragging(p => ({ ...p, [`${index}-zone`]: false })); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              setDlDragging(p => ({ ...p, [`${index}-zone`]: false }));
              handleFiles(e.dataTransfer.files);
            }}
            style={{
              padding: fileCount > 0 ? '10px 12px' : '20px 12px',
              background: isDragging ? '#dbeafe' : fileCount > 0 ? '#dcfce7' : 'var(--bg-primary)',
              border: `${isDragging ? '2px dashed #3b82f6' : `1px dashed ${fileCount > 0 ? '#86efac' : '#93c5fd'}`}`,
              borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{isDragging ? '📂' : fileCount > 0 ? '✅' : '📷'}</span>
            {fileCount === 0 ? (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Drop licence images here, or click to browse
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Drop both sides at once — JPG, PNG, or PDF accepted
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[['front', files.front], ['back', files.back]].map(([side, file]) => (
                  <div key={side} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px' }}>{file ? '✅' : '⬜'}</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: file ? '#166534' : '#94a3b8' }}>
                        {side === 'front' ? 'Front' : 'Back'}{side === 'front' ? ' *' : ' (optional)'}
                      </div>
                      {file && <div style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>}
                      {!file && (
                        <button type="button" onClick={(e) => {
                          e.stopPropagation();
                          const id = `dl-side-${index}-${side}`;
                          document.getElementById(id)?.click();
                        }} style={{ fontSize: '10px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                          Add separately
                        </button>
                      )}
                      <input id={`dl-side-${index}-${side}`} type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files[0]) setDLFile(index, side, e.target.files[0]); }} />
                    </div>
                    {file && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDLFile(index, side, null); }}
                        style={{ marginLeft: 'auto', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extract button */}
          <button type="button" disabled={!isReady} onClick={() => handleDLExtract(index)}
            style={{ width: '100%', padding: '8px', background: isReady ? '#0369a1' : '#93c5fd', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: isReady ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {dlExtracting[index] ? (
              <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--bg-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Reading licence…</>
            ) : !hasFront
              ? '📷 Upload licence to auto-fill'
              : `✨ Extract & Auto-fill${hasBack ? ' (Front + Back)' : ' (Front only)'}`}
          </button>
        </div>

        {dlExtracted[index]?.success && (
          <div style={{ marginTop: '6px', padding: '8px 12px', background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-success-emphasis)' }}>
            ✓ {dlExtracted[index].fields.length} field{dlExtracted[index].fields.length !== 1 ? 's' : ''} pre-filled from driver licence
          </div>
        )}
        {dlExtracted[index]?.error && (
          <div style={{ marginTop: '6px', padding: '8px 12px', background: 'var(--bg-danger-surface)', border: '1px solid var(--border-danger)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-danger-emphasis)' }}>
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
            abnStatus: '', abnFrom: '', gstRegistered: false, gstDate: '',
            mainBusinessLocation: '',
            assets: [], liabilities: [], eSignature: null, abnVerification: null
          });
        } else {
          newApplicants.push(existing && existing.type === 'Director Guarantor' ? existing : {
            id: i + 1, type: 'Director Guarantor', role, number: applicantNumber,
            firstName: '', middleName: '', lastName: '', dob: '',
            phone: '', email: '', licenceNumber: '',
            address: '', yearsAtCurrentAddress: '', monthsAtCurrentAddress: '',
            addressHistory: [], relationshipToCompany: '',
            numDependants: 0, dependants: [],
            assets: [], liabilities: [], eSignature: null
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
          assets: [], liabilities: [], eSignature: null
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
              <div className="mb-6">
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>Company Details</h4>

                {/* ── ABN with Verify ── */}
                <div className="mb-4">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ABN
                    {abnLookup[index]?.result && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: abnLookup[index].result.status === 'Active' ? '#16a34a' : '#dc2626', padding: '1px 8px', borderRadius: '10px', background: abnLookup[index].result.status === 'Active' ? '#dcfce7' : '#fee2e2' }}>
                        {abnLookup[index].result.status === 'Active' ? '✓ Active' : '✗ ' + abnLookup[index].result.status}
                      </span>
                    )}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={applicant.companyABN || ''} placeholder="12 345 678 901"
                      style={{ flex: 1 }}
                      onChange={(e) => updateApplicant(index, 'companyABN', e.target.value)}
                      onBlur={(e) => (e.target.value.replace(/\D/g,'').length === 11) && lookupCompanyABN(index, e.target.value)} />
                    <button type="button"
                      disabled={abnLookup[index]?.loading}
                      onClick={() => lookupCompanyABN(index, applicant.companyABN)}
                      style={{ padding: '0 16px', background: 'var(--color-gold)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: abnLookup[index]?.loading ? 0.6 : 1 }}>
                      {abnLookup[index]?.loading ? '…' : '🔍 Verify ABN'}
                    </button>
                  </div>
                  {abnLookup[index]?.error && (
                    <div style={{ fontSize: '11px', color: 'var(--text-danger-emphasis)', marginTop: '4px' }}>⚠ {abnLookup[index].error}</div>
                  )}
                  {abnLookup[index]?.result && (
                    <div style={{ fontSize: '11px', color: 'var(--text-success-emphasis)', marginTop: '4px', padding: '6px 10px', background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '6px' }}>
                      ✓ Verified: <strong>{abnLookup[index].result.entityName}</strong>
                      {abnLookup[index].result.tradingNames?.[0] ? ` (${abnLookup[index].result.tradingNames[0]})` : ''}
                      {' — fields auto-filled below'}
                    </div>
                  )}
                </div>

                {/* ── ACN + Entity Type + Main Business Location ── */}
                <div className="grid grid-cols-3 mb-4">
                  <div>
                    <label>ACN <span style={{ fontWeight: '400', color: 'var(--text-tertiary)', fontSize: '11px' }}>(auto-filled)</span></label>
                    <input type="text" value={applicant.companyACN || ''} placeholder="123 456 789"
                      onChange={(e) => updateApplicant(index, 'companyACN', e.target.value)} />
                  </div>
                  <div>
                    <label>Entity Type <span style={{ fontWeight: '400', color: 'var(--text-tertiary)', fontSize: '11px' }}>(auto-filled)</span></label>
                    <select value={applicant.entityType || ''} onChange={(e) => updateApplicant(index, 'entityType', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Company">Company</option>
                      <option value="Trust">Trust</option>
                      <option value="Sole Trader">Sole Trader</option>
                      <option value="Partnership">Partnership</option>
                      <option value="SMSF">SMSF</option>
                    </select>
                  </div>
                  <div>
                    <label>Main Business Location <span style={{ fontWeight: '400', color: 'var(--text-tertiary)', fontSize: '11px' }}>(auto-filled)</span></label>
                    <input type="text" value={applicant.mainBusinessLocation || ''} placeholder="NSW 2000"
                      onChange={(e) => updateApplicant(index, 'mainBusinessLocation', e.target.value)} />
                  </div>
                </div>

                {/* ── ABN & GST Registration ── */}
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>ABN &amp; GST Registration</p>
                  <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px' }}>ABN Status</label>
                      <input type="text" value={applicant.abnStatus || ''} placeholder="Active / Cancelled"
                        onChange={(e) => updateApplicant(index, 'abnStatus', e.target.value)}
                        style={{ background: applicant.abnStatus ? '#f0fdf4' : undefined, color: applicant.abnStatus === 'Active' ? '#16a34a' : undefined, fontWeight: applicant.abnStatus ? '600' : undefined }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px' }}>ABN Registered From</label>
                      <input type="text" value={applicant.abnFrom || ''} placeholder="YYYY-MM-DD"
                        onChange={(e) => updateApplicant(index, 'abnFrom', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px' }}>GST Status</label>
                      <input type="text" value={applicant.gstRegistered ? 'Registered' : (applicant.abnStatus ? 'Not Registered' : '')}
                        readOnly
                        style={{ background: 'var(--bg-secondary)', color: applicant.gstRegistered ? '#16a34a' : '#6b7280', fontWeight: '600', cursor: 'default' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px' }}>GST Registered From</label>
                      <input type="text" value={applicant.gstDate || ''} placeholder="YYYY-MM-DD (if applicable)"
                        onChange={(e) => updateApplicant(index, 'gstDate', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* ── Company Name + Trading Name ── */}
                <div className="mb-4">
                  <label>Company / Entity Name *</label>
                  <input type="text" value={applicant.companyName || ''} placeholder="XYZ Pty Ltd"
                    onChange={(e) => updateApplicant(index, 'companyName', e.target.value)} />
                </div>
                <div className="mb-4">
                  <label>Trading Name <span style={{ fontWeight: '400', color: 'var(--text-tertiary)' }}>(if different)</span></label>
                  <input type="text" value={applicant.tradingName || ''} placeholder="Trading name (optional)"
                    onChange={(e) => updateApplicant(index, 'tradingName', e.target.value)} />
                </div>

                {/* ── Registered Address ── */}
                <div className="mb-4">
                  <label>Registered Address</label>
                  <input type="text" value={applicant.registeredAddress || ''} placeholder="Registered business address"
                    onChange={(e) => updateApplicant(index, 'registeredAddress', e.target.value)} />
                </div>

                {/* ── Contact ── */}
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
              {renderDLUpload(applicant, index)}
              {renderESignatureSection(applicant, index)}

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
              {renderDLUpload(applicant, index)}
              {renderESignatureSection(applicant, index)}

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
