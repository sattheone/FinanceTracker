import React, { useState, useEffect } from 'react';
import {
  Heart,
  Target,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';

interface WellnessMetric {
  id: string;
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
  recommendation: string;
  weight: number;
  trend?: 'up' | 'down' | 'stable';
}

const FinancialWellnessWidget: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions, goals, assets, insurance, monthlyBudget, bills } = useData();
  const [wellnessScore, setWellnessScore] = useState(0);
  const [metrics, setMetrics] = useState<WellnessMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    calculateWellnessScore();
  }, [transactions, goals, assets, insurance, monthlyBudget, bills]);

  const calculateWellnessScore = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate monthly expenses
    const monthlyExpenses = Math.abs(transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth &&
          tDate.getFullYear() === currentYear &&
          t.amount < 0 &&
          t.category !== 'transfer';
      })
      .reduce((sum, t) => sum + t.amount, 0));

    // Calculate monthly income
    const monthlyIncome = monthlyBudget.income || 50000; // Default if not set

    // 1. Emergency Fund Score (25% weight)
    const emergencyFund = assets
      .filter(asset => asset.category === 'cash' || asset.category === 'fixed_deposit')
      .reduce((sum, asset) => sum + asset.currentValue, 0);

    const emergencyFundMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
    const emergencyScore = Math.min(100, (emergencyFundMonths / 6) * 100);

    // 2. Debt-to-Income Ratio (20% weight)
    const monthlyDebtPayments = bills
      .filter(bill => bill.category === 'loan' || bill.category === 'credit_card')
      .reduce((sum, bill) => sum + bill.amount, 0);

    const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) * 100 : 0;
    const debtScore = Math.max(0, 100 - (debtToIncomeRatio * 2.5)); // Penalty increases with ratio

    // 3. Savings Rate (20% weight)
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    const savingsScore = Math.min(100, Math.max(0, savingsRate * 5)); // 20% savings rate = 100 score

    // 4. Investment Diversification (15% weight)
    const totalInvestments = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const assetTypes = [...new Set(assets.map(asset => asset.category))].length;
    const diversificationScore = totalInvestments > 0 ? Math.min(100, assetTypes * 20) : 0;

    // 5. Goal Progress (10% weight)
    const goalProgress = goals.length > 0
      ? goals.reduce((sum, goal) => sum + Math.min(100, (goal.currentAmount / goal.targetAmount) * 100), 0) / goals.length
      : 0;

    // 6. Insurance Coverage (10% weight)
    const totalCoverage = insurance.reduce((sum, policy) => sum + policy.coverAmount, 0);
    const annualIncome = monthlyIncome * 12;
    const coverageRatio = annualIncome > 0 ? totalCoverage / annualIncome : 0;
    const insuranceScore = Math.min(100, (coverageRatio / 10) * 100); // 10x income = 100 score

    const metricsData: WellnessMetric[] = [
      {
        id: 'emergency',
        name: 'Emergency Fund',
        score: Math.round(emergencyScore),
        status: emergencyScore >= 80 ? 'excellent' : emergencyScore >= 60 ? 'good' : emergencyScore >= 40 ? 'fair' : 'poor',
        description: `${emergencyFundMonths.toFixed(1)} months of expenses saved`,
        recommendation: emergencyScore < 80 ? 'Build emergency fund to 3-6 months of expenses' : 'Great emergency fund coverage!',
        weight: 25,
        trend: 'stable'
      },
      {
        id: 'debt',
        name: 'Debt Management',
        score: Math.round(debtScore),
        status: debtScore >= 80 ? 'excellent' : debtScore >= 60 ? 'good' : debtScore >= 40 ? 'fair' : 'poor',
        description: `${debtToIncomeRatio.toFixed(1)}% debt-to-income ratio`,
        recommendation: debtScore < 80 ? 'Reduce debt payments to below 30% of income' : 'Excellent debt management!',
        weight: 20,
        trend: 'stable'
      },
      {
        id: 'savings',
        name: 'Savings Rate',
        score: Math.round(savingsScore),
        status: savingsScore >= 80 ? 'excellent' : savingsScore >= 60 ? 'good' : savingsScore >= 40 ? 'fair' : 'poor',
        description: `${savingsRate.toFixed(1)}% of income saved`,
        recommendation: savingsScore < 80 ? 'Aim to save at least 20% of your income' : 'Outstanding savings discipline!',
        weight: 20,
        trend: 'up'
      },
      {
        id: 'diversification',
        name: 'Investment Diversification',
        score: Math.round(diversificationScore),
        status: diversificationScore >= 80 ? 'excellent' : diversificationScore >= 60 ? 'good' : diversificationScore >= 40 ? 'fair' : 'poor',
        description: `${assetTypes} different asset types`,
        recommendation: diversificationScore < 80 ? 'Diversify across more asset classes' : 'Well-diversified portfolio!',
        weight: 15,
        trend: 'stable'
      },
      {
        id: 'goals',
        name: 'Goal Achievement',
        score: Math.round(goalProgress),
        status: goalProgress >= 80 ? 'excellent' : goalProgress >= 60 ? 'good' : goalProgress >= 40 ? 'fair' : 'poor',
        description: `${goalProgress.toFixed(1)}% average goal progress`,
        recommendation: goalProgress < 80 ? 'Review and adjust your financial goals' : 'Excellent goal tracking!',
        weight: 10,
        trend: 'up'
      },
      {
        id: 'insurance',
        name: 'Insurance Coverage',
        score: Math.round(insuranceScore),
        status: insuranceScore >= 80 ? 'excellent' : insuranceScore >= 60 ? 'good' : insuranceScore >= 40 ? 'fair' : 'poor',
        description: `${coverageRatio.toFixed(1)}x annual income coverage`,
        recommendation: insuranceScore < 80 ? 'Increase insurance coverage to 10-15x income' : 'Adequate insurance protection!',
        weight: 10,
        trend: 'stable'
      }
    ];

    // Calculate weighted overall score
    const totalWeightedScore = metricsData.reduce((sum, metric) => sum + (metric.score * metric.weight), 0);
    const totalWeight = metricsData.reduce((sum, metric) => sum + metric.weight, 0);
    const overallScore = Math.round(totalWeightedScore / totalWeight);

    setWellnessScore(overallScore);
    setMetrics(metricsData);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/200';
    if (score >= 40) return 'bg-orange-50 dark:bg-orange-900/200';
    return 'bg-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return CheckCircle;
      case 'good': return CheckCircle;
      case 'fair': return AlertCircle;
      case 'poor': return XCircle;
      default: return Info;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'fair': return 'text-yellow-600 dark:text-yellow-400';
      case 'poor': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return ArrowUp;
      case 'down': return ArrowDown;
      case 'stable': return Minus;
      default: return Minus;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      case 'stable': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getWellnessLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600 dark:text-green-400', emoji: '🌟' };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600 dark:text-blue-400', emoji: '👍' };
    if (score >= 40) return { level: 'Fair', color: 'text-yellow-600 dark:text-yellow-400', emoji: '⚠️' };
    return { level: 'Needs Improvement', color: 'text-red-600 dark:text-red-400', emoji: '🚨' };
  };

  const wellness = getWellnessLevel(wellnessScore);

  return (
    <div className={theme.card}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={cn(theme.heading3, 'flex items-center')}>
          <Heart className="w-5 h-5 mr-2 text-pink-500" />
          Financial Wellness
        </h3>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', wellness.color)}>
            {wellnessScore}/100
          </div>
          <div className={cn('text-sm', wellness.color)}>
            {wellness.emoji} {wellness.level}
          </div>
        </div>
      </div>

      {/* Overall Score Visualization */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className={theme.textMuted}>Overall Wellness Score</span>
          <span className={cn('font-medium', getScoreColor(wellnessScore))}>
            {wellnessScore}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={cn('h-3 rounded-full transition-all duration-500', getScoreBgColor(wellnessScore))}
            style={{ width: `${wellnessScore}%` }}
          ></div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const StatusIcon = getStatusIcon(metric.status);
          const TrendIcon = getTrendIcon(metric.trend);
          const isSelected = selectedMetric === metric.id;

          return (
            <div
              key={metric.id}
              onClick={() => setSelectedMetric(isSelected ? null : metric.id)}
              className={cn(
                'p-4 rounded-lg border cursor-pointer transition-all duration-200',
                isSelected
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <StatusIcon className={cn('w-4 h-4', getStatusColor(metric.status))} />
                  <span className={cn(theme.textPrimary, 'font-medium text-sm')}>
                    {metric.name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendIcon className={cn('w-3 h-3', getTrendColor(metric.trend))} />
                  <span className={cn('text-sm font-medium', getScoreColor(metric.score))}>
                    {metric.score}
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-300', getScoreBgColor(metric.score))}
                    style={{ width: `${metric.score}%` }}
                  ></div>
                </div>
              </div>

              <p className={cn(theme.textMuted, 'text-xs mb-1')}>
                {metric.description}
              </p>

              {isSelected && (
                <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Recommendation:</strong> {metric.recommendation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
        <h4 className={cn(theme.textPrimary, 'font-medium mb-3 flex items-center')}>
          <Target className="w-4 h-4 mr-2" />
          Quick Actions to Improve
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {metrics
            .filter(metric => metric.score < 70)
            .slice(0, 4)
            .map((metric) => (
              <button
                key={metric.id}
                className="text-left p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Improve {metric.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Current: {metric.score}/100
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Wellness Tips */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
              Wellness Tip
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {wellnessScore >= 80
                ? "Excellent financial health! Consider exploring advanced investment strategies."
                : wellnessScore >= 60
                  ? "Good progress! Focus on building your emergency fund and reducing debt."
                  : wellnessScore >= 40
                    ? "You're on the right track. Prioritize emergency savings and debt reduction."
                    : "Start with the basics: create a budget, build emergency savings, and track expenses."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialWellnessWidget;