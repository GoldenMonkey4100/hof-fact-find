import React, { useState, useCallback } from 'react';
import './styles.css';
import { getBrokerEmail } from './utils';
import Step0LoanStrategy from './Step0-LoanStrategy-Polished';
import Step1Applicants from './Step1-Applicants-Polished';
import Step2Employment from './Step2-Employment-Polished';
import Step3AssetsLiabilities from './Step3-AssetsLiabilities-Polished';
import Step4Review from './Step4-Review-Polished';

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

  const steps = [
    { id: 0, name: 'Loan Strategy', icon: '🏠' },
    { id: 1, name: 'Applicants', icon: '👥' },
    { id: 2, name: 'Employment', icon: '💼' },
    { id: 3, name: 'Assets & Liabilities', icon: '💰' },
    { id: 4, name: 'Review & Submit', icon: '✓' }
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-tertiary)',
      padding: '32px 16px'
    }}>
      <div className="container">
        
        {/* Header Card */}
        <div className="card fade-in" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ 
                fontSize: 'var(--text-3xl)', 
                fontWeight: 'var(--font-semibold)', 
                margin: '0 0 8px 0',
                color: 'var(--text-primary)',
                lineHeight: '1.2'
              }}>
                HOF Broker Fact Find
              </h1>
              <p style={{ 
                fontSize: 'var(--text-base)', 
                color: 'var(--text-secondary)', 
                margin: 0 
              }}>
                Complete all sections to submit to your processing team
              </p>
            </div>
            
            <div className="badge badge-info" style={{ fontSize: 'var(--text-sm)', padding: '8px 16px' }}>
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '24px' }}>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)'
            }}>
              <span>Start</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
            </div>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="card fade-in" style={{ marginBottom: '24px', padding: '16px', overflowX: 'auto' }}>
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            minWidth: 'fit-content'
          }}>
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className="btn-secondary"
                  style={{
                    flex: '1',
                    minWidth: '160px',
                    padding: '16px',
                    border: `2px solid ${isActive ? 'var(--color-primary)' : isCompleted ? 'var(--color-success)' : 'var(--border-primary)'}`,
                    background: isActive 
                      ? 'var(--color-primary-light)' 
                      : isCompleted 
                        ? 'var(--color-success-light)'
                        : 'white',
                    color: isActive 
                      ? 'var(--color-primary)' 
                      : isCompleted 
                        ? 'var(--color-success)'
                        : 'var(--text-secondary)',
                    textAlign: 'left',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`step-number ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                      {isCompleted ? '✓' : step.icon}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 'var(--text-xs)', 
                        opacity: 0.7,
                        marginBottom: '2px'
                      }}>
                        Step {index + 1}
                      </div>
                      <div style={{ 
                        fontSize: 'var(--text-sm)', 
                        fontWeight: 'var(--font-medium)'
                      }}>
                        {step.name}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content Card */}
        <div className="card slide-in-right" style={{ 
          marginBottom: '24px',
          minHeight: '500px'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: 'var(--text-2xl)', 
              fontWeight: 'var(--font-semibold)', 
              margin: '0 0 8px 0',
              color: 'var(--text-primary)'
            }}>
              {steps[currentStep].icon} {steps[currentStep].name}
            </h2>
            <div style={{ 
              width: '60px',
              height: '3px',
              background: 'var(--color-primary)',
              borderRadius: 'var(--radius-full)'
            }} />
          </div>

          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="card" style={{ 
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
            className="btn-secondary"
            style={{ minWidth: '120px' }}
          >
            ← Previous
          </button>

          <div style={{ 
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            fontWeight: 'var(--font-medium)',
            textAlign: 'center'
          }}>
            Step {currentStep + 1} of {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={goToNextStep}
              className="btn-primary"
              style={{ minWidth: '120px' }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="btn-success"
            >
              Submit to Processing →
            </button>
          )}
        </div>

      </div>

      {/* ── Submission overlays ─────────────────────────────────────────── */}

      {/* Success screen */}
      {submission.status === 'success' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#166534', margin: '0 0 8px' }}>Submitted Successfully!</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
              <strong>{submission.notionTitle}</strong> has been added to the Pipeline as <strong>Pending Assignment</strong>.
            </p>
            <a href={submission.notionUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '12px 28px', background: '#0369a1', color: 'white', borderRadius: '8px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', marginBottom: '12px' }}>
              Open in Notion →
            </a>
            <br />
            <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
              style={{ marginTop: '8px', padding: '10px 20px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Duplicate found — ask broker */}
      {submission.status === 'duplicate' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', textAlign: 'center' }}>⚠️</div>
            <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#92400e', margin: '0 0 8px', textAlign: 'center' }}>Existing Record Found</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px', textAlign: 'center' }}>
              The following pipeline {submission.duplicates.length === 1 ? 'entry matches' : 'entries match'} this applicant name:
            </p>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {submission.duplicates.map(d => (
                <div key={d.id} style={{ padding: '12px 14px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{d.title}</div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>{d.status}</div>
                  </div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#0369a1', textDecoration: 'none', fontWeight: '500', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    View →
                  </a>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 20px', textAlign: 'center' }}>
              Would you like to create a new page anyway, or cancel to review?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
                style={{ flex: 1, padding: '11px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                Cancel — Review
              </button>
              <button onClick={doSubmit}
                style={{ flex: 1, padding: '11px', background: '#0369a1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                Create New Page Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {submission.status === 'error' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
            <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#991b1b', margin: '0 0 8px' }}>Submission Failed</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>An error occurred while submitting to Notion:</p>
            <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '10px', borderRadius: '6px', margin: '0 0 24px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {submission.message}
            </p>
            <button onClick={() => setSubmission(s => ({ ...s, status: 'idle' }))}
              style={{ padding: '11px 28px', background: '#0369a1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Close &amp; Try Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FactFindApp;
