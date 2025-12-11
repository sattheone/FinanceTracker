import React, { useState } from 'react';
import { Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import SimpleGoalTracker from '../../services/simpleGoalTracker';
import { formatCurrency } from '../../utils/formatters';

const goalTracker = new SimpleGoalTracker();

const SimpleGoalTrackerComponent: React.FC = () => {
  const { goals } = useData();
  const theme = useThemeClasses();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  // Calculate progress for all goals
  const goalProgress = goalTracker.getAllGoalProgress(goals);

  // Removed unused function

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-50 dark:bg-yellow-900/200';
    return 'bg-gray-400';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={theme.heading2}>Goal Progress Tracker</h2>
          <p className={theme.textSecondary}>Simple and effective goal tracking</p>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goalProgress.map((progress) => (
          <div
            key={progress.goalId}
            className={cn(
              theme.card,
              'hover:shadow-lg transition-shadow cursor-pointer',
              selectedGoal === progress.goalId && 'ring-2 ring-blue-500'
            )}
            onClick={() => setSelectedGoal(
              selectedGoal === progress.goalId ? null : progress.goalId
            )}
          >
            {/* Goal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className={cn(theme.textPrimary, 'font-semibold')}>
                    {progress.goalName}
                  </h3>
                  <p className={cn(theme.textMuted, 'text-sm')}>
                    {formatCurrency(progress.currentAmount)} of {formatCurrency(progress.targetAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={cn(theme.textSecondary, 'text-sm')}>Progress</span>
                <span className={cn(theme.textPrimary, 'text-sm font-medium')}>
                  {progress.progressPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all duration-300',
                    getProgressColor(progress.progressPercentage)
                  )}
                  style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <DollarSign className="w-3 h-3 text-gray-500" />
                  <span className={theme.textMuted}>Monthly Avg</span>
                </div>
                <span className={cn(theme.textPrimary, 'font-medium')}>
                  {formatCurrency(progress.monthlyAverage)}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span className={theme.textMuted}>Est. Complete</span>
                </div>
                <span className={cn(theme.textPrimary, 'font-medium text-xs')}>
                  {progress.estimatedCompletion 
                    ? new Date(progress.estimatedCompletion).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>

            {/* Contributions Summary */}
            {progress.contributedAmount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className={cn(theme.textMuted, 'text-sm')}>Total Contributed</span>
                  <span className={cn(
                    'text-sm font-medium',
                    getProgressTextColor(progress.progressPercentage)
                  )}>
                    {formatCurrency(progress.contributedAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Expanded Details */}
            {selectedGoal === progress.goalId && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <h4 className={cn(theme.textPrimary, 'font-medium text-sm')}>
                  Recent Contributions
                </h4>
                {progress.recentContributions.length > 0 ? (
                  <div className="space-y-2">
                    {progress.recentContributions.map((contribution) => (
                      <div
                        key={contribution.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className={theme.textMuted}>
                          {new Date(contribution.date).toLocaleDateString()}
                        </span>
                        <span className={cn(theme.textPrimary, 'font-medium')}>
                          +{formatCurrency(contribution.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={cn(theme.textMuted, 'text-sm')}>
                    No contributions yet
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, 'mb-4')}>This Month's Goal Contributions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
              {goalProgress.filter(g => g.progressPercentage > 0).length}
            </p>
            <p className={cn(theme.textMuted, 'text-sm')}>Active Goals</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Target className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
              {goalProgress.filter(g => g.progressPercentage >= 100).length}
            </p>
            <p className={cn(theme.textMuted, 'text-sm')}>Completed</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
              {formatCurrency(
                goalProgress.reduce((sum, g) => sum + g.monthlyAverage, 0)
              )}
            </p>
            <p className={cn(theme.textMuted, 'text-sm')}>Monthly Total</p>
          </div>
        </div>
      </div>

      {/* Simple Suggestion */}
      <div className={cn(theme.card, 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700')}>
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">💡</span>
          </div>
          <div>
            <h4 className={cn(theme.textPrimary, 'font-medium mb-2')}>
              Simple Goal Tracking
            </h4>
            <p className={cn(theme.textSecondary, 'text-sm')}>
              This simplified approach focuses on what matters most: tracking your progress toward financial goals. 
              No complex rules or linking systems - just clear, actionable insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleGoalTrackerComponent;