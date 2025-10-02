import React from 'react';
import { CheckCircle, User, DollarSign, TrendingUp, Target, Shield } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { formatCurrency, formatLargeNumber } from '../../../utils/formatters';

const ReviewStep: React.FC = () => {
  const { userProfile, assets, goals, insurance, monthlyBudget } = useData();

  const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalGoals = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCoverage = insurance.reduce((sum, policy) => sum + policy.coverAmount, 0);
  const totalPremiums = insurance.reduce((sum, policy) => {
    const multiplier = policy.premiumFrequency === 'monthly' ? 12 : 
                     policy.premiumFrequency === 'quarterly' ? 4 : 1;
    return sum + (policy.premiumAmount * multiplier);
  }, 0);

  const savingsRate = monthlyBudget.income > 0 ? 
    ((monthlyBudget.income - monthlyBudget.expenses.household) / monthlyBudget.income) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Setup Complete!</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Review your financial profile before we create your personalized dashboard.
        </p>
      </div>

      {/* Personal Information Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-300">Name</p>
            <p className="font-medium text-gray-900 dark:text-white">{userProfile?.personalInfo.name}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300">Email</p>
            <p className="font-medium text-gray-900 dark:text-white">{userProfile?.personalInfo.email}</p>
          </div>
          {userProfile?.personalInfo.spouseName && (
            <div>
              <p className="text-gray-600 dark:text-gray-300">Spouse</p>
              <p className="font-medium text-gray-900 dark:text-white">{userProfile.personalInfo.spouseName}</p>
            </div>
          )}
          {userProfile?.personalInfo.children && userProfile.personalInfo.children.length > 0 && (
            <div>
              <p className="text-gray-600 dark:text-gray-300">Children</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {userProfile.personalInfo.children.length} {userProfile.personalInfo.children.length === 1 ? 'child' : 'children'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          Financial Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Monthly Income</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(monthlyBudget.income)}
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Monthly Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(monthlyBudget.expenses.household)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Savings Rate</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {savingsRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Retirement Age</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {userProfile?.financialInfo.retirementAge} years
            </p>
          </div>
        </div>
      </div>

      {/* Assets Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Assets & Investments
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatLargeNumber(totalAssets)}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {assets.length} {assets.length === 1 ? 'asset' : 'assets'} tracked
            </p>
          </div>
          {assets.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">Top Asset</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {assets.reduce((max, asset) => 
                  asset.currentValue > max.currentValue ? asset : max
                ).name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goals Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Financial Goals
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatLargeNumber(totalGoals)}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {goals.length} {goals.length === 1 ? 'goal' : 'goals'} set
            </p>
          </div>
          {goals.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">Monthly SIP</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0))}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Insurance Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Insurance Coverage
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatLargeNumber(totalCoverage)}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {insurance.length} {insurance.length === 1 ? 'policy' : 'policies'} active
            </p>
          </div>
          {insurance.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">Annual Premiums</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(totalPremiums)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🎉 What's Next?</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>• Your personalized dashboard will show real-time financial insights</p>
          <p>• Track your progress towards goals with interactive charts</p>
          <p>• Get forecasts and scenarios for your financial future</p>
          <p>• Add transactions to monitor your cash flow</p>
          <p>• Generate detailed reports for better financial planning</p>
        </div>
      </div>

      {/* Completion Message */}
      <div className="text-center bg-green-50 border border-green-200 rounded-lg p-6">
        <h4 className="font-medium text-green-900 mb-2">
          🚀 Ready to Take Control of Your Finances!
        </h4>
        <p className="text-green-700">
          Click "Complete Setup" to access your personalized financial dashboard and start your journey towards financial freedom.
        </p>
      </div>
    </div>
  );
};

export default ReviewStep;