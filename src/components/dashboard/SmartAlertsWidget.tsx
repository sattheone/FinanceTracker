import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,

  Target,
  Shield,
  DollarSign,

  Bell,
  X,
  CheckCircle,
  ArrowRight,
  Zap,

} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';

interface SmartAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'spending' | 'bills' | 'goals' | 'investment' | 'tax' | 'insurance';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
  priority: number;
  createdAt: Date;
}

const SmartAlertsWidget: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions, goals, assets, insurance, monthlyBudget, bills } = useData();
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    generateSmartAlerts();
  }, [transactions, goals, assets, insurance, monthlyBudget, bills]);

  const generateSmartAlerts = () => {
    const newAlerts: SmartAlert[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // 1. Unusual Spending Alert
    const thisMonthSpending = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth &&
          tDate.getFullYear() === currentYear &&
          t.amount < 0 &&
          t.category !== 'transfer';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastMonthSpending = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return tDate.getMonth() === lastMonth &&
          tDate.getFullYear() === lastMonthYear &&
          t.amount < 0 &&
          t.category !== 'transfer';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (lastMonthSpending > 0 && thisMonthSpending > lastMonthSpending * 1.2) {
      newAlerts.push({
        id: 'unusual-spending',
        type: 'warning',
        category: 'spending',
        title: 'Unusual Spending Detected',
        message: `Your spending is ${Math.round(((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100)}% higher than last month (₹${(thisMonthSpending - lastMonthSpending).toLocaleString()} more)`,
        action: {
          label: 'View Transactions',
          onClick: () => window.location.href = '/transactions'
        },
        dismissible: true,
        priority: 8,
        createdAt: new Date()
      });
    }

    // 2. Upcoming Bill Reminders
    const upcomingBills = bills.filter(bill => {
      const nextDue = new Date(bill.dueDate);
      const daysUntilDue = Math.ceil((nextDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 3 && daysUntilDue >= 0;
    });

    upcomingBills.forEach(bill => {
      const daysUntilDue = Math.ceil((new Date(bill.dueDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      newAlerts.push({
        id: `bill-due-${bill.id}`,
        type: daysUntilDue === 0 ? 'critical' : 'warning',
        category: 'bills',
        title: daysUntilDue === 0 ? 'Bill Due Today!' : `Bill Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
        message: `${bill.name}: ₹${bill.amount.toLocaleString()}`,
        action: {
          label: 'Mark as Paid',
          onClick: () => console.log('Mark bill as paid:', bill.id)
        },
        dismissible: false,
        priority: daysUntilDue === 0 ? 10 : 9,
        createdAt: new Date()
      });
    });

    // 3. Goal Progress Alerts
    goals.forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const timeRemaining = new Date(goal.targetDate).getTime() - currentDate.getTime();
      const monthsRemaining = timeRemaining / (1000 * 60 * 60 * 24 * 30);
      const requiredMonthlyContribution = (goal.targetAmount - goal.currentAmount) / Math.max(monthsRemaining, 1);

      // Behind schedule alert
      if (monthsRemaining > 0 && monthsRemaining < 12 && progress < 50) {
        newAlerts.push({
          id: `goal-behind-${goal.id}`,
          type: 'warning',
          category: 'goals',
          title: `${goal.name} Behind Schedule`,
          message: `Only ${progress.toFixed(1)}% complete with ${monthsRemaining.toFixed(1)} months left. Consider increasing monthly contribution to ₹${requiredMonthlyContribution.toLocaleString()}.`,
          action: {
            label: 'Adjust Goal',
            onClick: () => console.log('Adjust goal:', goal.id)
          },
          dismissible: true,
          priority: 7,
          createdAt: new Date()
        });
      }

      // Goal achievement alert
      if (progress >= 100) {
        newAlerts.push({
          id: `goal-achieved-${goal.id}`,
          type: 'success',
          category: 'goals',
          title: 'Goal Achieved! 🎉',
          message: `Congratulations! You've reached your ${goal.name} target of ₹${goal.targetAmount.toLocaleString()}.`,
          dismissible: true,
          priority: 6,
          createdAt: new Date()
        });
      }
    });

    // 4. Investment Rebalancing Alert
    const totalInvestments = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const equityAssets = assets.filter(asset =>
      asset.category === 'stocks' || asset.category === 'mutual_funds'
    );
    const equityValue = equityAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const equityPercentage = totalInvestments > 0 ? (equityValue / totalInvestments) * 100 : 0;

    if (totalInvestments > 100000 && (equityPercentage > 80 || equityPercentage < 30)) {
      newAlerts.push({
        id: 'portfolio-rebalance',
        type: 'info',
        category: 'investment',
        title: 'Portfolio Rebalancing Needed',
        message: `Your equity allocation is ${equityPercentage.toFixed(1)}%. Consider ${equityPercentage > 80 ? 'reducing' : 'increasing'} equity exposure for better diversification.`,
        action: {
          label: 'View Portfolio',
          onClick: () => window.location.href = '/assets'
        },
        dismissible: true,
        priority: 5,
        createdAt: new Date()
      });
    }

    // 5. Tax Saving Opportunity
    const currentFinancialYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const taxSavingInvestments = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        const tYear = tDate.getMonth() >= 3 ? tDate.getFullYear() : tDate.getFullYear() - 1;
        return tYear === currentFinancialYear &&
          (t.description?.toLowerCase().includes('elss') ||
            t.description?.toLowerCase().includes('ppf') ||
            t.description?.toLowerCase().includes('nsc') ||
            t.description?.toLowerCase().includes('tax saver'));
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const remainingTaxSaving = Math.max(0, 150000 - taxSavingInvestments);
    const monthsLeft = 12 - (currentMonth >= 3 ? currentMonth - 3 : currentMonth + 9);

    if (remainingTaxSaving > 0 && monthsLeft <= 3) {
      newAlerts.push({
        id: 'tax-saving-urgent',
        type: monthsLeft <= 1 ? 'critical' : 'warning',
        category: 'tax',
        title: 'Tax Saving Deadline Approaching',
        message: `You can still save ₹${(remainingTaxSaving * 0.3).toLocaleString()} in taxes by investing ₹${remainingTaxSaving.toLocaleString()} in 80C instruments. Only ${monthsLeft} month${monthsLeft > 1 ? 's' : ''} left!`,
        action: {
          label: 'Invest Now',
          onClick: () => console.log('Navigate to tax saving investments')
        },
        dismissible: true,
        priority: monthsLeft <= 1 ? 10 : 8,
        createdAt: new Date()
      });
    }

    // 6. Emergency Fund Alert
    const monthlyExpenses = Math.abs(transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth &&
          tDate.getFullYear() === currentYear &&
          t.amount < 0 &&
          t.category !== 'transfer';
      })
      .reduce((sum, t) => sum + t.amount, 0));

    const emergencyFund = assets
      .filter(asset => asset.category === 'cash' || asset.category === 'fixed_deposit')
      .reduce((sum, asset) => sum + asset.currentValue, 0);

    const emergencyFundMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;

    if (emergencyFundMonths < 3) {
      newAlerts.push({
        id: 'emergency-fund-low',
        type: emergencyFundMonths < 1 ? 'critical' : 'warning',
        category: 'insurance',
        title: 'Emergency Fund Insufficient',
        message: `You have ${emergencyFundMonths.toFixed(1)} months of expenses saved. Experts recommend 3-6 months. Consider building your emergency fund.`,
        action: {
          label: 'Create Emergency Goal',
          onClick: () => console.log('Create emergency fund goal')
        },
        dismissible: true,
        priority: emergencyFundMonths < 1 ? 9 : 6,
        createdAt: new Date()
      });
    }

    // 7. Insurance Coverage Alert
    const totalInsuranceCoverage = insurance.reduce((sum, policy) => sum + policy.coverAmount, 0);
    const annualIncome = monthlyBudget.income * 12;

    if (annualIncome > 0 && totalInsuranceCoverage < annualIncome * 10) {
      newAlerts.push({
        id: 'insurance-coverage-low',
        type: 'warning',
        category: 'insurance',
        title: 'Insurance Coverage May Be Insufficient',
        message: `Your total coverage is ${(totalInsuranceCoverage / annualIncome).toFixed(1)}x your annual income. Consider increasing to 10-15x for adequate protection.`,
        action: {
          label: 'Review Insurance',
          onClick: () => window.location.href = '/insurance'
        },
        dismissible: true,
        priority: 4,
        createdAt: new Date()
      });
    }

    // Filter out dismissed alerts and sort by priority
    const filteredAlerts = newAlerts
      .filter(alert => !dismissedAlerts.includes(alert.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Show top 5 alerts

    setAlerts(filteredAlerts);
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getAlertIcon = (type: string, category: string) => {
    if (type === 'critical') return AlertTriangle;
    if (type === 'success') return CheckCircle;

    switch (category) {
      case 'spending': return TrendingDown;
      case 'bills': return Calendar;
      case 'goals': return Target;
      case 'investment': return TrendingUp;
      case 'tax': return DollarSign;
      case 'insurance': return Shield;
      default: return Bell;
    }
  };

  const getAlertColors = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200';
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200';
      default: return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200';
    }
  };

  const getIconColors = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className={theme.card}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <CheckCircle className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-3')} />
            <h4 className={cn(theme.textPrimary, 'font-medium mb-1')}>All Good!</h4>
            <p className={theme.textMuted}>No urgent alerts at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.card}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(theme.heading3, 'flex items-center')}>
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Smart Alerts
        </h3>
        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert.type, alert.category);
          return (
            <div
              key={alert.id}
              className={cn(
                'p-4 rounded-lg border transition-all duration-200',
                getAlertColors(alert.type)
              )}
            >
              <div className="flex items-start space-x-3">
                <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', getIconColors(alert.type))} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{alert.title}</h4>
                      <p className="text-sm opacity-90">{alert.message}</p>
                    </div>

                    {alert.dismissible && (
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="ml-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {alert.action && (
                    <button
                      onClick={alert.action.onClick}
                      className="mt-3 flex items-center text-sm font-medium hover:underline"
                    >
                      {alert.action.label}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartAlertsWidget;