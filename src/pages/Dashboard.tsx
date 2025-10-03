import React from 'react';
import { 
  TrendingUp, 
  Target, 
  Shield, 
  Wallet,
  Calendar,
  AlertCircle,
  ArrowRight,
  Link2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber, formatDate } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import SpendingInsightsWidget from '../components/insights/SpendingInsightsWidget';
import AIInsightsDashboard from '../components/dashboard/AIInsightsDashboard';
import SmartAlertsWidget from '../components/dashboard/SmartAlertsWidget';
import FinancialWellnessWidget from '../components/dashboard/FinancialWellnessWidget';
import MarketInsightsWidget from '../components/dashboard/MarketInsightsWidget';

const Dashboard: React.FC = () => {
  const { assets, goals, insurance, licPolicies, transactions, bankAccounts, liabilities, userProfile, recurringTransactions, getUpcomingBills, getOverdueBills } = useData();
  const navigate = useNavigate();
  const theme = useThemeClasses();
  

  
  const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  const retirementGoal = goals.find(g => g.category === 'retirement');
  const retirementProgress = retirementGoal ? (retirementGoal.currentAmount / retirementGoal.targetAmount) * 100 : 0;
  
  const totalLICMaturity = licPolicies.reduce((sum, policy) => sum + policy.maturityAmount, 0);
  
  // Calculate current month cash flow from actual transactions
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const currentMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getFullYear() === currentYear && 
           transactionDate.getMonth() === currentMonth;
  });
  
  // Use React.useMemo to ensure calculations update when transactions change
  const currentMonthIncome = React.useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);
    
  const currentMonthExpenses = React.useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);
    
  const currentMonthSurplus = currentMonthIncome - currentMonthExpenses;
  
  // Recurring transactions and bills data
  const upcomingBills = getUpcomingBills(7); // Next 7 days
  const overdueBills = getOverdueBills();
  const activeRecurringTransactions = recurringTransactions.filter(rt => rt.isActive);
  
  // Calculate category breakdown for expenses
  const expensesByCategory = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  // Calculate total balance across all accounts (user-added values only)
  const totalAccountBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);

  // Generate upcoming events from actual data
  const upcomingEvents = [
    // Add insurance maturity events
    ...insurance
      .filter((policy: any) => policy.maturityDate)
      .map((policy: any) => ({
        date: policy.maturityDate!,
        event: `${policy.policyName} Maturity`,
        amount: policy.maturityAmount || 0
      })),
    // Add goal target dates
    ...goals
      .filter((goal: any) => new Date(goal.targetDate) > new Date())
      .map((goal: any) => ({
        date: goal.targetDate,
        event: `${goal.name} Target`,
        amount: goal.targetAmount
      }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className={theme.heading1}>Financial Dashboard</h1>
        <p className={cn(theme.textSecondary, 'mt-1')}>
          Overview of your financial health
        </p>
      </header>

      {/* Key Metrics */}
      <section aria-labelledby="key-metrics-heading">
        <h2 id="key-metrics-heading" className="sr-only">Key Financial Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Net Worth"
          value={netWorth}
          icon={Wallet}
          color="green"
          format="large"
          trend={{ value: 8.5, isPositive: true }}
        />
        <MetricCard
          title="Current Month Flow"
          value={currentMonthSurplus}
          icon={TrendingUp}
          color="blue"
          trend={{ 
            value: currentMonthSurplus >= 0 ? Math.abs(currentMonthSurplus / 1000) : -Math.abs(currentMonthSurplus / 1000), 
            isPositive: currentMonthSurplus >= 0 
          }}
        />
        <MetricCard
          title="Retirement Progress"
          value={retirementProgress}
          icon={Target}
          color="purple"
          format="number"
        />
        <MetricCard
          title="Total LIC Maturity"
          value={totalLICMaturity}
          icon={Shield}
          color="yellow"
          format="large"
        />
        </div>
      </section>

      {/* Enhanced Current Month Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
              Account Overview
            </h3>
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              View Transactions
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-200 dark:text-gray-200">Current Balance</span>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(totalAccountBalance)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 dark:text-gray-300 mt-1">
                  Across {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Wallet className="h-12 w-12 text-blue-600 dark:text-blue-400 dark:text-blue-300" aria-hidden="true" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 dark:text-gray-200">This Month Income</span>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      +{formatCurrency(currentMonthIncome)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400 dark:text-green-300" aria-hidden="true" />
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 dark:text-gray-200">This Month Expenses</span>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">
                      -{formatCurrency(currentMonthExpenses)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-600 dark:text-red-400 dark:text-red-300 transform rotate-180" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-200 dark:text-gray-200">Net Cash Flow This Month</span>
                <span className={`text-xl font-bold ${currentMonthSurplus >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {currentMonthSurplus >= 0 ? '+' : ''}{formatCurrency(currentMonthSurplus)}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 dark:text-gray-300">
                {currentMonthTransactions.length} transactions in {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
              Top Expense Categories
            </h3>
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {topExpenseCategories.length > 0 ? (
              topExpenseCategories.map(([category, amount]) => {
                const percentage = currentMonthExpenses > 0 ? (amount / currentMonthExpenses) * 100 : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <button
                        onClick={() => navigate(`/transactions?category=${encodeURIComponent(category)}`)}
                        className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:text-blue-400 text-left"
                      >
                        {category}
                      </button>
                      <span className="font-medium">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <TrendingUp className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No expenses this month</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Allocation & Liabilities Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
              Asset Allocation
            </h3>
            <button
              onClick={() => navigate('/assets')}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {assets.slice(0, 5).map((asset) => {
              const percentage = totalAssets > 0 ? (asset.currentValue / totalAssets) * 100 : 0;
              return (
                <div key={asset.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{asset.name}</span>
                    <span className="font-medium">
                      {formatLargeNumber(asset.currentValue)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {assets.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No assets added yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibent text-gray-900 dark:text-white dark:text-white">
              Liabilities Overview
            </h3>
            <button
              onClick={() => navigate('/liabilities')}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {liabilities.slice(0, 5).map((liability) => {
              const progress = liability.principalAmount > 0 
                ? ((liability.principalAmount - liability.currentBalance) / liability.principalAmount) * 100 
                : 0;
              const getLiabilityIcon = (type: string) => {
                switch (type) {
                  case 'home_loan': return '🏠';
                  case 'personal_loan': return '💰';
                  case 'car_loan': return '🚗';
                  case 'credit_card': return '💳';
                  case 'education_loan': return '🎓';
                  case 'business_loan': return '🏢';
                  default: return '📋';
                }
              };
              
              return (
                <div key={liability.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <span className="mr-2">{getLiabilityIcon(liability.type)}</span>
                      <span className="text-gray-600 dark:text-gray-300">{liability.name}</span>
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatLargeNumber(liability.currentBalance)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Paid: {progress.toFixed(1)}%</span>
                    <span>EMI: {formatCurrency(liability.emiAmount)}</span>
                  </div>
                </div>
              );
            })}
            {liabilities.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No liabilities added yet</p>
                <button
                  onClick={() => navigate('/liabilities')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm mt-2"
                >
                  Add your first liability
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goals Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
            Financial Goals Progress
          </h3>
          <button
            onClick={() => navigate('/goals')}
            className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
          >
            Manage Goals
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="space-y-4">
          {goals.length > 0 ? goals.slice(0, 3).map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const targetDate = new Date(goal.targetDate);
            const today = new Date();
            const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const monthsUntilTarget = Math.max(1, Math.ceil(daysUntilTarget / 30));
            const yearsUntilTarget = Math.floor(monthsUntilTarget / 12);
            const remainingMonths = monthsUntilTarget % 12;
            
            // Get category styling
            const getCategoryIcon = (category: string) => {
              switch (category) {
                case 'retirement': return '🏖️';
                case 'education': return '🎓';
                case 'marriage': return '💒';
                default: return '🎯';
              }
            };
            
            const getCategoryColor = (category: string) => {
              switch (category) {
                case 'retirement': return 'border-purple-200 bg-purple-50';
                case 'education': return 'border-blue-200 bg-blue-50';
                case 'marriage': return 'border-pink-200 bg-pink-50';
                default: return 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700';
              }
            };
            
            // Calculate advanced metrics using expected return rate
            const expectedReturnRate = goal.expectedReturnRate || 12;
            const monthlyRate = expectedReturnRate / 100 / 12;
            const futureValueOfCurrent = goal.currentAmount * Math.pow(1 + monthlyRate, monthsUntilTarget);
            const remainingAmount = Math.max(0, goal.targetAmount - futureValueOfCurrent);
            
            // Required SIP calculation with compound interest
            const requiredMonthlySIP = remainingAmount > 0 && monthsUntilTarget > 0 
              ? remainingAmount * monthlyRate / (Math.pow(1 + monthlyRate, monthsUntilTarget) - 1)
              : 0;
            
            // Projected completion at current SIP rate
            const projectedMonths = goal.monthlyContribution > 0 && remainingAmount > 0
              ? Math.log(1 + (remainingAmount * monthlyRate) / goal.monthlyContribution) / Math.log(1 + monthlyRate)
              : 0;
            
            const projectedDate = new Date();
            projectedDate.setMonth(projectedDate.getMonth() + projectedMonths);
            
            // Determine if on track
            const isOnTrack = goal.monthlyContribution >= requiredMonthlySIP * 0.9;
            
            return (
              <div key={goal.id} className={`card border-l-4 ${getCategoryColor(goal.category)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{getCategoryIcon(goal.category)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">{goal.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isOnTrack ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isOnTrack ? 'On Track' : 'Behind Schedule'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                          <span className="capitalize">{goal.category} Goal</span>
                          <span>•</span>
                          <span>{expectedReturnRate}% expected return</span>
                          <span>•</span>
                          <span>{goal.isInflationAdjusted ? 'Inflation-adjusted' : 'Nominal value'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target Amount</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                          {formatLargeNumber(goal.targetAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Amount</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                          {formatLargeNumber(goal.currentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly SIP</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                          {formatCurrency(goal.monthlyContribution)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time Remaining</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                          {yearsUntilTarget > 0 && `${yearsUntilTarget}y `}
                          {remainingMonths}m
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Progress</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>₹0</span>
                        <span>{formatLargeNumber(goal.targetAmount)}</span>
                      </div>
                    </div>

                    {/* Advanced Metrics */}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Required Monthly SIP:</span>
                        <span className={`ml-2 font-medium ${
                          requiredMonthlySIP > goal.monthlyContribution * 1.1 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(requiredMonthlySIP)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Projected Completion:</span>
                        <span className={`ml-2 font-medium ${
                          projectedMonths > monthsUntilTarget ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {projectedMonths > 0 && projectedMonths < 120 
                            ? projectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : projectedMonths > 120 ? '10+ years' : 'On track'
                          }
                        </span>
                      </div>
                      
                      {/* Age Context for Retirement Goals */}
                      {goal.category === 'retirement' && userProfile?.financialInfo && (
                        <>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Current Age:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white dark:text-white">
                              {userProfile.financialInfo.currentAge} years
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Target Retirement Age:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white dark:text-white">
                              {userProfile.financialInfo.retirementAge} years
                            </span>
                          </div>
                        </>
                      )}
                      
                      {/* Timeline Context */}
                      {projectedMonths > 120 && userProfile?.financialInfo && (
                        <div className="col-span-2 p-2 bg-yellow-50 rounded text-xs">
                          <span className="text-yellow-700">
                            ⚠️ Goal completion beyond 10+ years timeline. 
                            {goal.category === 'retirement' && 
                              ` You'll be ${userProfile.financialInfo.currentAge + Math.ceil(projectedMonths / 12)} years old.`
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Target Date */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Calendar className="h-4 w-4 mr-2" />
                        Target Date: {targetDate.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                      
                      {/* SIP Adjustment Recommendation */}
                      {goal.monthlyContribution > 0 && requiredMonthlySIP > goal.monthlyContribution * 1.1 && (
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                          ↑ Increase SIP by {formatCurrency(requiredMonthlySIP - goal.monthlyContribution)}
                        </div>
                      )}
                      
                      {goal.monthlyContribution > 0 && requiredMonthlySIP < goal.monthlyContribution * 0.9 && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ↓ Can reduce SIP by {formatCurrency(goal.monthlyContribution - requiredMonthlySIP)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Target className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No financial goals set</p>
              <p className="text-sm text-gray-400 mt-1">
                Add your first financial goal to start tracking progress
              </p>
            </div>
          )}
          
          {goals.length > 3 && (
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-600 dark:border-gray-600">
              <button
                onClick={() => navigate('/goals')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium"
              >
                View all {goals.length} goals →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bills & Recurring Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bills */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Upcoming Bills
            </h3>
            <button
              onClick={() => navigate('/recurring')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {overdueBills.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                ⚠️ {overdueBills.length} overdue bill(s) need attention
              </p>
            </div>
          )}
          
          {upcomingBills.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No upcoming bills</p>
              <button
                onClick={() => navigate('/recurring')}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2"
              >
                Add your first bill
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBills.slice(0, 3).map(bill => {
                const daysUntil = Math.ceil((new Date(bill.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={bill.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{bill.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''} • {bill.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(bill.amount)}</p>
                    </div>
                  </div>
                );
              })}
              {upcomingBills.length > 3 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  +{upcomingBills.length - 3} more bills
                </p>
              )}
            </div>
          )}
        </div>

        {/* Active Recurring Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recurring Transactions
            </h3>
            <button
              onClick={() => navigate('/recurring')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              Manage
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {activeRecurringTransactions.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No recurring transactions</p>
              <button
                onClick={() => navigate('/recurring')}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2"
              >
                Set up recurring payments
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRecurringTransactions.slice(0, 3).map(rt => (
                <div key={rt.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{rt.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {rt.frequency} • Next: {formatDate(rt.nextDueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${rt.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount)}
                    </p>
                  </div>
                </div>
              ))}
              {activeRecurringTransactions.length > 3 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  +{activeRecurringTransactions.length - 3} more recurring transactions
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Upcoming Financial Events
        </h3>
        <div className="space-y-3">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-blue-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white dark:text-white">{event.event}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </p>
                  </div>
                </div>
                {event.amount > 0 && (
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{formatLargeNumber(event.amount)}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Calendar className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No upcoming financial events</p>
              <p className="text-sm text-gray-400 mt-1">
                Add insurance policies or goals with target dates to see upcoming events
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Alerts - High Priority */}
      <SmartAlertsWidget />

      {/* AI-Powered Financial Insights */}
      <AIInsightsDashboard />

      {/* Financial Wellness Score */}
      <FinancialWellnessWidget />

      {/* Market Insights & Analysis */}
      <MarketInsightsWidget />

      {/* Mint-like Spending Insights */}
      <SpendingInsightsWidget />

      {/* Transaction Linking Quick Access */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Linking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Connect transactions to your financial goals</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/transaction-linking')}
            className={cn(theme.btnPrimary, 'flex items-center')}
          >
            Manage Links
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              {transactions.filter(t => t.isLinked).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Linked Transactions</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {transactions.filter(t => t.autoLinked).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Auto-Linked</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {goals.filter(g => transactions.some(t => t.entityLinks?.some(l => l.entityType === 'goal' && l.entityId === g.id))).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Connected Goals</p>
          </div>
        </div>

        {transactions.filter(t => !t.isLinked).length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You have {transactions.filter(t => !t.isLinked).length} unlinked transactions that could benefit from entity connections.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;