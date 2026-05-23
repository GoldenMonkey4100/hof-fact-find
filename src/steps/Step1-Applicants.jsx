import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles.css';

const subStepVariants = {
  enter:  (dir) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir) => ({ opacity: 0, x: dir * -16 }),
};
import AddressAutocomplete from '../components/AddressAutocomplete';
import SmartCard from '../components/SmartCard';

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

// ── Sub-step bar (mirrors Step 0) ─────────────────────────────────────────────
const SubStepBar = ({ step, labels, onGoTo }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
    {labels.map((label, i) => {
      const n = i + 1; const done = n < step; const active = n === step;
      return (
        <React.Fragment key={n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: done ? 'pointer' : 'default' }}
            onClick={() => done && onGoTo(n)}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', background: done ? '#10b981' : active ? 'var(--color-primary)' : 'var(--bg-secondary)', color: done || active ? 'white' : 'var(--text-tertiary)', border: done ? '2px solid #10b981' : active ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)' }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontSize: '11px', fontWeight: active ? '600' : '400', color: active ? 'var(--color-primary)' : done ? '#10b981' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: done ? '#10b981' : 'var(--border-primary)', margin: '0 8px', marginBottom: '14px', transition: 'background 0.2s' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

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

  // Sub-step tracking per applicant id
  const [applicantStep, setApplicantStep] = useState({});
  const [applicantDir, setApplicantDir] = useState({});
  const getStep   = (id) => applicantStep[id] || 1;
  const goToStep  = (id, n) => {
    setApplicantDir(prev => ({ ...prev, [id]: n > (applicantStep[id] || 1) ? 1 : -1 }));
    setApplicantStep(p => ({ ...p, [id]: n }));
  };

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
    const iconEl = isSigned
      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      : isDeclined
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        : isPending
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>;

    return (
      <div style={{ marginBottom: '12px', padding: '14px 16px', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: isSigned ? 'var(--color-success)' : isDeclined ? 'var(--color-danger)' : isPending ? '#0369a1' : 'var(--text-tertiary)', flexShrink: 0 }}>{iconEl}</span>
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {error}
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
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(3,105,161,0.10)', border: '1px solid rgba(3,105,161,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0369a1' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="17" y2="15"/></svg>
            </div>
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
            <div style={{ width: '42px', height: '42px', borderRadius: '9px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDragging ? 'rgba(59,130,246,0.10)' : fileCount > 0 ? 'rgba(16,185,129,0.10)' : 'var(--color-gold-light)',
              border: `1px solid ${isDragging ? 'rgba(59,130,246,0.30)' : fileCount > 0 ? 'rgba(16,185,129,0.30)' : 'var(--color-gold-border)'}`,
              color: isDragging ? '#3b82f6' : fileCount > 0 ? 'var(--color-success)' : 'var(--color-gold)',
            }}>
              {isDragging
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                : fileCount > 0
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              }
            </div>
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
                    <span style={{ display: 'flex', color: file ? 'var(--color-success)' : 'var(--text-tertiary)', flexShrink: 0 }}>
                      {file
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      }
                    </span>
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
            {dlExtracting[index]
              ? <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--bg-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Reading licence…</>
              : !hasFront
                ? 'Upload licence to auto-fill'
                : `Extract & Auto-fill${hasBack ? ' (Front + Back)' : ' (Front only)'}`
            }
          </button>
        </div>

        {dlExtracted[index]?.success && (
          <div style={{ marginTop: '6px', padding: '8px 12px', background: 'var(--bg-success-surface)', border: '1px solid var(--border-success)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-success-emphasis)' }}>
            ✓ {dlExtracted[index].fields.length} field{dlExtracted[index].fields.length !== 1 ? 's' : ''} pre-filled from driver licence
          </div>
        )}
        {dlExtracted[index]?.error && (
          <div style={{ marginTop: '6px', padding: '8px 12px', background: 'var(--bg-danger-surface)', border: '1px solid var(--border-danger)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-danger-emphasis)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Could not extract data: {dlExtracted[index].error}
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
  const renderAddressHistory = (applicant, index) => {
    const cy = parseInt(applicant.yearsAtCurrentAddress) || 0;
    const cm = parseInt(applicant.monthsAtCurrentAddress) || 0;
    const hy = (applicant.addressHistory || []).reduce((s, a) => s + (parseInt(a.yearsAtAddress) || 0), 0);
    const hm = (applicant.addressHistory || []).reduce((s, a) => s + (parseInt(a.monthsAtAddress) || 0), 0);
    const totalMonths = cy * 12 + cm + hy * 12 + hm;
    const ty = Math.floor(totalMonths / 12), tm = totalMonths % 12;
    const met = totalMonths >= 36;

    const livingSituationOpts = ['Boarding', 'Own Home – Mortgage', 'Own Home – Unencumbered', 'Renting', 'Other'];

    const updatePrevAddr = (addrIndex, field, val) => {
      const updated = [...applicant.addressHistory];
      updated[addrIndex] = { ...updated[addrIndex], [field]: val };
      updateApplicant(index, 'addressHistory', updated);
    };

    const subLabel = { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' };

    return (
      <div className="mb-4" style={{ border: '1px solid var(--border-primary)', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', color: 'var(--color-gold)', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>3-Year Address History</span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '10px',
              background: met ? '#dcfce7' : '#fef9c3', color: met ? '#15803d' : '#92400e' }}>
              {met ? `✓ ${ty}y ${tm}m` : `⚠ ${ty}y ${tm}m / 3y needed`}
            </span>
          </div>
          <button type="button" onClick={() => {
              updateApplicant(index, 'addressHistory', [
                ...(applicant.addressHistory || []),
                { id: Date.now(), address: '', yearsAtAddress: '', monthsAtAddress: '', livingSituation: '', livingSituationOther: '' }
              ]);
            }}
            style={{ fontSize: '12px', fontWeight: '600', padding: '5px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
            + Add Previous
          </button>
        </div>

        {/* Current address */}
        <div style={{ padding: '14px 16px', borderBottom: (applicant.addressHistory || []).length > 0 ? '1px solid var(--border-primary)' : 'none' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.3px', display: 'inline-block', marginBottom: '8px' }}>CURRENT</span>
          <AddressAutocomplete
            key={`current-addr-${index}-${addrResetKey[index] || 0}`}
            value={applicant.address || ''}
            onChange={(val) => updateApplicant(index, 'address', val)}
            placeholder="Start typing current address…"
            style={{ fontSize: '13px' }}
          />

          {/* Living Situation */}
          <div style={{ marginTop: '10px' }}>
            <label style={subLabel}>Living Situation</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {livingSituationOpts.map(opt => (
                <button key={opt} type="button"
                  className={`pill-btn${applicant.livingSituation === opt ? ' pill-btn--active' : ''}`}
                  onClick={() => updateApplicant(index, 'livingSituation', applicant.livingSituation === opt ? '' : opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Renting expansion — current address only */}
          {applicant.livingSituation === 'Renting' && (
            <div style={{ marginTop: '10px', padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px' }}>🏘</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Rent Share</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={subLabel}>Applicant's Share (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <input type="number" value={applicant.rentShare || ''} placeholder="50" min="1" max="100" style={{ fontSize: '13px' }}
                      onChange={(e) => updateApplicant(index, 'rentShare', e.target.value)} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>%</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>e.g. 2 people on lease → 50%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={subLabel}>Monthly Rent (Total)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>$</span>
                    <input type="number" value={applicant.rentTotal || ''} placeholder="2400" min="0" style={{ fontSize: '13px' }}
                      onChange={(e) => updateApplicant(index, 'rentTotal', e.target.value)} />
                  </div>
                  {applicant.rentShare && applicant.rentTotal && (
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '3px', fontWeight: '600' }}>
                      Applicant pays ${Math.round(parseFloat(applicant.rentTotal) * parseFloat(applicant.rentShare) / 100).toLocaleString()}/mo
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other expansion */}
          {applicant.livingSituation === 'Other' && (
            <div style={{ marginTop: '8px' }}>
              <label style={subLabel}>Please describe</label>
              <input type="text" value={applicant.livingSituationOther || ''} placeholder="e.g. Living with parents…"
                style={{ fontSize: '13px', marginTop: '4px' }}
                onChange={(e) => updateApplicant(index, 'livingSituationOther', e.target.value)} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={subLabel}>Years</label>
              <input type="number" value={applicant.yearsAtCurrentAddress || ''} placeholder="0" min="0" style={{ fontSize: '13px' }}
                onChange={(e) => updateApplicant(index, 'yearsAtCurrentAddress', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={subLabel}>Months</label>
              <input type="number" value={applicant.monthsAtCurrentAddress || ''} placeholder="0" min="0" max="11" style={{ fontSize: '13px' }}
                onChange={(e) => updateApplicant(index, 'monthsAtCurrentAddress', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Previous addresses */}
        {(applicant.addressHistory || []).map((addr, addrIndex) => (
          <div key={addr.id} style={{ padding: '14px 16px', borderBottom: addrIndex < (applicant.addressHistory.length - 1) ? '1px solid var(--border-primary)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                Previous {addrIndex + 1}
              </span>
              <button type="button"
                onClick={() => updateApplicant(index, 'addressHistory', applicant.addressHistory.filter((_, i) => i !== addrIndex))}
                style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                Remove
              </button>
            </div>
            <AddressAutocomplete
              value={addr.address}
              onChange={(val) => updatePrevAddr(addrIndex, 'address', val)}
              placeholder="Start typing previous address…"
              style={{ fontSize: '13px' }}
            />

            {/* Living Situation — previous (no rent fields) */}
            <div style={{ marginTop: '10px' }}>
              <label style={subLabel}>Living Situation</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {livingSituationOpts.map(opt => (
                  <button key={opt} type="button"
                    className={`pill-btn${addr.livingSituation === opt ? ' pill-btn--active' : ''}`}
                    onClick={() => updatePrevAddr(addrIndex, 'livingSituation', addr.livingSituation === opt ? '' : opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Other expansion */}
            {addr.livingSituation === 'Other' && (
              <div style={{ marginTop: '8px' }}>
                <label style={subLabel}>Please describe</label>
                <input type="text" value={addr.livingSituationOther || ''} placeholder="e.g. Living with parents…"
                  style={{ fontSize: '13px', marginTop: '4px' }}
                  onChange={(e) => updatePrevAddr(addrIndex, 'livingSituationOther', e.target.value)} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={subLabel}>Years</label>
                <input type="number" value={addr.yearsAtAddress} placeholder="0" min="0" style={{ fontSize: '13px' }}
                  onChange={(e) => updatePrevAddr(addrIndex, 'yearsAtAddress', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={subLabel}>Months</label>
                <input type="number" value={addr.monthsAtAddress} placeholder="0" min="0" max="11" style={{ fontSize: '13px' }}
                  onChange={(e) => updatePrevAddr(addrIndex, 'monthsAtAddress', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Dependants ──────────────────────────────────────────────────────────────
  const renderDependants = (applicant, index) => (
    <div className="mb-4" style={{ border: '1px solid var(--border-primary)', borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: (parseInt(applicant.numDependants) || 0) > 0 ? '1px solid var(--border-primary)' : 'none' }}>
        <span style={{ fontSize: '15px' }}>👨‍👩‍👧‍👦</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>Dependants</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2, 3, 4, '5+'].map(n => {
            const current = parseInt(applicant.numDependants) || 0;
            const isActive = n === '5+' ? current >= 5 : current === n;
            return (
              <button key={n} type="button"
                className={`pill-btn${isActive ? ' pill-btn--active' : ''}`}
                style={{ padding: '3px 10px', fontSize: '12px' }}
                onClick={() => updateApplicant(index, 'numDependants', n === '5+' ? 5 : n)}>
                {n}
              </button>
            );
          })}
        </div>
      </div>
      {/* Dependant rows */}
      {(applicant.dependants || []).map((dep, depIndex) => (
        <div key={depIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: depIndex < (applicant.dependants.length - 1) ? '1px solid var(--border-primary)' : 'none', background: 'var(--bg-primary)' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', minWidth: '20px' }}>#{depIndex + 1}</span>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Name</label>
            <input type="text" value={dep.name} placeholder="Dependant name" style={{ fontSize: '13px' }}
              onChange={(e) => updateDependant(index, depIndex, 'name', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Age</label>
            <input type="number" value={dep.age} placeholder="0" min="0" max="25" style={{ fontSize: '13px' }}
              onChange={(e) => updateDependant(index, depIndex, 'age', e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Quick Actions strip ─────────────────────────────────────────────────────
  const renderQuickActions = (applicant, index) => {
    const files     = dlFiles[index] || {};
    const hasFront  = !!files.front;
    const hasBack   = !!files.back;
    const extracting = !!dlExtracting[index];
    const extracted  = !!dlExtracted[index]?.success;
    const sig        = applicant.eSignature || {};
    const isSigned   = sig.status === 'signed';
    const isPending  = sig.status === 'pending';
    const isDeclined = sig.status === 'declined';
    const signerName = applicant.type === 'Company Borrower'
      ? applicant.companyName || ''
      : [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
    const canSend = applicant.type === 'Company Borrower'
      ? !!(applicant.companyName && applicant.email)
      : !!(applicant.firstName && applicant.lastName && applicant.email && applicant.phone);
    const inputId = `qa-dl-${index}`;

    const tile = (extra = {}) => ({
      padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-primary)',
      background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '10px',
      ...extra,
    });

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>

        {/* 1 — Driver Licence (Natural Person / Director Guarantor only) */}
        {applicant.type !== 'Company Borrower' && <div style={tile(extracted ? { background: 'var(--bg-success-surface)', borderColor: 'var(--border-success)' } : {})}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'flex', color: extracted ? 'var(--color-success)' : '#0369a1', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="17" y2="15"/></svg>
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>Driver Licence</span>
            {extracted && <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '1px 7px', borderRadius: '10px' }}>✓ DONE</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {hasFront
              ? <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-success)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {files.front.name.length > 20 ? files.front.name.slice(0,20)+'…' : files.front.name}
                  </span>
                  <br />
                  {hasBack
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-success)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        {files.back.name.length > 20 ? files.back.name.slice(0,20)+'…' : files.back.name}
                      </span>
                    : <span style={{ color: 'var(--text-tertiary)' }}>Back (optional)</span>
                  }
                </>
              : 'No files selected'}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input id={inputId} type="file" accept="image/*,.pdf,application/pdf" multiple style={{ display: 'none' }}
              onChange={(e) => { const arr = Array.from(e.target.files); if (arr[0]) setDLFile(index,'front',arr[0]); if (arr[1]) setDLFile(index,'back',arr[1]); }} />
            <label htmlFor={inputId} style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> {hasFront ? 'Replace' : 'Upload'}
            </label>
            <button type="button" disabled={!hasFront || extracting} onClick={() => handleDLExtract(index)}
              style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: hasFront && !extracting ? '#0369a1' : '#e2e8f0', color: hasFront && !extracting ? 'white' : '#9ca3af', border: 'none', borderRadius: '6px', cursor: hasFront && !extracting ? 'pointer' : 'not-allowed' }}>
              {extracting ? '…' : 'Extract'}
            </button>
          </div>
          {dlExtracted[index]?.error && <div style={{ fontSize: '10px', color: 'var(--text-danger-emphasis)' }}>⚠ {dlExtracted[index].error}</div>}
        </div>}

        {/* 2 — E-Signature (Natural Person / Director Guarantor only) */}
        {applicant.type !== 'Company Borrower' && <div style={tile(isSigned ? { background: '#f0fdf4', borderColor: '#86efac' } : isPending ? { background: 'var(--bg-info-surface)', borderColor: 'var(--border-info)' } : isDeclined ? { background: 'var(--bg-danger-surface)', borderColor: 'var(--border-danger)' } : {})}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: isSigned ? 'var(--color-success)' : isPending ? '#0369a1' : isDeclined ? 'var(--color-danger)' : 'var(--text-tertiary)', flexShrink: 0 }}>
              {isSigned
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                : isPending
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  : isDeclined
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
              }
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>Credit Guide</span>
            {isSigned && <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '1px 7px', borderRadius: '10px' }}>SIGNED</span>}
            {isPending && <span style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1', background: '#dbeafe', padding: '1px 7px', borderRadius: '10px' }}>PENDING</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {isSigned   ? `Signed by ${sig.name}`
              : isPending  ? `Sent to ${sig.email}`
              : isDeclined ? `Declined by ${sig.name}`
              : canSend    ? `${signerName} · ${applicant.email}`
              : 'Needs: full name, email & mobile'}
          </div>
          {!isSigned && (
            <button type="button" disabled={(!canSend && !isPending) || !!eSignSending[index]}
              onClick={() => handleSendESign(applicant, index)}
              style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: (!canSend && !isPending) ? '#e2e8f0' : isPending ? 'var(--bg-primary)' : 'var(--color-primary)', color: (!canSend && !isPending) ? '#9ca3af' : isPending ? 'var(--text-primary)' : 'white', border: isPending ? '1px solid var(--border-primary)' : 'none', borderRadius: '6px', cursor: (canSend || isPending) ? 'pointer' : 'not-allowed' }}>
              {eSignSending[index] ? 'Sending…' : isPending ? '↺ Resend' : '✉ Send for Signature'}
            </button>
          )}
          {isSigned && sig.submissionId && (
            <a href={`/api/docuseal-download?submissionId=${sig.submissionId}&type=signed`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: '#16a34a', color: 'white', borderRadius: '6px', textDecoration: 'none', textAlign: 'center' }}>
              ⬇ Download Signed
            </a>
          )}
          {eSignError[index] && <div style={{ fontSize: '10px', color: 'var(--text-danger-emphasis)' }}>⚠ {eSignError[index]}</div>}
        </div>}

        {/* 3 — Equifax */}
        <div style={tile()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'flex', color: '#e8041b', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Equifax</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Credit file check — opens Equifax portal</div>
          <button type="button" onClick={() => window.open('https://vedacheck.com/WorkflowHandler', '_blank')}
            style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: '#e8041b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Open Equifax ↗
          </button>
        </div>

        {/* 4 — illion */}
        <div style={tile()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'flex', color: '#0f5c32', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>illion</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Credit file check — opens illion portal</div>
          <button type="button" onClick={() => window.open('https://illiondirect.com.au/integate/Login.mvc', '_blank')}
            style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', background: '#0f5c32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Open illion ↗
          </button>
        </div>

      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Complete details for {formData.numApplicants} applicant{formData.numApplicants > 1 ? 's' : ''}
          {formData.numGuarantors > 0 && ` and ${formData.numGuarantors} guarantor${formData.numGuarantors > 1 ? 's' : ''}`}
        </p>
      </div>

      {applicants.map((applicant, index) => {
        const step    = getStep(applicant.id);
        const isNP    = applicant.type === 'Natural Person';
        const isDG    = applicant.type === 'Director Guarantor';
        const isCo    = applicant.type === 'Company Borrower';
        const appName = isCo
          ? applicant.companyName
          : [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
        const appSummary = [
          appName,
          isCo ? applicant.entityType : applicant.dob,
          applicant.email,
        ].filter(Boolean).join(' · ') || null;
        const appStatus = appName && applicant.email ? 'done' : appName || applicant.email ? 'partial' : 'empty';

        return (
        <SmartCard
          key={applicant.id}
          icon={applicant.type === 'Company Borrower'
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z"/><path d="M6 12H4a2 2 0 00-2 2v8h4"/><path d="M18 9h2a2 2 0 012 2v11h-4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          }
          title={`${applicant.role} ${applicant.number}${appName ? ` — ${appName}` : ''}`}
          summary={appSummary}
          status={appStatus}
          defaultOpen={!appName}
        >
          {/* Mercury banner — always visible */}
          {renderMercuryBanner(index)}

          {/* Quick Actions strip */}
          {renderQuickActions(applicant, index)}

          {/* Sub-step bar */}
          <SubStepBar
            step={step}
            labels={isCo ? ['ABN & Identity', 'Contact & Reg'] : ['Personal Details', 'Address & Relationship']}
            onGoTo={(n) => goToStep(applicant.id, n)}
          />

          <AnimatePresence mode="wait" custom={applicantDir[applicant.id] || 1}>
            <motion.div
              key={step}
              custom={applicantDir[applicant.id] || 1}
              variants={subStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
          {/* ── Company Borrower — Step 1: ABN & Identity ── */}
          {isCo && step === 1 && (
            <div>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <motion.button type="button" className="btn-primary"
                  onClick={() => goToStep(applicant.id, 2)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '9px 24px', fontSize: '13px' }}>
                  Next: Contact &amp; Reg →
                </motion.button>
              </div>
            </div>
          )}

          {/* ── Company Borrower — Step 2: Contact & Registration ── */}
          {isCo && step === 2 && (
            <div>
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

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                <motion.button type="button"
                  onClick={() => goToStep(applicant.id, 1)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '9px 24px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  ← Back: ABN &amp; Identity
                </motion.button>
              </div>
            </div>
          )}

          {/* ── Natural Person & Director Guarantor — sub-steps ── */}
          {(isNP || isDG) && (
            <>
              {/* Sub-step 1: Identity */}
              {step === 1 && (
                <div>
                  <div className="grid grid-cols-3 mb-4">
                    <div>
                      <label>First Name *</label>
                      <input type="text" value={applicant.firstName || ''} placeholder="John"
                        onChange={(e) => updateApplicant(index, 'firstName', e.target.value)} />
                    </div>
                    <div>
                      <label>Middle Name</label>
                      <input type="text" value={applicant.middleName || ''} placeholder="Optional"
                        onChange={(e) => updateApplicant(index, 'middleName', e.target.value)} />
                    </div>
                    <div>
                      <label>Last Name *</label>
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

                  <div className="mb-4">
                    <label>Email *</label>
                    <input type="email" value={applicant.email || ''} placeholder="john.smith@example.com"
                      onChange={(e) => updateApplicant(index, 'email', e.target.value)}
                      onBlur={(e) => lookupMercury(index, e.target.value, applicant.phone)} />
                  </div>

                  {isDG && (
                    <div className="mb-4">
                      <label>Relationship to Company</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['Director', 'Shareholder', 'Beneficial Owner', 'Trustee', 'Other'].map(opt => (
                          <button key={opt} type="button"
                            className={`pill-btn${applicant.relationshipToCompany === opt ? ' pill-btn--active' : ''}`}
                            onClick={() => updateApplicant(index, 'relationshipToCompany', applicant.relationshipToCompany === opt ? '' : opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isNP && (
                    <div className="mb-4">
                      <label>Gender</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['Male', 'Female'].map(opt => (
                          <button key={opt} type="button"
                            className={`pill-btn${applicant.gender === opt ? ' pill-btn--active' : ''}`}
                            onClick={() => updateApplicant(index, 'gender', applicant.gender === opt ? '' : opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isNP && (
                    <div className="mb-4">
                      <label>Marital Status</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['Single', 'Married', 'De Facto', 'Divorced', 'Widowed'].map(opt => (
                          <button key={opt} type="button"
                            className={`pill-btn${applicant.maritalStatus === opt ? ' pill-btn--active' : ''}`}
                            onClick={() => updateApplicant(index, 'maritalStatus', applicant.maritalStatus === opt ? '' : opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isNP && (
                    <div className="mb-4">
                      <label>Residency Status</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['Australian Citizen', 'Permanent Resident', 'Temporary Visa', 'Other'].map(opt => (
                          <button key={opt} type="button"
                            className={`pill-btn${applicant.residencyStatus === opt ? ' pill-btn--active' : ''}`}
                            onClick={() => updateApplicant(index, 'residencyStatus', applicant.residencyStatus === opt ? '' : opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isNP && applicant.residencyStatus === 'Temporary Visa' && (
                    <div className="mb-4">
                      <label>Visa Number</label>
                      <input type="text" value={applicant.visaNumber || ''} placeholder="Enter visa number"
                        onChange={(e) => updateApplicant(index, 'visaNumber', e.target.value)} />
                    </div>
                  )}

                  {isNP && !shouldShareDependants(index) && renderDependants(applicant, index)}

                  {isNP && shouldShareDependants(index) && (
                    <div className="mb-6">
                      <div style={{ padding: '16px', background: 'var(--color-info-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-info)' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-info-dark)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline', verticalAlign: 'middle', marginRight: '5px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><strong>Shared Dependants:</strong> As the spouse of Applicant 1, dependants are automatically shared and managed in Applicant 1's section.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <motion.button type="button" className="btn-primary"
                      onClick={() => goToStep(applicant.id, 2)}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: '9px 24px', fontSize: '13px' }}>
                      Next: Address →
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Sub-step 2: Address History */}
              {step === 2 && (
                <div>
                  {renderAddressHistory(applicant, index)}

                  {isNP && index > 0 && (
                    <div className="mb-4">
                      <label>Relationship to Applicant 1</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['Spouse', 'De Facto Partner', 'Parent', 'Sibling', 'Child', 'Business Partner', 'Other'].map(opt => (
                          <button key={opt} type="button"
                            className={`pill-btn${applicant.relationshipToApplicant1 === opt ? ' pill-btn--active' : ''}`}
                            onClick={() => updateApplicant(index, 'relationshipToApplicant1', applicant.relationshipToApplicant1 === opt ? '' : opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                    <motion.button type="button"
                      onClick={() => goToStep(applicant.id, 1)}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: '9px 24px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                      ← Back: Personal Details
                    </motion.button>
                  </div>
                </div>
              )}
            </>
          )}
            </motion.div>
          </AnimatePresence>

        </SmartCard>
        );
      })}

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
