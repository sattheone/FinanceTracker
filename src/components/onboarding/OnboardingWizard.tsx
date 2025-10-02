import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PersonalInfoStep from './steps/PersonalInfoStep';
import FinancialInfoStep from './steps/FinancialInfoStep';
import BankAccountStep from './steps/BankAccountStep';
import AssetsStep from './steps/AssetsStep';
import LiabilitiesStep from './steps/LiabilitiesStep';
import GoalsStep from './steps/GoalsStep';
import InsuranceStep from './steps/InsuranceStep';
import ReviewStep from './steps/ReviewStep';

const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { user, updateUser } = useAuth();

  const steps = [
    { id: 0, title: 'Personal Information', component: PersonalInfoStep },
    { id: 1, title: 'Financial Overview', component: FinancialInfoStep },
    { id: 2, title: 'Bank Accounts', component: BankAccountStep },
    { id: 3, title: 'Assets & Investments', component: AssetsStep },
    { id: 4, title: 'Liabilities & Debts', component: LiabilitiesStep },
    { id: 5, title: 'Financial Goals', component: GoalsStep },
    { id: 6, title: 'Insurance Policies', component: InsuranceStep },
    { id: 7, title: 'Review & Complete', component: ReviewStep },
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to FinanceTracker</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Let's set up your financial profile</p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      index < currentStep
                        ? 'bg-green-500 border-green-500 text-white'
                        : index === currentStep
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <CurrentStepComponent />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Complete Setup
              <Check className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;