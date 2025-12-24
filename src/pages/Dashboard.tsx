import React from 'react';
import {
  TrendingUp,
  Target,
  Shield,
  Wallet,
  Calendar,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber, formatDate } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import SpendingInsightsWidget from '../components/insights/SpendingInsightsWidget';
import SmartAlertsWidget from '../components/dashboard/SmartAlertsWidget';
import UnifiedGoalCard from '../components/goals/UnifiedGoalCard';

const Dashboard: React.FC = () => {
  const { assets, goals, insurance, transactions, bankAccounts, liabilities, recurringTransactions, categories } = useData();
  const navigate = useNavigate();
  const theme = useThemeClasses();

  const sipAssets = assets.filter(a => a.isSIP && (a.category === 'mutual_funds' || a.category === 'epf'));

  // Calculate LIC policies from insurance array
  const licPoliciesFromInsurance = insurance
    .filter(p => (p.type === 'endowment' || p.type === 'other') && p.maturityAmount)
    .map(p => ({
      ...p,
      maturityYear: p.maturityDate ? new Date(p.maturityDate).getFullYear() : 0,
    }));

  const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalBankBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const netWorth = totalAssets + totalBankBalance - totalLiabilities;

  const retirementGoal = goals.find(g => g.category === 'retirement');
  const retirementProgress = retirementGoal ? (retirementGoal.currentAmount / retirementGoal.targetAmount) * 100 : 0;
  const totalLICMaturity = licPoliciesFromInsurance.reduce((sum, policy) => sum + (policy.maturityAmount || 0), 0);

  // Calculate current month cash flow from actual transactions
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const currentMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getFullYear() === currentYear &&
      transactionDate.getMonth() === currentMonth &&
      t.category !== 'transfer';
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

  const currentMonthInvestments = React.useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  // Cash flow = Income - Expenses - Investments
  const currentMonthSurplus = currentMonthIncome - currentMonthExpenses - currentMonthInvestments;

  // Recurring transactions and bills data
  const activeRecurringTransactions = recurringTransactions.filter(rt => rt.isActive);

  // Dashboard Timeline Switcher State
  const [expenseTimeRange, setExpenseTimeRange] = React.useState<'1M' | '6M' | '1Y'>('1M');

  const filteredExpenseTransactions = React.useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.filter(t => {
      if (t.type !== 'expense' || t.category === 'transfer') return false;
      const tDate = new Date(t.date);

      if (expenseTimeRange === '1M') {
        // Current Month
        return tDate >= currentMonthStart;
      } else if (expenseTimeRange === '6M') {
        // Last 6 Months
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return tDate >= sixMonthsAgo;
      } else {
        // Last 1 Year
        const oneYearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        return tDate >= oneYearAgo;
      }
    });
  }, [transactions, expenseTimeRange]);


  // Calculate category breakdown for expenses (using filtered timeframe)
  const expensesByCategory = filteredExpenseTransactions
    .reduce((acc, t) => {
      let cat = t.category;
      // Handle legacy/corrupt data where category is an object
      if (typeof cat === 'object' && cat !== null) {
        cat = (cat as any).id || (cat as any).name || 'Unknown';
      }
      // Handle null/undefined
      if (!cat) cat = 'Unknown';

      // Safe string conversion to avoid [Object Object] key
      const catKey = String(cat);

      acc[catKey] = (acc[catKey] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
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
            tooltipContent={
              <div className="text-left font-mono text-xs">
                {/* Assets breakdown by category */}
                {Object.entries(
                  assets.reduce((acc: { [key: string]: number }, asset) => {
                    const type = asset.category === 'mutual_funds' ? 'Mutual Funds' :
                      asset.category === 'stocks' ? 'Stocks' :
                        asset.category === 'epf' ? 'EPF' :
                          asset.category === 'fixed_deposit' ? 'Fixed Deposits' :
                            asset.category === 'gold' ? 'Gold' :
                              asset.category === 'cash' ? 'Cash' :
                                asset.category === 'other' ? 'Other' : asset.category;
                    acc[type] = (acc[type] || 0) + asset.currentValue;
                    return acc;
                  }, {} as { [key: string]: number })
                ).map(([type, value]) => (
                  <div key={type} className="flex justify-between gap-4">
                    <span>{type}</span>
                    <span>: {formatLargeNumber(value)}</span>
                  </div>
                ))}

                {/* Bank Balance */}
                {totalBankBalance > 0 && (
                  <div className="flex justify-between gap-4">
                    <span>Bank Balance</span>
                    <span>: {formatLargeNumber(totalBankBalance)}</span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-500 my-1"></div>

                {/* Liabilities in red */}
                <div className="flex justify-between gap-4 text-red-300">
                  <span>Liabilities</span>
                  <span>: {formatLargeNumber(totalLiabilities)}</span>
                </div>
              </div>
            }
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

            <div className="grid grid-cols-3 gap-4">
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

              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 dark:text-gray-200">This Month Investments</span>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      -{formatCurrency(currentMonthInvestments)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400 dark:text-blue-300 transform rotate-180" aria-hidden="true" />
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
              Top Expenses
            </h3>

            {/* Timeline Switcher */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['1M', '6M', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setExpenseTimeRange(range)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-all
                    ${expenseTimeRange === range
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {topExpenseCategories.length > 0 ? (
              topExpenseCategories.map(([categoryId, amount]) => {
                // Calculate percentage relative to the TOTAL expenses in this filtered period
                const totalFilteredExpenses = filteredExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);
                const percentage = totalFilteredExpenses > 0 ? (amount / totalFilteredExpenses) * 100 : 0;

                const categoryObj = categories.find(c => c.id === categoryId);
                const categoryName = categoryObj ? categoryObj.name : categoryId;

                return (
                  <div key={categoryId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <button
                        onClick={() => navigate(`/transactions?category=${encodeURIComponent(categoryId)}`)}
                        className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:text-blue-400 text-left capitalize truncate max-w-[150px]"
                        title={categoryName}
                      >
                        {categoryName}
                      </button>
                      <span className="font-medium whitespace-nowrap">
                        {formatCurrency(amount)} <span className="text-xs text-gray-400">({percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <TrendingUp className="h-10 w-10 mx-auto opacity-50" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No expenses in this period</p>
              </div>
            )}

            {/* Footer Link */}
            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 text-center">
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center justify-center mx-auto"
              >
                View All Transactions <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
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
          {goals.length > 0 ? goals.slice(0, 3).map((goal) => (
            <UnifiedGoalCard
              key={goal.id}
              goal={goal}
              sipAssets={sipAssets}
              size="medium"
              showDetails={false}
            />
          )) : (
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
      <div className="grid grid-cols-1 gap-6">


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

      {/* Smart Alerts - High Priority */}
      <SmartAlertsWidget />

      {/* Mint-like Spending Insights */}
      <SpendingInsightsWidget />
    </div>
  );
};

export default Dashboard;