import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Target, 
  Shield, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  PieChart,
  BarChart3,
  Bell,
  Brain
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { transactionLinkingService } from '../../services/transactionLinkingService';
import { 
  Transaction, 
  TransactionEntityLink, 
  EntityProgress, 
  EntityHierarchy,
  LinkingNotification 
} from '../../types';

interface TransactionLinkingManagerProps {
  transaction?: Transaction;
  onClose?: () => void;
  mode?: 'single' | 'bulk' | 'overview';
}

const TransactionLinkingManager: React.FC<TransactionLinkingManagerProps> = ({
  transaction,
  onClose
}) => {
  const theme = useThemeClasses();
  const { goals, insurance, assets, monthlyBudget, transactions } = useData();
  
  const [activeTab, setActiveTab] = useState<'links' | 'progress' | 'hierarchy' | 'rules' | 'notifications'>('links');
  const [entityLinks, setEntityLinks] = useState<TransactionEntityLink[]>([]);
  const [entityProgress, setEntityProgress] = useState<EntityProgress[]>([]);
  const [entityHierarchy, setEntityHierarchy] = useState<EntityHierarchy[]>([]);
  const [notifications, setNotifications] = useState<LinkingNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{type: string; id: string; name: string} | null>(null);
  const [linkAmount, setLinkAmount] = useState<number>(0);
  // const [linkPercentage] = useState<number>(100);
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<Array<{entityType: string; entityId: string; entityName: string; percentage: number}>>([]);

  useEffect(() => {
    if (transaction) {
      setEntityLinks(transaction.entityLinks || []);
      setLinkAmount(transaction.amount);
    }
    loadData();
  }, [transaction]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load entity progress
      const progressData: EntityProgress[] = [];
      
      // Calculate progress for goals
      for (const goal of goals) {
        const linkedTransactions = transactions.filter(t => 
          t.entityLinks?.some(link => link.entityType === 'goal' && link.entityId === goal.id)
        );
        const progress = transactionLinkingService.calculateEntityProgress('goal', goal.id, goal, linkedTransactions);
        progressData.push(progress);
      }

      // Calculate progress for insurance
      for (const ins of insurance) {
        const linkedTransactions = transactions.filter(t => 
          t.entityLinks?.some(link => link.entityType === 'insurance' && link.entityId === ins.id)
        );
        const progress = transactionLinkingService.calculateEntityProgress('insurance', ins.id, ins, linkedTransactions);
        progressData.push(progress);
      }

      setEntityProgress(progressData);

      // Generate hierarchy
      const hierarchy = transactionLinkingService.generateEntityHierarchy(goals, insurance, assets, transactions);
      setEntityHierarchy(hierarchy);

      // Load notifications
      const notifs = transactionLinkingService.getNotifications();
      setNotifications(notifs);

    } catch (error) {
      console.error('Error loading linking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoLink = async () => {
    if (!transaction) return;
    
    setIsLoading(true);
    try {
      const autoLinks = await transactionLinkingService.autoLinkTransaction(
        transaction,
        { goals, insurance, assets, budget: monthlyBudget }
      );
      
      setEntityLinks(autoLinks);
      
      // Show success notification
      alert(`Generated ${autoLinks.length} automatic links for this transaction`);
    } catch (error) {
      console.error('Error auto-linking transaction:', error);
      alert('Failed to auto-link transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLink = async () => {
    if (!transaction || !selectedEntity) return;

    try {
      const link = await transactionLinkingService.createManualLink(
        transaction.id,
        selectedEntity.type,
        selectedEntity.id,
        selectedEntity.name,
        linkAmount
      );

      setEntityLinks(prev => [...prev, link]);
      setShowLinkForm(false);
      setSelectedEntity(null);
      setLinkAmount(0);
    } catch (error) {
      console.error('Error creating manual link:', error);
      alert('Failed to create manual link');
    }
  };

  const handleSplitLink = async () => {
    if (!transaction || splits.length === 0) return;

    const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert('Split percentages must total 100%');
      return;
    }

    try {
      const splitLinks = await transactionLinkingService.createSplitLinks(transaction.id, splits);
      
      // Calculate actual amounts
      const linksWithAmounts = splitLinks.map(link => ({
        ...link,
        amount: (transaction.amount * link.percentage) / 100
      }));

      setEntityLinks(linksWithAmounts);
      setSplitMode(false);
      setSplits([]);
    } catch (error) {
      console.error('Error creating split links:', error);
      alert('Failed to create split links');
    }
  };

  const handleRemoveLink = (linkId: string) => {
    setEntityLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const addSplit = () => {
    if (!selectedEntity) return;
    
    const remainingPercentage = 100 - splits.reduce((sum, split) => sum + split.percentage, 0);
    
    setSplits(prev => [...prev, {
      entityType: selectedEntity.type,
      entityId: selectedEntity.id,
      entityName: selectedEntity.name,
      percentage: Math.min(remainingPercentage, 50)
    }]);
    
    setSelectedEntity(null);
  };

  const updateSplitPercentage = (index: number, percentage: number) => {
    setSplits(prev => prev.map((split, i) => 
      i === index ? { ...split, percentage } : split
    ));
  };

  const removeSplit = (index: number) => {
    setSplits(prev => prev.filter((_, i) => i !== index));
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'goal': return Target;
      case 'insurance': return Shield;
      case 'asset': return TrendingUp;
      case 'budget': return PieChart;
      default: return Link2;
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'goal': return 'text-blue-600 dark:text-blue-400';
      case 'insurance': return 'text-green-600 dark:text-green-400';
      case 'asset': return 'text-purple-600 dark:text-purple-400';
      case 'budget': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderLinksTab = () => (
    <div className="space-y-6">
      {/* Transaction Info */}
      {transaction && (
        <div className={cn(theme.card, 'border-l-4 border-blue-500')}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={cn(theme.heading4, 'mb-1')}>{transaction.description}</h3>
              <p className={theme.textMuted}>
                {new Date(transaction.date).toLocaleDateString()} • ₹{transaction.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAutoLink}
                disabled={isLoading}
                className={cn(theme.btnSecondary, 'flex items-center')}
              >
                <Brain className="w-4 h-4 mr-2" />
                Auto-Link
              </button>
              <button
                onClick={() => setShowLinkForm(true)}
                className={cn(theme.btnPrimary, 'flex items-center')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </button>
            </div>
          </div>

          {/* Current Links */}
          {entityLinks.length > 0 && (
            <div className="space-y-3">
              <h4 className={cn(theme.textPrimary, 'font-medium')}>Current Links</h4>
              {entityLinks.map((link) => {
                const Icon = getEntityIcon(link.entityType);
                return (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className={cn('w-5 h-5', getEntityColor(link.entityType))} />
                      <div>
                        <p className={theme.textPrimary}>{link.entityName}</p>
                        <p className={theme.textMuted}>
                          ₹{link.amount.toLocaleString()} ({link.percentage.toFixed(1)}%)
                          {link.linkType === 'auto' && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto</span>}
                          {link.linkType === 'rule-based' && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Rule</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Link Form */}
      {showLinkForm && (
        <div className={theme.card}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={theme.heading4}>Add Entity Link</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSplitMode(!splitMode)}
                className={cn(
                  'px-3 py-1 text-sm rounded-lg transition-colors',
                  splitMode 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                )}
              >
                Split Mode
              </button>
              <button
                onClick={() => setShowLinkForm(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!splitMode ? (
            /* Single Link Form */
            <div className="space-y-4">
              <div>
                <label className={cn(theme.label, 'mb-2')}>Select Entity</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Goals */}
                  <div>
                    <h4 className={cn(theme.textMuted, 'text-sm mb-2')}>Goals</h4>
                    {goals.map(goal => (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedEntity({type: 'goal', id: goal.id, name: goal.name})}
                        className={cn(
                          'w-full p-3 text-left rounded-lg border transition-colors mb-2',
                          selectedEntity?.id === goal.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className={theme.textPrimary}>{goal.name}</span>
                        </div>
                        <p className={cn(theme.textMuted, 'text-sm mt-1')}>
                          ₹{goal.currentAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Insurance */}
                  <div>
                    <h4 className={cn(theme.textMuted, 'text-sm mb-2')}>Insurance</h4>
                    {insurance.map(ins => (
                      <button
                        key={ins.id}
                        onClick={() => setSelectedEntity({type: 'insurance', id: ins.id, name: ins.policyName})}
                        className={cn(
                          'w-full p-3 text-left rounded-lg border transition-colors mb-2',
                          selectedEntity?.id === ins.id
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className={theme.textPrimary}>{ins.policyName}</span>
                        </div>
                        <p className={cn(theme.textMuted, 'text-sm mt-1')}>
                          ₹{ins.premiumAmount.toLocaleString()} {ins.premiumFrequency}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedEntity && (
                <div className="space-y-4">
                  <div>
                    <label className={cn(theme.label, 'mb-2')}>Link Amount</label>
                    <input
                      type="number"
                      value={linkAmount}
                      onChange={(e) => setLinkAmount(Number(e.target.value))}
                      className={theme.input}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowLinkForm(false)}
                      className={theme.btnSecondary}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleManualLink}
                      className={theme.btnPrimary}
                    >
                      Create Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Split Mode Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className={theme.textPrimary}>Split Transaction</h4>
                <button
                  onClick={addSplit}
                  disabled={!selectedEntity}
                  className={cn(theme.btnSecondary, 'text-sm')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Split
                </button>
              </div>

              {/* Entity Selection for Split */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn(theme.label, 'mb-2')}>Select Entity</label>
                  <select
                    value={selectedEntity ? `${selectedEntity.type}:${selectedEntity.id}` : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [type, id] = e.target.value.split(':');
                        const entity = type === 'goal' 
                          ? goals.find(g => g.id === id)
                          : insurance.find(i => i.id === id);
                        if (entity) {
                          setSelectedEntity({
                            type,
                            id,
                            name: type === 'goal' ? (entity as any).name : (entity as any).policyName
                          });
                        }
                      }
                    }}
                    className={theme.select}
                  >
                    <option value="">Select entity...</option>
                    <optgroup label="Goals">
                      {goals.map(goal => (
                        <option key={goal.id} value={`goal:${goal.id}`}>{goal.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Insurance">
                      {insurance.map(ins => (
                        <option key={ins.id} value={`insurance:${ins.id}`}>{ins.policyName}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Current Splits */}
              {splits.length > 0 && (
                <div className="space-y-3">
                  <h4 className={cn(theme.textPrimary, 'font-medium')}>Current Splits</h4>
                  {splits.map((split, index) => {
                    const Icon = getEntityIcon(split.entityType);
                    return (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Icon className={cn('w-5 h-5', getEntityColor(split.entityType))} />
                        <div className="flex-1">
                          <p className={theme.textPrimary}>{split.entityName}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={split.percentage}
                            onChange={(e) => updateSplitPercentage(index, Number(e.target.value))}
                            className={cn(theme.input, 'w-20')}
                            min="0"
                            max="100"
                          />
                          <span className={theme.textMuted}>%</span>
                          <button
                            onClick={() => removeSplit(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className={theme.textPrimary}>
                      Total: {splits.reduce((sum, split) => sum + split.percentage, 0).toFixed(1)}%
                    </span>
                    <button
                      onClick={handleSplitLink}
                      disabled={Math.abs(splits.reduce((sum, split) => sum + split.percentage, 0) - 100) > 0.01}
                      className={theme.btnPrimary}
                    >
                      Apply Splits
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderProgressTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className={theme.heading3}>Entity Progress Tracking</h3>
        <button
          onClick={loadData}
          className={cn(theme.btnSecondary, 'flex items-center')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entityProgress.map((progress) => {
          const Icon = getEntityIcon(progress.entityType);
          return (
            <div key={`${progress.entityType}-${progress.entityId}`} className={theme.card}>
              <div className="flex items-center space-x-3 mb-4">
                <Icon className={cn('w-6 h-6', getEntityColor(progress.entityType))} />
                <div>
                  <h4 className={theme.textPrimary}>{progress.entityName}</h4>
                  <p className={theme.textMuted}>
                    {progress.progressPercentage.toFixed(1)}% funded
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={cn(
                      'h-3 rounded-full transition-all duration-300',
                      progress.progressPercentage >= 100 ? 'bg-green-500' :
                      progress.progressPercentage >= 75 ? 'bg-blue-500' :
                      progress.progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={theme.textMuted}>Current</p>
                    <p className={theme.textPrimary}>₹{progress.currentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={theme.textMuted}>Target</p>
                    <p className={theme.textPrimary}>₹{progress.targetAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={theme.textMuted}>Monthly</p>
                    <p className={theme.textPrimary}>₹{progress.monthlyContribution.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={theme.textMuted}>Completion</p>
                    <p className={theme.textPrimary}>
                      {progress.projectedCompletion 
                        ? new Date(progress.projectedCompletion).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                {/* Milestones */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className={cn(theme.textMuted, 'text-sm mb-2')}>Milestones</p>
                  <div className="flex space-x-2">
                    {progress.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className={cn(
                          'px-2 py-1 text-xs rounded-full',
                          milestone.isAchieved
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        )}
                      >
                        {milestone.name}
                        {milestone.isAchieved && <Check className="w-3 h-3 ml-1 inline" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderHierarchyTab = () => (
    <div className="space-y-6">
      <h3 className={theme.heading3}>Hierarchical Entity Views</h3>
      
      {entityHierarchy.map((hierarchy) => (
        <div key={hierarchy.id} className={theme.card}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className={theme.textPrimary}>{hierarchy.name}</h4>
                <p className={theme.textMuted}>
                  ₹{hierarchy.totalAmount.toLocaleString()} • {hierarchy.progress.progressPercentage.toFixed(1)}% complete
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(theme.textPrimary, 'font-semibold')}>
                ₹{hierarchy.progress.currentAmount.toLocaleString()}
              </p>
              <p className={theme.textMuted}>
                of ₹{hierarchy.progress.targetAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(hierarchy.progress.progressPercentage, 100)}%` }}
            ></div>
          </div>

          <div className="space-y-3">
            {hierarchy.children.map((child) => {
              const Icon = child.type === 'investment' ? TrendingUp : Shield;
              return (
                <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={cn(
                      'w-5 h-5',
                      child.type === 'investment' ? 'text-purple-600' : 'text-green-600'
                    )} />
                    <div>
                      <p className={theme.textPrimary}>{child.name}</p>
                      <p className={theme.textMuted}>
                        {child.transactions.length} transactions
                        {child.lastContribution && (
                          <span className="ml-2">
                            • Last: {new Date(child.lastContribution).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={theme.textPrimary}>₹{child.amount.toLocaleString()}</p>
                    <p className={theme.textMuted}>{child.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className={theme.heading3}>Linking Notifications</h3>
        <Bell className="w-6 h-6 text-blue-600" />
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              theme.card,
              'border-l-4',
              notification.type === 'milestone_achieved' ? 'border-green-500' :
              notification.type === 'goal_progress' ? 'border-blue-500' :
              notification.type === 'auto_link_suggestion' ? 'border-yellow-500' :
              notification.type === 'rule_triggered' ? 'border-purple-500' : 'border-gray-500',
              !notification.isRead && 'bg-blue-50 dark:bg-blue-900/10'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={cn(theme.textPrimary, 'font-medium mb-1')}>
                  {notification.title}
                </h4>
                <p className={theme.textMuted}>{notification.message}</p>
                <p className={cn(theme.textMuted, 'text-xs mt-2')}>
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {!notification.isRead && (
                <button
                  onClick={() => transactionLinkingService.markNotificationAsRead(notification.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8">
            <Bell className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-4')} />
            <p className={theme.textMuted}>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={theme.heading2}>Transaction Linking Manager</h2>
          <p className={theme.textMuted}>
            Connect transactions to goals, insurance, and other financial entities
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {[
          { id: 'links', label: 'Entity Links', icon: Link2 },
          { id: 'progress', label: 'Progress Tracking', icon: BarChart3 },
          { id: 'hierarchy', label: 'Hierarchy View', icon: PieChart },
          { id: 'notifications', label: 'Notifications', icon: Bell }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'links' && renderLinksTab()}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'hierarchy' && renderHierarchyTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
        </>
      )}
    </div>
  );
};

export default TransactionLinkingManager;