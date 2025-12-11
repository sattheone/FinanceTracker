import React from 'react';
import { DollarSign, TrendingUp, Target, Calculator } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { formatCurrency } from '../../../utils/formatters';

const FinancialInfoStep: React.FC = () => {
  const { userProfile, updateUserProfile, updateMonthlyBudget } = useData();

  const handleFinancialChange = (field: string, value: number) => {
    if (!userProfile) return;
    updateUserProfile({
      financialInfo: {
        ...userProfile.financialInfo,
        [field]: value,
      },
    });

    // Update monthly budget based on income and expenses
    if (field === 'monthlyIncome' || field === 'monthlyExpenses') {
      const income = field === 'monthlyIncome' ? value : (userProfile?.financialInfo.monthlyIncome || 0);
      const expenses = field === 'monthlyExpenses' ? value : (userProfile?.financialInfo.monthlyExpenses || 0);
      
      updateMonthlyBudget({
        income,
        expenses: {
          household: expenses,
          insurance: 0,
          loans: 0,
          investments: 0,
          other: 0,
        },
        surplus: income - expenses,
      });
    }
  };

  const calculateCurrentAge = () => {
    if (userProfile?.personalInfo.dateOfBirth) {
      const birthDate = new Date(userProfile.personalInfo.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1;
      }
      return age;
    }
    return 30; // Default age
  };

  const currentAge = calculateCurrentAge();
  const monthlyIncome = userProfile?.financialInfo.monthlyIncome || 0;
  const monthlyExpenses = userProfile?.financialInfo.monthlyExpenses || 0;
  const retirementAge = userProfile?.financialInfo.retirementAge || 60;
  const yearsToRetirement = retirementAge - currentAge;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  React.useEffect(() => {
    // Update current age when date of birth changes
    if (!userProfile) return;
    updateUserProfile({
      financialInfo: {
        ...userProfile.financialInfo,
        currentAge,
      },
    });
  }, [userProfile?.personalInfo?.dateOfBirth]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Financial Overview</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Tell us about your current financial situation to help us create a personalized plan.
        </p>
        
        {/* Value Proposition */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">🎯 Why We Need This Information</h3>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• <strong>Retirement Planning:</strong> Calculate how much you need to save for a comfortable retirement</p>
            <p>• <strong>Financial Health Score:</strong> Get personalized insights on your financial wellness</p>
            <p>• <strong>Smart Budgeting:</strong> Set realistic budgets based on your actual income and expenses</p>
            <p>• <strong>Goal Recommendations:</strong> Suggest achievable financial goals based on your situation</p>
            <p>• <strong>AI Insights:</strong> Receive personalized tips to improve your financial health</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income & Expenses */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Monthly Cash Flow
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Monthly Income (Take-home) <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
              <input
                type="number"
                value={userProfile?.financialInfo.monthlyIncome || ''}
                onChange={(e) => handleFinancialChange('monthlyIncome', Number(e.target.value))}
                className="input-field pl-8 theme-input"
                placeholder="e.g., 75000"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Used for retirement planning and financial health analysis
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Monthly Expenses <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
              <input
                type="number"
                value={userProfile?.financialInfo.monthlyExpenses || ''}
                onChange={(e) => handleFinancialChange('monthlyExpenses', Number(e.target.value))}
                className="input-field pl-8 theme-input"
                placeholder="e.g., 45000"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Used for budgeting and savings rate calculation
            </p>
          </div>
        </div>

        {/* Retirement Planning */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Retirement Planning
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Current Age
            </label>
            <input
              type="number"
              value={currentAge}
              readOnly
              className="input-field bg-gray-50 dark:bg-gray-700 theme-input"
              placeholder="Calculated from date of birth"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Calculated from your date of birth
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Target Retirement Age <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              type="number"
              value={userProfile?.financialInfo?.retirementAge || 60}
              onChange={(e) => handleFinancialChange('retirementAge', Number(e.target.value))}
              className="input-field theme-input"
              placeholder="60"
              min={currentAge + 1}
              max="80"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Used for retirement corpus calculation and goal planning
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calculator className="w-5 h-5 mr-2" />
          Financial Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Monthly Savings</p>
            <p className={`text-lg font-bold ${monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlySavings)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <Target className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Savings Rate</p>
            <p className={`text-lg font-bold ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {savingsRate.toFixed(1)}%
            </p>
          </div>
          
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Years to Retirement</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {yearsToRetirement > 0 ? yearsToRetirement : 0} years
            </p>
          </div>
          
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <Calculator className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Annual Savings</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(monthlySavings * 12)}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Financial Health Tips</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            {savingsRate < 10 && monthlyIncome > 0 && (
              <li>• Consider increasing your savings rate to at least 10-20% of income</li>
            )}
            {savingsRate >= 20 && (
              <li>• Excellent savings rate! You're on track for a strong financial future</li>
            )}
            {yearsToRetirement < 10 && (
              <li>• With less than 10 years to retirement, focus on aggressive savings and conservative investments</li>
            )}
            {yearsToRetirement >= 20 && (
              <li>• You have plenty of time to build wealth - consider growth-oriented investments</li>
            )}
            {monthlyExpenses > 0 && (
              <li>• Emergency fund should cover 6-12 months of expenses ({formatCurrency(monthlyExpenses * 6)} - {formatCurrency(monthlyExpenses * 12)})</li>
            )}
            {monthlyIncome === 0 && monthlyExpenses === 0 && (
              <li>• You can add this information later in Settings to get personalized financial insights</li>
            )}
          </ul>
        </div>

        {/* Skip Option */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don't have this information handy? You can{' '}
            <button 
              onClick={() => {
                // Set default values
                handleFinancialChange('monthlyIncome', 0);
                handleFinancialChange('monthlyExpenses', 0);
                handleFinancialChange('retirementAge', 60);
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
            >
              skip this step
            </button>
            {' '}and add it later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialInfoStep;