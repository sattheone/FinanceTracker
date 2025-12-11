import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Link2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Goal, Asset } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import SIPLinkingModal from './SIPLinkingModal';
import GoalSIPService from '../../services/goalSIPService';

interface UnifiedGoalCardProps {
  goal: Goal;
  sipAssets?: Asset[];
  onEdit?: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
  onLinkSIP?: (goal: Goal) => void;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

const UnifiedGoalCard: React.FC<UnifiedGoalCardProps> = ({
  goal,
  sipAssets = [],
  onEdit,
  onDelete,
  onLinkSIP,
  size = 'medium',
  showDetails = false
}) => {
  const theme = useThemeClasses();
  const [showSIPLinkingModal, setShowSIPLinkingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(goal);

  useEffect(() => {
    setCurrentGoal(goal);
  }, [goal]);

  // Calculate progress
  const progress = currentGoal.targetAmount > 0 ? (currentGoal.currentAmount / currentGoal.targetAmount) * 100 : 0;
  const remainingAmount = Math.max(0, currentGoal.targetAmount - currentGoal.currentAmount);

  // Calculate time remaining
  const today = new Date();
  const targetDate = new Date(currentGoal.targetDate);
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

  // Get linked SIP assets
  const linkedSIPs = sipAssets.filter(asset =>
    currentGoal.linkedSIPAssets?.includes(asset.id) || false
  );
  const totalLinkedSIPAmount = GoalSIPService.getTotalMonthlySIP(currentGoal, sipAssets);

  // Get goal status using GoalSIPService
  const startDate = new Date(currentGoal.targetDate);
  startDate.setMonth(startDate.getMonth() - monthsRemaining);
  const goalStatus = GoalSIPService.getGoalStatus(currentGoal, startDate);

  // Calculate required monthly contribution
  const requiredMonthlySIP = goalStatus.requiredMonthly;

  const handleSIPLinked = (updatedGoal: Goal) => {
    setCurrentGoal(updatedGoal);
    if (onLinkSIP) {
      onLinkSIP(updatedGoal);
    }
  };

  // Goal category styling
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'retirement': return { icon: '🏖️', color: 'purple', name: 'Retirement' };
      case 'education': return { icon: '🎓', color: 'blue', name: 'Education' };
      case 'marriage': return { icon: '💒', color: 'pink', name: 'Marriage' };
      case 'house': return { icon: '🏠', color: 'green', name: 'House' };
      case 'emergency': return { icon: '🛡️', color: 'red', name: 'Emergency Fund' };
      case 'vacation': return { icon: '✈️', color: 'orange', name: 'Vacation' };
      default: return { icon: '🎯', color: 'gray', name: 'Other' };
    }
  };

  const categoryInfo = getCategoryInfo(currentGoal.category);

