import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';
import Step0LoanStrategy from './steps/Step0-LoanStrategy';
import Step1Applicants from './steps/Step1-Applicants';
import Step2Employment from './steps/Step2-Employment';
import Step3AssetsLiabilities from './steps/Step3-AssetsLiabilities';
import Step4Review from './steps/Step4-Review';
import WelcomeScreen from './pages/WelcomeScreen';
import QuickFactFind from './pages/QuickFactFind';
import Dashboard from './pages/Dashboard';
import ComplianceChecklist from './pages/ComplianceChecklist';
import { getStoredUser, ROLE_LABELS } from './lib/utils';

const stepVariants = {
  enter:  (dir) => ({ opacity: 0, x: dir * 30 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir) => ({ opacity: 0, x: dir * -20 }),
};

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
  const storedUser  = getStoredUser();
  const brokerEmail = storedUser?.email || '';
  const brokerName  = storedUser?.name  || '';

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

  const [screen, setScreen] = useState('dashboard'); // 'dashboard' | 'full' | 'quick' | 'compliance'
  const [complianceTarget, setComplianceTarget] = useState(null); // { id, item } for QA screen
  const [activeUser, setActiveUser] = useState(getStoredUser);
  const [theme, setTheme] = useState(() => localStorage.getItem('hof-theme') || 'light');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [direction, setDirection] = useState(1);
  const [factFindId, setFactFindId] = useState(() => sessionStorage.getItem('hof_ff_id') || null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const saveTimerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hof-theme', theme);
  }, [theme]);

  // Auto-save draft to Supabase (debounced 2s after any formData change)
  useEffect(() => {
    if (screen !== 'full') return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/fact-finds', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', brokerEmail, id: factFindId, formData }),
        });
        const data = await res.json();
        if (data.id && data.id !== factFindId) {
          setFactFindId(data.id);
          sessionStorage.setItem('hof_ff_id', data.id);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch {
        setSaveStatus('idle');
      }
    }, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [formData, screen]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // status: 'idle' | 'submitting' | 'success' | 'error'
  const [submission, setSubmission] = useState({
    status: 'idle',
    message: '',
    mercuryUrl: '',
    title: '',
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
        body: JSON.stringify({ action: 'internal-submit', formData: submissionData, factFindId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubmission({ status: 'success', message: '', title: data.title });
    } catch (err) {
      setSubmission(s => ({ ...s, status: 'error', message: err.message }));
    }
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    await doSubmit();
  }, [doSubmit]);

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

  const handleBackToStart = () => {
    if (window.confirm('Return to dashboard? Your draft has been auto-saved.')) {
      // Restore admin session if we were editing a fact find as a broker
      const adminRestore = localStorage.getItem('hof_admin_restore');
      if (adminRestore) {
        try {
          const admin = JSON.parse(adminRestore);
          localStorage.setItem('hof_user', adminRestore);
          localStorage.removeItem('hof_admin_restore');
          setActiveUser(admin);
        } catch { /* ignore */ }
      }
      setScreen('dashboard');
      setCurrentStep(0);
    }
  };

  const renderSidebar = () => (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-label">
          {screen === 'quick' ? 'Quick Fact Find' : 'Full Fact Find'}
        </div>
      </div>

      <div className="sidebar-steps">
        {steps.map((step, index) => {
          const isActive    = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const status      = isCompleted ? 'completed' : isActive ? 'active' : 'pending';
          const isLast      = index === steps.length - 1;
          return (
            <React.Fragment key={step.id}>
              <button
                className="sidebar-step"
                onClick={() => goToStep(step.id)}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
              >
                <div className="sidebar-step-track">
                  <div className={`sidebar-dot ${status}`}>
                    {isCompleted ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : index + 1}
                  </div>
                  {!isLast && (
                    <div className={`sidebar-connector ${isCompleted ? 'completed' : 'pending'}`} />
                  )}
                </div>
                <div className="sidebar-step-info">
                  <div className={`sidebar-step-name ${status}`}>{step.name}</div>
                  <div className={`sidebar-step-sub ${status}`}>
                    {isCompleted ? 'Complete' : isActive ? 'In progress' : ''}
                  </div>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-progress-bar">
          <div
            className="sidebar-progress-fill"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        {saveStatus !== 'idle' && (
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', textAlign: 'center' }}>
            {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
          </div>
        )}
      </div>
    </nav>
  );

  const handleNewFactFind = () => {
    const b = getStoredUser();
    setFormData(prev => ({
      ...prev,
      brokerName: b?.name  || '',
      brokerEmail: b?.email || '',
      clientType: '', leadSource: '', numApplicants: 1, numGuarantors: 0,
      securities: [{ id: 1, address: '', propertyValue: '', loanAmount: '', lvr: '', primaryTransactionTypes: [], secondaryTransactionTypes: [], intendedOccupancy: '', applicationType: '', loanTerm: '', loanType: '', repaymentType: '', interestOnlyPeriod: '', fixedRatePeriod: '', split1Amount: '', split1Type: '', split1RateType: '', split1FixedYears: '', split1IOYears: '', split2Amount: '', split2Type: '', split2RateType: '', split2FixedYears: '', split2IOYears: '', currentLoanBalance: '', cashoutAmount: '', purchaseCompletionMethods: [], state: '', isFirstHomeBuyer: false, isNewHome: false, purchaseCompletionAmounts: {}, purchaseCompletionOther: '', equityPropertyIndex: '', giftRelationship: '', hasOffset: false, hasRedraw: false }],
      lenderPreference: [], lenderPreferenceOtherNote: '', priority: 'Medium', brokerNotes: '',
      applicants: [], employment: [],
      assets: { realProperty: [], savings: [], superannuation: [], shares: [], vehicles: [] },
      liabilities: { creditCards: [], personalLoans: [], hecs: [], otherLiabilities: [] },
      submittedAt: null, submittedBy: '',
    }));
    setFactFindId(null);
    sessionStorage.removeItem('hof_ff_id');
    setCurrentStep(0);
    setScreen('full');
  };

  const handleNewQuickFactFind = () => {
    const b = getStoredUser();
    setFormData(prev => ({
      ...prev,
      brokerName: b?.name  || '',
      brokerEmail: b?.email || '',
    }));
    setScreen('quick');
  };

  const handleResume = (savedFormData, id, asUser) => {
    if (asUser) {
      // Admin editing as broker — save admin session for restoration on back
      localStorage.setItem('hof_admin_restore', JSON.stringify(activeUser));
      localStorage.setItem('hof_user', JSON.stringify(asUser));
      setActiveUser(asUser);
    }
    setFormData(savedFormData);
    setFactFindId(id);
    sessionStorage.setItem('hof_ff_id', id);
    setCurrentStep(0);
    setScreen('full');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>

      {/* ── App Header ───────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="container">
          <a href="https://hof-hub.vercel.app" className="app-logo" style={{ textDecoration: 'none' }}>
            <div className="app-logo-mark">HOF</div>
            <span className="app-logo-text">
              HOUSE <span>OF</span> FINANCE
            </span>
          </a>
          <div className="app-header-meta">
            <a
              href="https://hof-hub.vercel.app"
              style={{ fontSize: '0.8125rem', color: 'rgba(203,178,107,0.75)', textDecoration: 'none', marginRight: '0.75rem' }}
            >
              ← Staff Portal
            </a>
            {screen !== 'dashboard' && screen !== 'compliance' && (
              <button
                onClick={handleBackToStart}
                style={{ fontSize: '0.8125rem', color: 'rgba(203,178,107,0.75)', background: 'none', border: '1px solid rgba(203,178,107,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', marginRight: '0.75rem' }}
              >
                ← My Fact Finds
              </button>
            )}
            <span className="app-header-tagline">Broker Fact Find</span>
            {activeUser && (
              <>
                <span style={{ fontSize: '0.8125rem', color: 'rgba(245,244,242,0.7)' }}>
                  {activeUser.name} · <span style={{ color: 'rgba(203,178,107,0.8)' }}>{ROLE_LABELS[activeUser.role] || activeUser.role}</span>
                </span>
                {screen === 'dashboard' && (
                  <button
                    onClick={() => { setShowChangePwd(true); setPwdCurrent(''); setPwdNew(''); setPwdConfirm(''); setPwdError(''); setPwdSuccess(false); }}
                    style={{ fontSize: '0.75rem', color: 'rgba(203,178,107,0.7)', background: 'none', border: '1px solid rgba(203,178,107,0.25)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Change password
                  </button>
                )}
                <button
                  onClick={() => {
                    localStorage.removeItem('hof_user');
                    localStorage.removeItem('hof_admin_restore');
                    sessionStorage.removeItem('hof_ff_id');
                    setActiveUser(null);
                    setScreen('dashboard');
                    setComplianceTarget(null);
                  }}
                  style={{ fontSize: '0.75rem', color: 'rgba(245,244,242,0.45)', background: 'none', border: '1px solid rgba(245,244,242,0.15)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                >
                  Logout
                </button>
              </>
            )}
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

      {/* ── Dashboard ────────────────────────────────────────────────────── */}
      {screen === 'dashboard' && (
        <Dashboard
          onSelectFull={handleNewFactFind}
          onSelectQuick={handleNewQuickFactFind}
          onResume={handleResume}
          onUserChange={setActiveUser}
          onResumeAs={(formData, id, brokerUser) => handleResume(formData, id, brokerUser)}
          onStartQA={async (queueItem) => {
            const res  = await fetch('/api/fact-finds', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get', id: queueItem.id }),
            });
            const data = await res.json();
            setComplianceTarget({ id: queueItem.id, item: data.item || queueItem });
            setScreen('compliance');
          }}
        />
      )}

      {/* ── Full Fact Find ───────────────────────────────────────────────── */}
      {screen === 'full' && (
        <div className="app-layout">
          {renderSidebar()}
          <div className="main-content">
            <div style={{ padding: '28px 32px 88px' }}>
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

            {/* Sticky Bottom Nav */}
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
          </div>
        </div>
      )}

      {/* ── Quick Fact Find ─────────────────────────────────────────────────── */}
      {screen === 'quick' && (
        <div className="quick-ff-page">
          <QuickFactFind onBack={() => setScreen('dashboard')} />
        </div>
      )}

      {/* ── Compliance QA Checklist ──────────────────────────────────────────── */}
      {screen === 'compliance' && complianceTarget && (
        <ComplianceChecklist
          factFindId={complianceTarget.id}
          factFind={complianceTarget.item}
          onBack={() => { setScreen('dashboard'); setComplianceTarget(null); }}
          onComplete={() => { setScreen('dashboard'); setComplianceTarget(null); }}
        />
      )}

      {/* ── Submission Overlays (shown regardless of screen) ────────────── */}

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
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', margin: '0 0 10px' }}>Submitted to Credit Team!</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{submission.title}</strong> has been handed to the credit team. Your analyst will review and be in touch.
            </p>
            <button onClick={() => { setSubmission(s => ({ ...s, status: 'idle' })); setScreen('dashboard'); }}
              style={{ padding: '12px 28px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '12px' }}>
              Back to My Fact Finds
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>



      {/* Change Password Modal */}
      {showChangePwd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowChangePwd(false); }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '14px', padding: '36px', maxWidth: '400px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Change Password</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>Set a new password for {activeUser?.email}</p>
            {pwdSuccess ? (
              <div style={{ padding: '16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#16a34a', fontSize: '13px', textAlign: 'center' }}>
                Password updated successfully.
                <br />
                <button onClick={() => setShowChangePwd(false)} style={{ marginTop: '12px', padding: '8px 20px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setPwdError('');
                if (pwdNew !== pwdConfirm) { setPwdError('New passwords do not match.'); return; }
                if (pwdNew.length < 6) { setPwdError('New password must be at least 6 characters.'); return; }
                setPwdSaving(true);
                try {
                  const res = await fetch('/api/auth', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'change-password', email: activeUser?.email, currentPassword: pwdCurrent, newPassword: pwdNew }),
                  });
                  const data = await res.json();
                  if (!res.ok || data.error) { setPwdError(data.error || 'Failed to update password.'); return; }
                  setPwdSuccess(true);
                } catch { setPwdError('An error occurred. Please try again.'); } finally { setPwdSaving(false); }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Current password', value: pwdCurrent, setter: setPwdCurrent },
                  { label: 'New password', value: pwdNew, setter: setPwdNew },
                  { label: 'Confirm new password', value: pwdConfirm, setter: setPwdConfirm },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>{label}</label>
                    <input type="password" value={value} onChange={e => { setter(e.target.value); setPwdError(''); }} required
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />
                  </div>
                ))}
                {pwdError && <div style={{ fontSize: '12px', color: '#dc2626' }}>{pwdError}</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setShowChangePwd(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={pwdSaving}
                    style={{ flex: 1, padding: '10px', background: 'var(--color-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '700', cursor: pwdSaving ? 'not-allowed' : 'pointer', opacity: pwdSaving ? 0.7 : 1 }}>
                    {pwdSaving ? 'Saving…' : 'Update password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
