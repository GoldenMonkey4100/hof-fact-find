import React, { useState, useCallback, useEffect } from 'react';
import './styles.css';
import { getBrokerEmail } from './utils';
import Step0LoanStrategy from './Step0-LoanStrategy-Polished';
import Step1Applicants from './Step1-Applicants-Polished';
import Step2Employment from './Step2-Employment-Polished';
import Step3AssetsLiabilities from './Step3-AssetsLiabilities-Polished';
import Step4Review from './Step4-Review-Polished';
import VoiceBar from './VoiceBar';

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
    { id: 0, name: 'Loan Strategy' },
    { id: 1, name: 'Applicants' },
    { id: 2, name: 'Employment' },
    { id: 3, name: 'Assets & Liabilities' },
    { id: 4, name: 'Review & Submit' }
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldsExtracted = useCallback((fields) => {
    setFormData(prev => {
      let next = { ...prev };
      for (const [path, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === '') continue;
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        next = deepSet(next, parts, value);
      }
      return next;
    });
  }, []);

  // ── Submission state ──────────────────────────────────────────────────────
  // status: 'idle' | 'checking' | 'duplicate' | 'submitting' | 'success' | 'error'
  const [submission, setSubmission] = useState({
    status: 'idle',
    message: '',
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
      const res  = await fetch('/api/notion-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', formData: submissionData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubmission({ status: 'success', message: '', notionUrl: data.pageUrl, notionTitle: data.title, duplicates: [] });
    } catch (err) {
      setSubmission(s => ({ ...s, status: 'error', message: err.message }));
    }
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    setSubmission(s => ({ ...s, status: 'checking', message: '' }));
    try {
      const res  = await fetch('/api/notion-submit', {
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
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (stepIndex) => {
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
            <span style={{ display: 'none' }} className="app-header-tagline">Broker Fact Find</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
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
          <div className="app-progress-bar">
            <div
              className="app-progress-fill"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 88px' }}>
        {/* Step page header */}
        <div className="sc-page-header">
          <h2 className="sc-page-title">{steps[currentStep].name}</h2>
          <div className="step-accent-bar" />
        </div>
        {renderStepContent()}
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
      {submission.status === 'success' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', margin: '0 0 10px' }}>Submitted Successfully!</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{submission.notionTitle}</strong> has been added to the Pipeline as <strong>Pending Assignment</strong>.
            </p>
            <a href={submission.notionUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', borderRadius: '8px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textDecoration: 'none', textTransform: 'uppercase', marginBottom: '12px' }}>
              Open in Notion →
            </a>
            <br />
            <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
              style={{ marginTop: '8px', padding: '10px 20px', background: 'none', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Duplicate */}
      {submission.status === 'duplicate' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '36px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', textAlign: 'center' }}>⚠️</div>
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
              Would you like to create a new page anyway, or cancel to review?
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
          </div>
        </div>
      )}

      {/* Voice Bar */}
      <VoiceBar currentStep={currentStep} onFieldsExtracted={handleFieldsExtracted} />

      {/* Error */}
      {submission.status === 'error' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '36px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--color-danger)', margin: '0 0 8px' }}>Submission Failed</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>An error occurred while submitting to Notion:</p>
            <p style={{ fontSize: '12px', color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '10px', borderRadius: '6px', margin: '0 0 24px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {submission.message}
            </p>
            <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
              style={{ padding: '11px 28px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Close &amp; Try Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FactFindApp;