  // Progress color
  const getProgressColor = () => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-50 dark:bg-yellow-900/200';
    if (progress >= 25) return 'bg-orange-50 dark:bg-orange-900/200';
    return 'bg-gray-400';
  };

  // Status indicator based on GoalSIPService
  const getStatus = () => {
    if (progress >= 100) return { text: 'Completed', color: 'text-green-600', icon: CheckCircle };
    if (daysRemaining < 0) return { text: 'Overdue', color: 'text-red-600', icon: AlertCircle };

    switch (goalStatus.status) {
      case 'ahead':
        return { text: 'Ahead', color: 'text-green-600', icon: TrendingUp };
      case 'on-track':
        return { text: 'On Track', color: 'text-green-600', icon: TrendingUp };
      case 'behind':
        return { text: 'Behind', color: 'text-orange-600', icon: AlertCircle };
      default:
        return { text: 'On Track', color: 'text-green-600', icon: TrendingUp };
    }
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const cardSizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8'
  };

  return (
    <div className={cn(
      theme.card,
      cardSizeClasses[size],
      'hover:shadow-lg transition-all duration-200',
      progress >= 100 && 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/10'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
            `bg-${categoryInfo.color}-100 dark:bg-${categoryInfo.color}-900/30`
          )}>
            {categoryInfo.icon}
          </div>
          <div>
            <h3 className={cn(theme.textPrimary, 'font-semibold text-lg')}>{currentGoal.name}</h3>
            <div className="flex items-center space-x-2">
              <span className={cn(theme.textMuted, 'text-sm')}>{categoryInfo.name}</span>
              <div className={cn('flex items-center space-x-1', status.color)}>
                <StatusIcon className="w-3 h-3" />
                <span className="text-xs font-medium">{status.text}</span>
              </div>
            </div>
          </div>
        </div>

        {currentGoal.priority === 'high' && (
          <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded-full">
            High Priority
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={cn(theme.textSecondary, 'text-sm')}>Progress</span>
          <span className={cn(theme.textPrimary, 'text-sm font-semibold')}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={cn('h-3 rounded-full transition-all duration-500', getProgressColor())}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span>{formatCurrency(currentGoal.currentAmount)}</span>
          <span>{formatCurrency(currentGoal.targetAmount)}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-1 mb-1">
            <DollarSign className="w-3 h-3 text-gray-500" />
            <span className={cn(theme.textMuted, 'text-xs')}>Monthly SIP</span>
          </div>
          <div className="flex flex-col">
            <span className={cn(theme.textPrimary, 'font-semibold')}>
              {formatCurrency(currentGoal.monthlyContribution)}
            </span>
            {requiredMonthlySIP > currentGoal.monthlyContribution && (
              <span className="text-xs text-orange-600">
                Need: {formatCurrency(requiredMonthlySIP)}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-1 mb-1">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className={cn(theme.textMuted, 'text-xs')}>Time Left</span>
          </div>
          <span className={cn(theme.textPrimary, 'font-semibold')}>
            {daysRemaining > 0 ? `${Math.floor(monthsRemaining)}m` : 'Overdue'}
          </span>
        </div>
      </div>

      {/* Linked SIP Assets */}
      {linkedSIPs.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Linked SIPs ({linkedSIPs.length})
            </span>
          </div>
          <div className="space-y-1">
            {linkedSIPs.slice(0, 2).map(asset => (
              <div key={asset.id} className="flex items-center justify-between text-xs">
                <span className="text-blue-700 dark:text-blue-300">{asset.name}</span>
                <span className="font-medium">{formatCurrency(asset.sipAmount || 0)}/mo</span>
              </div>
            ))}
            {linkedSIPs.length > 2 && (
              <div className="text-xs text-blue-600">
                +{linkedSIPs.length - 2} more
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">Total Monthly</span>
              <span className="font-semibold text-blue-800 dark:text-blue-200">
                {formatCurrency(totalLinkedSIPAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Target: {formatDate(currentGoal.targetDate)}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSIPLinkingModal(true)}
            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Link SIP
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(currentGoal)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className={cn(theme.textPrimary, 'text-lg font-semibold mb-2')}>Delete Goal?</h3>
            <p className={cn(theme.textSecondary, 'mb-4')}>
              Are you sure you want to delete "{currentGoal.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDelete) {
                    onDelete(currentGoal);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className={theme.textMuted}>Remaining Amount:</span>
              <span className={cn(theme.textPrimary, 'font-medium ml-2')}>
                {formatCurrency(remainingAmount)}
              </span>
            </div>
            <div>
              <span className={theme.textMuted}>Expected Return:</span>
              <span className={cn(theme.textPrimary, 'font-medium ml-2')}>
                {currentGoal.expectedReturnRate}% p.a.
              </span>
            </div>
          </div>

          {currentGoal.description && (
            <div>
              <span className={cn(theme.textMuted, 'text-sm')}>Description:</span>
              <p className={cn(theme.textPrimary, 'text-sm mt-1')}>{currentGoal.description}</p>
            </div>
          )}
        </div>
      )}

      {/* SIP Linking Modal */}
      <SIPLinkingModal
        goal={currentGoal}
        isOpen={showSIPLinkingModal}
        onClose={() => setShowSIPLinkingModal(false)}
        onLinked={handleSIPLinked}
      />
    </div>
  );
};

export default UnifiedGoalCard;