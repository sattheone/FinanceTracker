import React from 'react';
import {
  TrendingUp,
  Target,
  Shield,
  Wallet,
  Calendar,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber, formatDate } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import SpendingInsightsWidget from '../components/insights/SpendingInsightsWidget';
import SmartAlertsWidget from '../components/dashboard/SmartAlertsWidget';
import UnifiedGoalCard from '../components/goals/UnifiedGoalCard';
import { isTransferTransaction, resolveTransactionType } from '../constants/categories';

const Dashboard: React.FC = () => {
  const {
    assets,
    goals,
    insurance,
    transactions,
    hasMoreTransactions,
    bankAccounts,
    liabilities,
    recurringTransactions,
    categories,
    getAccountBalance,
    userProfile,
    dashboardSummary,
    loadDashboardSummary,
    loadAssets,
    loadLiabilities,
    loadInsurance
  } = useData();
  const navigate = useNavigate();
  const theme = useThemeClasses();

  // Load precomputed dashboard summary (single document read) as a fast first
  // paint, then hydrate the actual balance-source collections so net worth is
  // computed from real data instead of the (possibly stale) precomputed summary.
  // These loaders are idempotent (guarded by lazyLoadedRef), so they no-op if
  // the data is already present.
  React.useEffect(() => {
    loadDashboardSummary();
    loadAssets();
    loadLiabilities();
    loadInsurance();
  }, []);

  const sipAssets = assets.filter(a => a.isSIP && (a.category === 'mutual_funds' || a.category === 'epf'));

  // Calculate LIC policies from insurance array
  const licPoliciesFromInsurance = insurance
    .filter(p => (p.type === 'endowment' || p.type === 'other') && p.maturityAmount)
    .map(p => ({
      ...p,
      maturityYear: p.maturityDate ? new Date(p.maturityDate).getFullYear() : 0,
    }));

  const calculatedTotalAssets = assets.reduce((sum, asset) => sum + (Number(asset.currentValue) || 0), 0);
  const calculatedTotalBankBalance = bankAccounts.reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  const calculatedTotalLiabilities = liabilities.reduce((sum, liability) => sum + (Number(liability.currentBalance) || 0), 0);

  // Per-source completeness: use live data only when that source is actually
  // loaded; otherwise fall back to the precomputed summary, which is the
  // authoritative complete snapshot. A single coarse flag (any collection
  // present ⇒ trust all live) produced wrong intermediate values — e.g. bank
  // accounts present but assets not yet loaded, or bank balance summed from an
  // initialBalance-only / partial transaction set on a cold start.
  const assetsLoaded = assets.length > 0;
  const liabilitiesLoaded = liabilities.length > 0;
  // Bank balance is only trustworthy once the FULL transaction set is loaded;
  // until then prefer the summary's complete figure over an initialBalance-only sum.
  const bankBalanceComplete = transactions.length > 0 && !hasMoreTransactions;

  const totalAssets = assetsLoaded
    ? calculatedTotalAssets
    : (dashboardSummary?.totalAssets ?? calculatedTotalAssets);
  const totalBankBalance = bankBalanceComplete
    ? calculatedTotalBankBalance
    : (dashboardSummary?.totalBankBalance ?? calculatedTotalBankBalance);
  const totalLiabilities = liabilitiesLoaded
    ? calculatedTotalLiabilities
    : (dashboardSummary?.totalLiabilities ?? calculatedTotalLiabilities);
  const netWorth = totalAssets + totalBankBalance - totalLiabilities;

  const retirementGoal = goals.find(g => g.category === 'retirement');
  const calculatedRetirementProgress = retirementGoal ? (retirementGoal.currentAmount / retirementGoal.targetAmount) * 100 : 0;
  const calculatedTotalLICMaturity = licPoliciesFromInsurance.reduce((sum, policy) => sum + (policy.maturityAmount || 0), 0);

  const retirementProgress = goals.length > 0
    ? calculatedRetirementProgress
    : (dashboardSummary?.retirementProgress ?? 0);
  const totalLICMaturity = insurance.length > 0
    ? calculatedTotalLICMaturity
    : (dashboardSummary?.totalLICMaturity ?? 0);

  // Calculate default period cash flow from actual transactions
  const defaultTimePeriod = userProfile?.displayPreferences?.defaultTimePeriod || 'current';
  const baseDate = React.useMemo(() => {
    const date = new Date();
    if (defaultTimePeriod === 'previous') {
      date.setMonth(date.getMonth() - 1);
    }
    return date;
  }, [defaultTimePeriod]);
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth();
  const periodLabel = defaultTimePeriod === 'previous' ? 'Previous Month' : 'This Month';
  const periodMonthLabel = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter out internal transfers and isolate current month
  const currentMonthTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const isCurrentMonth = transactionDate.getFullYear() === currentYear &&
        transactionDate.getMonth() === currentMonth;
      return isCurrentMonth && !isTransferTransaction(t, categories);
    });
  }, [transactions, currentYear, currentMonth, categories]);

  // Use React.useMemo to ensure calculations update when transactions change
  const calculatedCurrentMonthIncome = React.useMemo(() => {
    return currentMonthTransactions
      .filter(t => resolveTransactionType(t, categories) === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions, categories]);

  const calculatedCurrentMonthExpenses = React.useMemo(() => {
    return currentMonthTransactions
      .filter(t => resolveTransactionType(t, categories) === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions, categories]);

  const calculatedCurrentMonthInvestments = React.useMemo(() => {
    return currentMonthTransactions
      .filter(t => resolveTransactionType(t, categories) === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions, categories]);

  const currentMonthIncome = transactions.length > 0
    ? calculatedCurrentMonthIncome
    : (dashboardSummary?.currentMonthIncome ?? 0);
  const currentMonthExpenses = transactions.length > 0
    ? calculatedCurrentMonthExpenses
    : (dashboardSummary?.currentMonthExpenses ?? 0);
  const currentMonthInvestments = transactions.length > 0
    ? calculatedCurrentMonthInvestments
    : (dashboardSummary?.currentMonthInvestments ?? 0);
  const currentMonthSurplus = transactions.length > 0
    ? (calculatedCurrentMonthIncome - calculatedCurrentMonthExpenses - calculatedCurrentMonthInvestments)
    : (dashboardSummary?.currentMonthSurplus ?? 0);

  // Recurring transactions and bills data
  const activeRecurringTransactions = recurringTransactions.filter(rt => rt.isActive);

  // Dashboard Timeline Switcher State
  const [expenseTimeRange, setExpenseTimeRange] = React.useState<'1M' | '6M' | '1Y'>('1M');
  const expenseRangeLabel = expenseTimeRange === '1M'
    ? periodMonthLabel
    : expenseTimeRange === '6M'
      ? `Last 6 Months (ending ${periodMonthLabel})`
      : `Last 12 Months (ending ${periodMonthLabel})`;

  const filteredExpenseTransactions = React.useMemo(() => {
    const currentMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

    return transactions.filter(t => {
      const type = resolveTransactionType(t, categories);
      if (type !== 'expense') return false;
      const tDate = new Date(t.date);

      if (expenseTimeRange === '1M') {
        // Current Month
        return tDate >= currentMonthStart;
      } else if (expenseTimeRange === '6M') {
        // Last 6 Months
        const sixMonthsAgo = new Date(baseDate.getFullYear(), baseDate.getMonth() - 5, 1);
        return tDate >= sixMonthsAgo;
      } else {
        // Last 1 Year
        const oneYearAgo = new Date(baseDate.getFullYear(), baseDate.getMonth() - 11, 1);
        return tDate >= oneYearAgo;
      }
    });
  }, [transactions, expenseTimeRange, baseDate, categories]);


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

  // Total balance across all accounts. Reuse the completeness-aware
  // `totalBankBalance` so the Account Overview matches net worth and doesn't
  // show an initialBalance-only sum before transactions finish loading.
  const totalAccountBalance = totalBankBalance;

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
    <div className="space-y-4">
      {/* Header */}
      <header>
        <h1 className={cn(theme.heading2, 'text-xl sm:text-2xl')}>Dashboard</h1>
        <p className={cn(theme.textSecondary, 'mt-0.5 text-sm')}>
          Overview of your financial health
        </p>
      </header>

      {/* Key Metrics */}
      <section aria-labelledby="key-metrics-heading">
        <h2 id="key-metrics-heading" className="sr-only">Key Financial Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Net Worth"
            value={netWorth}
            icon={Wallet}
            color="green"
            format="large"
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
            title={`${periodLabel} Flow`}
            value={currentMonthSurplus}
            icon={TrendingUp}
            color="blue"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Account Overview
            </h3>
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center text-sm theme-text-secondary hover:theme-text-primary"
            >
              View Transactions
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 rounded-xl" style={{ backgroundColor: 'var(--color-info-bg)' }}>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Current Balance</span>
                <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-info)' }}>
                  {formatCurrency(totalAccountBalance)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  Across {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Wallet className="h-9 w-9 flex-shrink-0" style={{ color: 'var(--color-info)' }} aria-hidden="true" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-success-bg)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{periodLabel} Income</span>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>
                      +{formatCurrency(currentMonthIncome)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                </div>
              </div>

              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-error-bg)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{periodLabel} Expenses</span>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-error)' }}>
                      -{formatCurrency(currentMonthExpenses)}
                    </p>
                  </div>
                  <ArrowDownRight className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--color-error)' }} aria-hidden="true" />
                </div>
              </div>

              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-info-bg)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{periodLabel} Investments</span>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-info)' }}>
                      -{formatCurrency(currentMonthInvestments)}
                    </p>
                  </div>
                  <PiggyBank className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--color-info)' }} aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
              <div>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Net Cash Flow {periodLabel}</span>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {currentMonthTransactions.length} transactions in {periodMonthLabel}
                </div>
              </div>
              <span className="text-lg font-bold" style={{ color: currentMonthSurplus >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {currentMonthSurplus >= 0 ? '+' : ''}{formatCurrency(currentMonthSurplus)}
              </span>
            </div>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Top Expenses
            </h3>

            {/* Timeline Switcher */}
            <div className="flex rounded-lg p-0.5" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              {(['1M', '6M', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setExpenseTimeRange(range)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                  style={expenseTimeRange === range
                    ? { backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                    : { color: 'var(--color-text-tertiary)' }
                  }
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            {expenseRangeLabel}
          </p>

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
                        className="theme-text-secondary hover:theme-text-primary text-left capitalize truncate max-w-[150px]"
                        title={categoryName}
                      >
                        {categoryName}
                      </button>
                      <span className="font-medium whitespace-nowrap">
                        {formatCurrency(amount)} <span className="text-xs text-gray-400">({percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%`, backgroundColor: 'var(--color-error)' }}
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
            <div className="pt-2 mt-2 border-t text-center" style={{ borderColor: 'var(--color-border-primary)' }}>
              <button
                onClick={() => navigate('/transactions')}
              className="text-xs theme-text-secondary hover:theme-text-primary flex items-center justify-center mx-auto"
              >
                View All Transactions <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Allocation & Liabilities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Asset Allocation
            </h3>
            <button
              onClick={() => navigate('/assets')}
                className="flex items-center text-sm theme-text-secondary hover:theme-text-primary"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {[...assets]
              .sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0))
              .slice(0, 5)
              .map((asset) => {
                const val = Number(asset.currentValue) || 0;
                const percentage = totalAssets > 0 ? (val / totalAssets) * 100 : 0;
                return (
                  <div key={asset.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate max-w-[150px] text-sm" style={{ color: 'var(--color-text-secondary)' }} title={asset.name}>{asset.name}</span>
                      <span className="font-medium whitespace-nowrap">
                        {formatLargeNumber(val)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${percentage}%`, backgroundColor: 'var(--color-accent-primary)' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            {assets.length === 0 && (
              <div className="text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
                <p>No assets added yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Liabilities Overview
            </h3>
            <button
              onClick={() => navigate('/liabilities')}
              className="flex items-center text-sm theme-text-secondary hover:theme-text-primary"
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
                      <span style={{ color: 'var(--color-text-secondary)' }}>{liability.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--color-error)' }}>
                      {formatLargeNumber(liability.currentBalance)}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${progress}%`, background: 'linear-gradient(to right, var(--color-success), var(--color-info))' }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    <span>Paid: {progress.toFixed(1)}%</span>
                    <span>EMI: {formatCurrency(liability.emiAmount)}</span>
                  </div>
                </div>
              );
            })}
            {liabilities.length === 0 && (
              <div className="text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
                <p>No liabilities added yet</p>
                <button
                  onClick={() => navigate('/liabilities')}
                  className="theme-text-secondary hover:theme-text-primary text-sm mt-2"
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Financial Goals Progress
          </h3>
          <button
            onClick={() => navigate('/goals')}
            className="flex items-center text-sm theme-text-secondary hover:theme-text-primary"
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
              <Target className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No financial goals set</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Add your first financial goal to start tracking progress
              </p>
            </div>
          )}

          {goals.length > 3 && (
            <div className="text-center pt-3 border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
              <button
                onClick={() => navigate('/goals')}
                className="theme-text-secondary hover:theme-text-primary text-sm font-medium"
              >
                View all {goals.length} goals →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recurring Transactions */}
      <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Calendar className="h-4 w-4" />
              Recurring Transactions
            </h3>
            <button
              onClick={() => navigate('/recurring')}
              className="theme-text-secondary hover:theme-text-primary text-sm font-medium flex items-center"
            >
              Manage
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>

          {activeRecurringTransactions.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: 'var(--color-text-tertiary)' }}>No recurring transactions</p>
              <button
                onClick={() => navigate('/recurring')}
                className="theme-text-secondary hover:theme-text-primary text-sm mt-2"
              >
                Set up recurring payments
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRecurringTransactions.slice(0, 3).map(rt => (
                <div key={rt.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{rt.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {rt.frequency} • Next: {formatDate(rt.nextDueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: rt.type === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount)}
                    </p>
                  </div>
                </div>
              ))}
              {activeRecurringTransactions.length > 3 && (
                <p className="text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  +{activeRecurringTransactions.length - 3} more recurring transactions
                </p>
              )}
            </div>
          )}
      </div>

      {/* Upcoming Events */}
      <div className="card">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Calendar className="h-4 w-4" />
          Upcoming Financial Events
        </h3>
        <div className="space-y-2">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center min-w-0">
                  <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" style={{ color: 'var(--color-highlight)' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{event.event}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                </div>
                {event.amount > 0 && (
                  <span className="text-sm font-semibold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--color-success)' }}>
                    +{formatLargeNumber(event.amount)}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No upcoming financial events</p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Alerts */}
      <SmartAlertsWidget />

      {/* Mint-like Spending Insights */}
      <SpendingInsightsWidget />
    </div>
  );
};

export default Dashboard;