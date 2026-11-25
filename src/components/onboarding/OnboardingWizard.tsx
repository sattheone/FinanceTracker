import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import BankAccountStep from './steps/BankAccountStep';
import AssetsStep from './steps/AssetsStep';
import LiabilitiesStep from './steps/LiabilitiesStep';
import GoalsStep from './steps/GoalsStep';
import InsuranceStep from './steps/InsuranceStep';

const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { user, updateUser } = useAuth();

  const steps = [
    { id: 0, title: 'Bank Accounts', component: BankAccountStep },
    { id: 1, title: 'Assets & Investments', component: AssetsStep },
    { id: 2, title: 'Liabilities & Debts', component: LiabilitiesStep },
    { id: 3, title: 'Financial Goals', component: GoalsStep },
    { id: 4, title: 'Insurance Policies', component: InsuranceStep },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (user) {
      updateUser({
        ...user,
        onboardingCompleted: true,
      });
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen theme-bg-primary">
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold theme-text-primary">Welcome to FinanceTracker</h1>
              <p className="theme-text-secondary mt-1">Let's set up your financial profile</p>
            </div>
            <div className="text-sm theme-text-muted whitespace-nowrap flex-shrink-0">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress stepper */}
      <div style={{ backgroundColor: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-primary)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Mobile: dot indicators + current step label */}
          <div className="flex flex-col items-center gap-2 md:hidden">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="rounded-full transition-all flex-shrink-0 flex items-center justify-center"
                  style={
                    index < currentStep
                      ? { width: '1.75rem', height: '1.75rem', backgroundColor: 'var(--color-success)', color: '#fff' }
                      : index === currentStep
                      ? { width: '1.75rem', height: '1.75rem', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }
                      : { width: '0.5rem', height: '0.5rem', backgroundColor: 'var(--color-border-primary)' }
                  }
                >
                  {index < currentStep ? (
                    <Check className="w-3 h-3" />
                  ) : index === currentStep ? (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  ) : null}
                </div>
              ))}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent-primary)' }}>
              {steps[currentStep].title}
            </span>
          </div>

          {/* Desktop: full stepper */}
          <div className="hidden md:flex items-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0"
                    style={
                      index < currentStep
                        ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' }
                        : index === currentStep
                        ? { backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }
                        : { backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-muted)' }
                    }
                  >
                    {index < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className="ml-2 text-sm font-medium transition-colors"
                    style={
                      index === currentStep
                        ? { color: 'var(--color-accent-primary)' }
                        : { color: 'var(--color-text-muted)' }
                    }
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-3 transition-colors"
                    style={{ backgroundColor: index < currentStep ? 'var(--color-success)' : 'var(--color-border-primary)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="card !rounded-2xl !p-4 sm:!p-8">
          <CurrentStepComponent />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="btn-secondary flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" />
            Previous
          </button>

          <div />

          {currentStep === steps.length - 1 ? (
            <button onClick={handleComplete} className="btn-primary flex items-center">
              Complete Setup
              <Check className="w-4 h-4 ml-1.5" />
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary flex items-center">
              Next
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;