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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Overview</h2>
        <p className="text-gray-600">
          Tell us about your current financial situation to help us create a personalized plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income & Expenses */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Monthly Cash Flow
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Income (Take-home)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={userProfile?.financialInfo.monthlyIncome || ''}
                onChange={(e) => handleFinancialChange('monthlyIncome', Number(e.target.value))}
                className="input-field pl-8"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Expenses
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={userProfile?.financialInfo.monthlyExpenses || ''}
                onChange={(e) => handleFinancialChange('monthlyExpenses', Number(e.target.value))}
                className="input-field pl-8"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Retirement Planning */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Retirement Planning
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Age
            </label>
            <input
              type="number"
              value={currentAge}
              readOnly
              className="input-field bg-gray-50"
              placeholder="Calculated from date of birth"
            />
            <p className="text-xs text-gray-500 mt-1">
              Calculated from your date of birth
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Retirement Age
            </label>
            <input
              type="number"
              value={userProfile?.financialInfo?.retirementAge || 60}
              onChange={(e) => handleFinancialChange('retirementAge', Number(e.target.value))}
              className="input-field"
              placeholder="60"
              min={currentAge + 1}
              max="80"
            />
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator className="w-5 h-5 mr-2" />
          Financial Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Monthly Savings</p>
            <p className={`text-lg font-bold ${monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlySavings)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg">
            <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Savings Rate</p>
            <p className={`text-lg font-bold ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {savingsRate.toFixed(1)}%
            </p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg">
            <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Years to Retirement</p>
            <p className="text-lg font-bold text-gray-900">
              {yearsToRetirement > 0 ? yearsToRetirement : 0} years
            </p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg">
            <Calculator className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Annual Savings</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(monthlySavings * 12)}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Financial Health Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {savingsRate < 10 && (
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
            <li>• Emergency fund should cover 6-12 months of expenses ({formatCurrency(monthlyExpenses * 6)} - {formatCurrency(monthlyExpenses * 12)})</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FinancialInfoStep;