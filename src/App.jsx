import React, { useState } from 'react';
import './styles.css';

// Import step components
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
      splits: [],
      ratePreference: '',
      hasOffset: false,
      hasRedraw: false
    }],
    lenderPreference: '',
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

  const handleSubmit = async () => {
    try {
      const submissionData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        submittedBy: formData.brokerEmail
      };

      console.log('Submitting fact find:', submissionData);

      // TODO: Call Mercury API
      // await submitToMercury(submissionData);
      
      // TODO: Call Notion pipeline
      // await submitToNotion(submissionData);

      alert('✅ Fact Find submitted successfully!\n\n(Mercury API integration pending)');
      
    } catch (error) {
      console.error('Submission error:', error);
      alert('❌ Error submitting fact find. Please try again.');
    }
  };

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
        return <Step4Review formData={formData} />;
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

        {/* Help Footer */}
        <div style={{ 
          marginTop: '32px',
          padding: '20px',
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Need help? Contact your Partnership Manager or email{' '}
            <a 
              href="mailto:helpdesk@connective.com.au" 
              style={{ 
                color: 'var(--color-primary)', 
                textDecoration: 'none',
                fontWeight: 'var(--font-medium)'
              }}
            >
              helpdesk@connective.com.au
            </a>
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Powered by Mercury Nexus CRM • Secure & Encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default FactFindApp;
