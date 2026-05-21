import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const stepVariants = {
  enter:  (dir) => ({ opacity: 0, x: dir * 30 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir) => ({ opacity: 0, x: dir * -20 }),
};
import './styles.css';
import { getBrokerEmail } from './utils';
import Step0LoanStrategy from './Step0-LoanStrategy-Polished';
import Step1Applicants from './Step1-Applicants-Polished';
import Step2Employment from './Step2-Employment-Polished';
import Step3AssetsLiabilities from './Step3-AssetsLiabilities-Polished';
import Step4Review from './Step4-Review-Polished';

// Safely sets a value at a nested path like "applicants[0].firstName"
function deepSet(obj, [key, ...rest], value) {
  if (key === undefined) return value;
  const idx = parseInt(key, 10);
  if (!isNaN(idx) && isFinite(idx)) {
    if (!Array.isArray(obj)) return obj;
    if (idx >= obj.length) return obj;  // don't create new array items
    const arr = [...obj];
    arr[idx] = deepSet(arr[idx], rest, value);
    return arr;
  }
  if (typeof obj !== 'object' || obj === null) return obj;
  return { ...obj, [key]: deepSet(obj[key] ?? {}, rest, value) };
}

function SectionCountChip({ currentStep, formData }) {
  const messages = [
    `${formData.securities.length} securit${formData.securities.length === 1 ? 'y' : 'ies'} to configure`,
    `${formData.applicants.length} applicant${formData.applicants.length !== 1 ? 's' : ''} to complete`,
    `${formData.applicants.length} applicant${formData.applicants.length !== 1 ? 's' : ''} to complete`,
    'Assets & liabilities to record',
    'Ready to review & submit',
  ];
  return (
    <span className="sc-section-chip">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      {messages[currentStep]}
    </span>
  );
}

const FactFindApp = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 0 - Loan Strategy
    applicantType: 'Natural Person',
    brokerName: '',
    brokerEmail: '',
    clientType: '',
    leadSource: '',
    numApplicants: 1,
    numGuarantors: 0,
    securities: [{
      id: 1,
      address: '',
      propertyValue: '',
      loanAmount: '',
      lvr: '',
      primaryTransactionTypes: [],
      secondaryTransactionTypes: [],
      intendedOccupancy: '',
      applicationType: '',
      loanTerm: '',
      loanType: '',
      repaymentType: '',
      interestOnlyPeriod: '',
      fixedRatePeriod: '',
      split1Amount: '',
      split1Type: '',
      split1RateType: '',
      split1FixedYears: '',
      split1IOYears: '',
      split2Amount: '',
      split2Type: '',
      split2RateType: '',
      split2FixedYears: '',
      split2IOYears: '',
      currentLoanBalance: '',
      cashoutAmount: '',
      purchaseCompletionMethods: [],
      state: '', isFirstHomeBuyer: false, isNewHome: false,
      purchaseCompletionAmounts: {}, purchaseCompletionOther: '',
      equityPropertyIndex: '', giftRelationship: '',
      hasOffset: false,
      hasRedraw: false
    }],
    lenderPreference: [],
    lenderPreferenceOtherNote: '',
    priority: 'Medium',
    brokerNotes: '',
    
    // Step 1 - Applicants
    applicants: [],
    
    // Step 2 - Employment
    employment: [],
    
    // Step 3 - Assets & Liabilities
    assets: {
      realProperty: [],
      savings: [],
      superannuation: [],
      shares: [],
      vehicles: []
    },
    liabilities: {
      creditCards: [],
      personalLoans: [],
      hecs: [],
      otherLiabilities: []
    },
    
    // Metadata
    submittedAt: null,
    submittedBy: ''
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('hof-theme') || 'light');
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hof-theme', theme);
  }, [theme]);

  // Seed applicants immediately when count/type changes so Step 0 ownership is live
  useEffect(() => {
    setFormData(prev => {
      const { numApplicants, numGuarantors, applicantType, applicants } = prev;
      const total = numApplicants + numGuarantors;
      const next = [];
      for (let i = 0; i < total; i++) {
        const isApp = i < numApplicants;
        const num   = isApp ? i + 1 : i - numApplicants + 1;
        const role  = isApp ? 'Applicant' : 'Guarantor';
        const exist = (applicants || []).find(a => a.id === i + 1);
        if (applicantType === 'Company') {
          if (isApp) {
            next.push(exist?.type === 'Company Borrower' ? exist : {
              id: i + 1, type: 'Company Borrower', role, number: num,
              companyName: '', tradingName: '', companyABN: '', companyACN: '',
              entityType: '', registeredAddress: '', phone: '', email: '',
              abnStatus: '', abnFrom: '', gstRegistered: false, gstDate: '',
              mainBusinessLocation: '', assets: [], liabilities: [], eSignature: null, abnVerification: null,
            });
          } else {
            next.push(exist?.type === 'Director Guarantor' ? exist : {
              id: i + 1, type: 'Director Guarantor', role, number: num,
              firstName: '', middleName: '', lastName: '', dob: '',
              phone: '', email: '', licenceNumber: '',
              address: '', yearsAtCurrentAddress: '', monthsAtCurrentAddress: '',
              addressHistory: [], relationshipToCompany: '',
              numDependants: 0, dependants: [], assets: [], liabilities: [], eSignature: null,
            });
          }
        } else {
          next.push(exist?.type === 'Natural Person' ? exist : {
            id: i + 1, type: 'Natural Person', role, number: num,
            firstName: '', middleName: '', lastName: '', dob: '',
            phone: '', email: '', licenceNumber: '',
            address: '', yearsAtCurrentAddress: '', monthsAtCurrentAddress: '',
            addressHistory: [], gender: '', maritalStatus: '',
            residencyStatus: '', visaNumber: '',
            relationshipToApplicant1: i === 0 ? 'Primary' : '',
            numDependants: 0, dependants: [], assets: [], liabilities: [], eSignature: null,
          });
        }
      }
      return { ...prev, applicants: next };
    });
  }, [formData.numApplicants, formData.numGuarantors, formData.applicantType]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const steps = [
    { id: 0, name: 'Loan Strategy',        subtitle: 'Set up securities, transaction types, loan structure, and lender preference.' },
    { id: 1, name: 'Applicants',           subtitle: 'Capture identity, contact details, and driver\'s licence for each applicant.' },
    { id: 2, name: 'Employment',           subtitle: 'Capture current and previous employment details for all applicants.' },
    { id: 3, name: 'Assets & Liabilities', subtitle: 'Record all assets, savings, superannuation, and outstanding liabilities.' },
    { id: 4, name: 'Review & Submit',      subtitle: 'Review the completed fact find and submit to the processing team.' },
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  // ── Submission state ──────────────────────────────────────────────────────
  // status: 'idle' | 'checking' | 'duplicate' | 'submitting' | 'success' | 'error'
  const [submission, setSubmission] = useState({
    status: 'idle',
    message: '',
    mercuryUrl: '',
    notionUrl: '',
    notionTitle: '',
    duplicates: [],
  });

  const doSubmit = useCallback(async () => {
    setSubmission(s => ({ ...s, status: 'submitting', message: '' }));
    try {
      const submissionData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        submittedBy: formData.brokerEmail,
      };
      const res  = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', formData: submissionData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubmission({ status: 'success', message: '', mercuryUrl: data.mercuryUrl, notionUrl: data.notionUrl, notionTitle: data.title, duplicates: [] });
    } catch (err) {
      setSubmission(s => ({ ...s, status: 'error', message: err.message }));
    }
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    setSubmission(s => ({ ...s, status: 'checking', message: '' }));
    try {
      const res  = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', formData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.exists) {
        // Duplicates found — ask broker what to do
        setSubmission(s => ({ ...s, status: 'duplicate', duplicates: data.matches, message: '' }));
      } else {
        // No duplicates — submit immediately
        await doSubmit();
      }
    } catch (err) {
      setSubmission(s => ({ ...s, status: 'error', message: err.message }));
    }
  }, [formData, doSubmit]);

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (stepIndex) => {
    setDirection(stepIndex > currentStep ? 1 : -1);
    setCurrentStep(stepIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <Step0LoanStrategy formData={formData} updateFormData={updateFormData} />;
      case 1:
        return <Step1Applicants formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <Step2Employment formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <Step3AssetsLiabilities formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <Step4Review formData={formData} updateFormData={updateFormData} onSubmit={handleSubmit} submission={submission} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>

      {/* ── App Header ───────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="container">
          <div className="app-logo">
            <div className="app-logo-mark">HOF</div>
            <span className="app-logo-text">
              HOUSE <span>OF</span> FINANCE
            </span>
          </div>
          <div className="app-header-meta">
            <a
              href="https://hof-hub.vercel.app"
              style={{ fontSize: '0.8125rem', color: 'rgba(203,178,107,0.75)', textDecoration: 'none', marginRight: '0.75rem' }}
            >
              ← Staff Portal
            </a>
            <span className="app-header-tagline">Broker Fact Find</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Step Progress Strip ───────────────────────────────────────────── */}
      <div className="app-step-strip">
        <div className="container">
          <div className="app-steps-row">
            {steps.map((step, index) => {
              const isActive    = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const status      = isCompleted ? 'completed' : isActive ? 'active' : 'pending';
              return (
                <React.Fragment key={step.id}>
                  <button className="app-step-btn" onClick={() => goToStep(step.id)}>
                    <div className={`app-step-circle ${status}`}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className={`app-step-label ${status}`}>{step.name}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`app-step-connector ${isCompleted ? 'completed' : 'pending'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="app-progress-row">
            <div className="app-progress-bar">
              <div
                className="app-progress-fill"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="app-progress-label">
              STEP {currentStep + 1} OF {steps.length} · {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 88px' }}>
        {/* Step page header */}
        <div className="sc-page-header">
          <h2 className="sc-page-title">{steps[currentStep].name}</h2>
          <p className="sc-page-subtitle">{steps[currentStep].subtitle}</p>
          <div className="step-accent-bar" />
          <SectionCountChip currentStep={currentStep} formData={formData} />
        </div>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Sticky Bottom Nav ────────────────────────────────────────────── */}
      <div className="sc-nav">
        <div className="sc-nav-inner">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
            className="btn-secondary"
            style={{ minWidth: '120px' }}
          >
            ← Previous
          </button>
          <span className="sc-nav-count">{currentStep + 1} / {steps.length}</span>
          {currentStep < steps.length - 1 ? (
            <button onClick={goToNextStep} className="btn-primary" style={{ minWidth: '120px' }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-success">
              Submit →
            </button>
          )}
        </div>
      </div>

      {/* ── Submission Overlays ───────────────────────────────────────────── */}

      {/* Success */}
      <AnimatePresence>
      {submission.status === 'success' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'var(--color-success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-success)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', margin: '0 0 10px' }}>Submitted Successfully!</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{submission.notionTitle}</strong> has been created in Mercury as a new lead. Teams has been notified.
            </p>
            <a href={submission.mercuryUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', borderRadius: '8px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textDecoration: 'none', textTransform: 'uppercase', marginBottom: '12px' }}>
              Open in Mercury →
            </a>
            {submission.notionUrl && (
              <>
                <br />
                <a href={submission.notionUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                  View Notion backup →
                </a>
              </>
            )}
            <br />
            <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
              style={{ marginTop: '8px', padding: '10px 20px', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Duplicate */}
      <AnimatePresence>
      {submission.status === 'duplicate' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '36px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--color-warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--color-warning)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--color-warning-dark)', margin: '0 0 8px', textAlign: 'center' }}>Existing Record Found</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px', textAlign: 'center' }}>
              The following pipeline {submission.duplicates.length === 1 ? 'entry matches' : 'entries match'} this applicant name:
            </p>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {submission.duplicates.map(d => (
                <div key={d.id} style={{ padding: '12px 14px', background: 'var(--color-warning-light)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{d.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-warning-dark)' }}>{d.status}</div>
                  </div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    View →
                  </a>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', textAlign: 'center' }}>
              Would you like to submit anyway, or cancel to review?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
                style={{ flex: 1, padding: '11px', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                Cancel — Review
              </button>
              <button onClick={doSubmit}
                style={{ flex: 1, padding: '11px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.04em' }}>
                Create Anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>


      {/* Error */}
      <AnimatePresence>
      {submission.status === 'error' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '36px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--color-danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--color-danger)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--color-danger)', margin: '0 0 8px' }}>Submission Failed</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>An error occurred during submission:</p>
            <p style={{ fontSize: '12px', color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '10px', borderRadius: '6px', margin: '0 0 24px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {submission.message}
            </p>
            <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
              style={{ padding: '11px 28px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Close &amp; Try Again
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
};

export default FactFindApp;
