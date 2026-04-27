import React, { useState } from 'react';

// Import all step components (these would be imported from their respective files)
// For now, we'll include placeholder imports - in production these would be actual imports
// import Step0LoanStrategy from './Step0-LoanStrategy';
// import Step1Applicants from './Step1-Applicants';
// import Step2Employment from './Step2-Employment';
// import Step3AssetsLiabilities from './Step3-AssetsLiabilities';
// import Step4Review from './Step4-Review';

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
    
    // Step 4 - Review
    submittedAt: null,
    submittedBy: ''
  });

  const steps = [
    { id: 0, name: 'Loan Strategy', shortName: 'Strategy' },
    { id: 1, name: 'Applicants', shortName: 'Applicants' },
    { id: 2, name: 'Employment & Income', shortName: 'Employment' },
    { id: 3, name: 'Assets & Liabilities', shortName: 'Assets' },
    { id: 4, name: 'Review', shortName: 'Review' }
  ];

  // Update form data from child components
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Add submission timestamp
      const submissionData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        submittedBy: formData.brokerEmail
      };

      console.log('Submitting fact find:', submissionData);

      // TODO: Implement Mercury API submission
      // await submitToMercury(submissionData);
      
      // TODO: Implement Notion pipeline submission
      // await submitToNotion(submissionData);

      alert('Fact Find submitted successfully! (Mercury API integration pending)');
      
      // Reset form or redirect
      // setFormData(initialFormData);
      // setCurrentStep(0);
      
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting fact find. Please try again.');
    }
  };

  // Navigation functions
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

  // Render current step content
  const renderStepContent = () => {
    // In production, this would render the actual imported components
    // For now, showing placeholder structure
    
    switch (currentStep) {
      case 0:
        return <div>Step 0: Loan Strategy Component Would Render Here</div>;
        // return <Step0LoanStrategy formData={formData} updateFormData={updateFormData} />;
      case 1:
        return <div>Step 1: Applicants Component Would Render Here</div>;
        // return <Step1Applicants formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <div>Step 2: Employment Component Would Render Here</div>;
        // return <Step2Employment formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <div>Step 3: Assets & Liabilities Component Would Render Here</div>;
        // return <Step3AssetsLiabilities formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <div>Step 4: Review Component Would Render Here</div>;
        // return <Step4Review formData={formData} onSubmit={handleSubmit} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--color-background-tertiary)',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '2rem',
          marginBottom: '2rem',
          border: '0.5px solid var(--color-border-tertiary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: '500', 
                margin: '0 0 8px 0',
                color: 'var(--color-text-primary)'
              }}>
                HOF Broker Fact Find
              </h1>
              <p style={{ 
                fontSize: '15px', 
                color: 'var(--color-text-secondary)', 
                margin: 0 
              }}>
                Complete all sections to submit to processing team
              </p>
            </div>
            
            <div style={{ 
              background: 'var(--color-background-secondary)',
              padding: '8px 16px',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--color-text-secondary)'
            }}>
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ 
              width: '100%', 
              height: '6px', 
              background: 'var(--color-background-secondary)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                height: '100%',
                background: 'var(--color-background-info)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div style={{ 
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '1rem',
          marginBottom: '2rem',
          border: '0.5px solid var(--color-border-tertiary)',
          overflowX: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            minWidth: 'fit-content'
          }}>
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  style={{
                    flex: '1',
                    minWidth: '140px',
                    padding: '14px 16px',
                    fontSize: '14px',
                    fontWeight: isActive ? '500' : '400',
                    borderRadius: 'var(--border-radius-md)',
                    border: `2px solid ${isActive ? 'var(--color-border-info)' : 'transparent'}`,
                    background: isActive 
                      ? 'var(--color-background-info)' 
                      : isCompleted 
                        ? 'var(--color-background-secondary)'
                        : 'transparent',
                    color: isActive 
                      ? 'var(--color-text-info)' 
                      : isCompleted 
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isCompleted 
                        ? 'var(--color-background-success)' 
                        : isActive 
                          ? 'var(--color-background-info)'
                          : 'var(--color-background-secondary)',
                      color: isCompleted 
                        ? 'var(--color-text-success)' 
                        : isActive 
                          ? 'var(--color-text-info)'
                          : 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      flexShrink: 0
                    }}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {step.shortName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content Card */}
        <div style={{ 
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '2.5rem',
          marginBottom: '2rem',
          border: '0.5px solid var(--color-border-tertiary)',
          minHeight: '500px'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '500', 
              margin: '0 0 8px 0',
              color: 'var(--color-text-primary)'
            }}>
              {steps[currentStep].name}
            </h2>
            <div style={{ 
              width: '60px',
              height: '3px',
              background: 'var(--color-background-info)',
              borderRadius: '2px'
            }} />
          </div>

          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ 
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '1.5rem 2rem',
          border: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
            style={{ 
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: '500',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              background: 'transparent',
              color: currentStep === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: currentStep === 0 ? 0.5 : 1
            }}
          >
            ← Previous
          </button>

          <div style={{ 
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            fontWeight: '500'
          }}>
            {currentStep + 1} / {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={goToNextStep}
              style={{ 
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: '500',
                borderRadius: 'var(--border-radius-md)',
                border: '2px solid var(--color-border-info)',
                background: 'var(--color-background-info)',
                color: 'var(--color-text-info)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{ 
                padding: '12px 32px',
                fontSize: '15px',
                fontWeight: '500',
                borderRadius: 'var(--border-radius-md)',
                border: '2px solid var(--color-border-success)',
                background: 'var(--color-background-success)',
                color: 'var(--color-text-success)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Submit to Processing →
            </button>
          )}
        </div>

        {/* Help Text */}
        <div style={{ 
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-text-secondary)'
        }}>
          Need help? Contact your{' '}
          <a 
            href="mailto:helpdesk@connective.com.au" 
            style={{ color: 'var(--color-text-info)', textDecoration: 'none' }}
          >
            Partnership Manager
          </a>
          {' '}or email{' '}
          <a 
            href="mailto:helpdesk@connective.com.au"
            style={{ color: 'var(--color-text-info)', textDecoration: 'none' }}
          >
            helpdesk@connective.com.au
          </a>
        </div>
      </div>
    </div>
  );
};

export default FactFindApp;
