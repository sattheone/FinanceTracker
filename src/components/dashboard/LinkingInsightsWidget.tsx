import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Target, 
  Shield, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Bell, 

  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { transactionLinkingService } from '../../services/transactionLinkingService';
import { EntityProgress, EntityHierarchy, LinkingNotification } from '../../types';

const LinkingInsightsWidget: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions, goals, insurance, assets } = useData();
  
  const [entityProgress, setEntityProgress] = useState<EntityProgress[]>([]);
  const [entityHierarchy, setEntityHierarchy] = useState<EntityHierarchy[]>([]);
  const [notifications, setNotifications] = useState<LinkingNotification[]>([]);
  const [linkingStats, setLinkingStats] = useState({
    totalLinked: 0,
    totalUnlinked: 0,
    autoLinked: 0,
    manualLinked: 0,
    linkingPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLinkingData();
  }, [transactions, goals, insurance, assets]);

  const loadLinkingData = async () => {
    setIsLoading(true);
    try {
      // Calculate linking statistics
      const linkedTransactions = transactions.filter(t => t.isLinked);
      const autoLinkedTransactions = transactions.filter(t => t.autoLinked);
      const manualLinkedTransactions = linkedTransactions.filter(t => !t.autoLinked);
      
      setLinkingStats({
        totalLinked: linkedTransactions.length,
        totalUnlinked: transactions.length - linkedTransactions.length,
        autoLinked: autoLinkedTransactions.length,
        manualLinked: manualLinkedTransactions.length,
        linkingPercentage: transactions.length > 0 ? (linkedTransactions.length / transactions.length) * 100 : 0
      });

      // Load entity progress
      const progressData: EntityProgress[] = [];
      
      // Calculate progress for goals
      for (const goal of goals) {
        const linkedTransactions = transactions.filter(t => 
          t.entityLinks?.some(link => link.entityType === 'goal' && link.entityId === goal.id)
        );
        if (linkedTransactions.length > 0) {
          const progress = transactionLinkingService.calculateEntityProgress('goal', goal.id, goal, linkedTransactions);
          progressData.push(progress);
        }
      }

      // Calculate progress for insurance
      for (const ins of insurance) {
        const linkedTransactions = transactions.filter(t => 
          t.entityLinks?.some(link => link.entityType === 'insurance' && link.entityId === ins.id)
        );
        if (linkedTransactions.length > 0) {
          const progress = transactionLinkingService.calculateEntityProgress('insurance', ins.id, ins, linkedTransactions);
          progressData.push(progress);
        }
      }

      setEntityProgress(progressData.sort((a, b) => b.progressPercentage - a.progressPercentage));

      // Generate hierarchy
      const hierarchy = transactionLinkingService.generateEntityHierarchy(goals, insurance, assets, transactions);
      setEntityHierarchy(hierarchy);

      // Load notifications
      const notifs = transactionLinkingService.getNotifications().slice(0, 5);
      setNotifications(notifs);

    } catch (error) {
      console.error('Error loading linking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 75) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'milestone_achieved': return CheckCircle;
      case 'goal_progress': return Target;
      case 'auto_link_suggestion': return Link2;
      case 'rule_triggered': return BarChart3;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'milestone_achieved': return 'text-green-600';
      case 'goal_progress': return 'text-blue-600';
      case 'auto_link_suggestion': return 'text-yellow-600';
      case 'rule_triggered': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className={theme.card}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Linking Statistics */}
      <div className={theme.card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn(theme.heading4, 'flex items-center')}>
            <Link2 className="w-5 h-5 mr-2 text-blue-600" />
            Transaction Linking Overview
          </h3>
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            linkingStats.linkingPercentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            linkingStats.linkingPercentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          )}>
            {linkingStats.linkingPercentage.toFixed(1)}% Linked
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-2">
              <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className={cn(theme.textPrimary, 'text-lg font-semibold')}>{linkingStats.totalLinked}</p>
            <p className={cn(theme.textMuted, 'text-sm')}>Linked</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto mb-2">
              <AlertCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <p className={cn(theme.textPrimary, 'text-lg font-semibold')}>{linkingStats.totalUnlinked}</p>
            <p className={cn(theme.textMuted, 'text-sm')}>Unlinked</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto mb-2">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className={cn(theme.textPrimary, 'text-lg font-semibold')}>{linkingStats.autoLinked}</p>
            <p className={cn(theme.textMuted, 'text-sm')}>Auto-Linked</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-2">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className={cn(theme.textPrimary, 'text-lg font-semibold')}>{linkingStats.manualLinked}</p>
            <p className={cn(theme.textMuted, 'text-sm')}>Manual</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className={theme.textMuted}>Overall Linking Progress</span>
            <span className={theme.textPrimary}>{linkingStats.linkingPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                getProgressBgColor(linkingStats.linkingPercentage)
              )}
              style={{ width: `${Math.min(linkingStats.linkingPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Top Performing Entities */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading4, 'mb-4 flex items-center')}>
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Top Performing Entities
        </h3>

        <div className="space-y-4">
          {entityProgress.slice(0, 5).map((progress) => {
            const Icon = progress.entityType === 'goal' ? Target : Shield;
            return (
              <div key={`${progress.entityType}-${progress.entityId}`} className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Icon className={cn(
                    'w-5 h-5',
                    progress.entityType === 'goal' ? 'text-blue-600' : 'text-green-600'
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={cn(theme.textPrimary, 'font-medium truncate')}>{progress.entityName}</p>
                    <span className={cn(getProgressColor(progress.progressPercentage), 'text-sm font-medium')}>
                      {progress.progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className={cn('h-2 rounded-full transition-all duration-300', getProgressBgColor(progress.progressPercentage))}
                      style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={theme.textMuted}>
                      ₹{progress.currentAmount.toLocaleString()} / ₹{progress.targetAmount.toLocaleString()}
                    </span>
                    <span className={theme.textMuted}>
                      {progress.linkedTransactions.length} transactions
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {entityProgress.length === 0 && (
            <div className="text-center py-6">
              <Target className={cn(theme.textMuted, 'w-8 h-8 mx-auto mb-2')} />
              <p className={theme.textMuted}>No linked entities yet</p>
              <p className={cn(theme.textMuted, 'text-sm')}>Start linking transactions to see progress</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading4, 'mb-4 flex items-center')}>
          <Bell className="w-5 h-5 mr-2 text-orange-600" />
          Recent Activity
        </h3>

        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            return (
              <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg',
                  notification.type === 'milestone_achieved' ? 'bg-green-100 dark:bg-green-900/30' :
                  notification.type === 'goal_progress' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  notification.type === 'auto_link_suggestion' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                  'bg-purple-100 dark:bg-purple-900/30'
                )}>
                  <Icon className={cn('w-4 h-4', getNotificationColor(notification.type))} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(theme.textPrimary, 'font-medium text-sm')}>{notification.title}</p>
                  <p className={cn(theme.textMuted, 'text-xs mt-1')}>{notification.message}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className={cn(theme.textMuted, 'text-xs')}>
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="text-center py-6">
              <Bell className={cn(theme.textMuted, 'w-8 h-8 mx-auto mb-2')} />
              <p className={theme.textMuted}>No recent activity</p>
              <p className={cn(theme.textMuted, 'text-sm')}>Notifications will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Entity Hierarchy Preview */}
      {entityHierarchy.length > 0 && (
        <div className={theme.card}>
          <h3 className={cn(theme.heading4, 'mb-4 flex items-center')}>
            <PieChart className="w-5 h-5 mr-2 text-purple-600" />
            Entity Hierarchy
          </h3>

          <div className="space-y-4">
            {entityHierarchy.slice(0, 3).map((hierarchy) => (
              <div key={hierarchy.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h4 className={theme.textPrimary}>{hierarchy.name}</h4>
                  </div>
                  <div className="text-right">
                    <p className={cn(theme.textPrimary, 'font-semibold')}>
                      ₹{hierarchy.totalAmount.toLocaleString()}
                    </p>
                    <p className={cn(theme.textMuted, 'text-sm')}>
                      {hierarchy.progress.progressPercentage.toFixed(1)}% complete
                    </p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(hierarchy.progress.progressPercentage, 100)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {hierarchy.children.slice(0, 4).map((child) => {
                    const Icon = child.type === 'investment' ? TrendingUp : Shield;
                    return (
                      <div key={child.id} className="flex items-center space-x-2 text-sm">
                        <Icon className={cn(
                          'w-3 h-3',
                          child.type === 'investment' ? 'text-purple-600' : 'text-green-600'
                        )} />
                        <span className={cn(theme.textMuted, 'truncate')}>{child.name}</span>
                        <span className={theme.textPrimary}>₹{(child.amount / 1000).toFixed(0)}K</span>
                      </div>
                    );
                  })}
                  {hierarchy.children.length > 4 && (
                    <div className={cn(theme.textMuted, 'text-sm')}>
                      +{hierarchy.children.length - 4} more...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkingInsightsWidget;