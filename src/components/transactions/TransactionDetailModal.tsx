import React, { useState, useEffect } from 'react';
import { 
  X, 
  Link2, 
  Target, 
  Shield, 
  TrendingUp, 
  Calendar,
  CreditCard,
  Building2,
  Tag,
  DollarSign,
  Brain,

  Plus,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Users,
  Repeat
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { transactionLinkingService } from '../../services/transactionLinkingService';
import { Transaction, TransactionEntityLink } from '../../types';
import Modal from '../common/Modal';

interface TransactionDetailModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (transaction: Transaction) => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onUpdate
}) => {
  const theme = useThemeClasses();
  const { goals, insurance, assets, transactions, updateTransaction } = useData();
  
  const [activeTab, setActiveTab] = useState<'details' | 'linking' | 'similar'>('details');
  const [entityLinks, setEntityLinks] = useState<TransactionEntityLink[]>([]);
  const [suggestedLinks, setSuggestedLinks] = useState<TransactionEntityLink[]>([]);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{type: string; id: string; name: string} | null>(null);
  const [linkAmount, setLinkAmount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<Array<{entityType: string; entityId: string; entityName: string; percentage: number}>>([]);
  const [similarTransactions, setSimilarTransactions] = useState<Transaction[]>([]);
  const [bulkLinkMode, setBulkLinkMode] = useState<'none' | 'future' | 'all'>('none');

  useEffect(() => {
    if (transaction) {
      setEntityLinks(transaction.entityLinks || []);
      setLinkAmount(transaction.amount);
      findSimilarTransactions();
      generateSuggestedLinks();
    }
  }, [transaction]);

  const findSimilarTransactions = () => {
    const similar = transactions.filter(t => 
      t.id !== transaction.id && (
        t.description.toLowerCase().includes(transaction.description.toLowerCase().split(' ')[0]) ||
        t.category === transaction.category ||
        (t.amount === transaction.amount && t.type === transaction.type)
      )
    );
    setSimilarTransactions(similar.slice(0, 10)); // Limit to 10 similar transactions
  };

  const generateSuggestedLinks = async () => {
    setIsGeneratingLinks(true);
    try {
      const suggestions = await transactionLinkingService.autoLinkTransaction(
        transaction,
        { goals, insurance, assets, budget: { income: 0, expenses: { household: 0, insurance: 0, loans: 0, investments: 0, other: 0 }, surplus: 0 } }
      );
      setSuggestedLinks(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsGeneratingLinks(false);
    }
  };

  const handleApplySuggestion = (suggestion: TransactionEntityLink) => {
    const newLink = { ...suggestion, amount: transaction.amount };
    setEntityLinks([newLink]);
    setSuggestedLinks([]);
  };

  const handleManualLink = () => {
    console.log('handleManualLink called', { selectedEntity, linkAmount });
    if (!selectedEntity) {
      console.log('No selected entity');
      return;
    }

    if (linkAmount <= 0) {
      console.log('Invalid link amount:', linkAmount);
      return;
    }

    const newLink: TransactionEntityLink = {
      id: Date.now().toString(),
      transactionId: transaction.id,
      entityType: selectedEntity.type as any,
      entityId: selectedEntity.id,
      entityName: selectedEntity.name,
      amount: linkAmount,
      percentage: (linkAmount / transaction.amount) * 100,
      linkType: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Creating new link:', newLink);
    setEntityLinks(prev => {
      const updated = [...prev, newLink];
      console.log('Updated entity links:', updated);
      return updated;
    });
    setSelectedEntity(null);
    setLinkAmount(transaction.amount); // Reset to transaction amount instead of 0
  };

  const handleSplitLink = () => {
    const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert('Split percentages must total 100%');
      return;
    }

    const splitLinks = splits.map(split => ({
      id: Date.now().toString() + Math.random(),
      transactionId: transaction.id,
      entityType: split.entityType as any,
      entityId: split.entityId,
      entityName: split.entityName,
      amount: (transaction.amount * split.percentage) / 100,
      percentage: split.percentage,
      linkType: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setEntityLinks(splitLinks);
    setSplitMode(false);
    setSplits([]);
  };

  const handleRemoveLink = (linkId: string) => {
    setEntityLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const handleSaveLinks = async () => {
    console.log('handleSaveLinks called', { entityLinks, bulkLinkMode });
    
    const updatedTransaction = {
      ...transaction,
      entityLinks,
      isLinked: entityLinks.length > 0,
      autoLinked: entityLinks.some(link => link.linkType === 'auto' || link.linkType === 'rule-based')
    };

    console.log('Updating transaction:', updatedTransaction);

    try {
      await updateTransaction(transaction.id, updatedTransaction);
      console.log('Transaction updated successfully');
      
      if (onUpdate) {
        onUpdate(updatedTransaction);
      }

      // Handle bulk linking if selected
      if (bulkLinkMode !== 'none' && entityLinks.length > 0) {
        console.log('Applying bulk linking...');
        await handleBulkLinking();
      }

      onClose();
    } catch (error) {
      console.error('Error saving links:', error);
      alert('Failed to save links. Please try again.');
    }
  };

  const handleBulkLinking = async () => {
    let transactionsToUpdate: Transaction[] = [];

    if (bulkLinkMode === 'future') {
      transactionsToUpdate = transactions.filter(t => 
        t.id !== transaction.id &&
        new Date(t.date) > new Date(transaction.date) &&
        (t.description.toLowerCase().includes(transaction.description.toLowerCase()) ||
         t.category === transaction.category)
      );
    } else if (bulkLinkMode === 'all') {
      transactionsToUpdate = similarTransactions;
    }

    for (const t of transactionsToUpdate) {
      const updatedLinks = entityLinks.map(link => ({
        ...link,
        id: Date.now().toString() + Math.random(),
        transactionId: t.id,
        amount: (t.amount * link.percentage) / 100
      }));

      const updatedTransaction = {
        ...t,
        entityLinks: updatedLinks,
        isLinked: true,
        autoLinked: false
      };

      await updateTransaction(t.id, updatedTransaction);
    }
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
      default: return Link2;
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'goal': return 'text-blue-600 dark:text-blue-400';
      case 'insurance': return 'text-green-600 dark:text-green-400';
      case 'asset': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'investment': return '📈';
      case 'insurance': return '🛡️';
      default: return '💳';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'expense': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'investment': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'insurance': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
    }
  };

  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Transaction Header */}
      <div className="flex items-start space-x-4">
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-xl text-2xl',
          getTransactionTypeColor(transaction.type)
        )}>
          {getTransactionTypeIcon(transaction.type)}
        </div>
        <div className="flex-1">
          <h3 className={cn(theme.heading3, 'mb-1')}>{transaction.description}</h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className={cn(theme.textMuted, 'flex items-center')}>
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(transaction.date).toLocaleDateString()}
            </span>
            <span className={cn(theme.textMuted, 'flex items-center')}>
              <Tag className="w-4 h-4 mr-1" />
              {transaction.category}
            </span>
            <span className={cn(theme.textMuted, 'flex items-center')}>
              <DollarSign className="w-4 h-4 mr-1" />
              ₹{transaction.amount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className={cn(theme.textMuted, 'text-sm')}>Transaction Type</label>
            <div className={cn(
              'mt-1 px-3 py-2 rounded-lg flex items-center',
              getTransactionTypeColor(transaction.type)
            )}>
              <span className="text-lg mr-2">{getTransactionTypeIcon(transaction.type)}</span>
              <span className="capitalize font-medium">{transaction.type}</span>
            </div>
          </div>

          <div>
            <label className={cn(theme.textMuted, 'text-sm')}>Category</label>
            <div className={cn(theme.textPrimary, 'mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg')}>
              {transaction.category}
            </div>
          </div>

          <div>
            <label className={cn(theme.textMuted, 'text-sm')}>Amount</label>
            <div className={cn(theme.textPrimary, 'mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-semibold text-lg')}>
              ₹{transaction.amount.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {transaction.paymentMethod && (
            <div>
              <label className={cn(theme.textMuted, 'text-sm')}>Payment Method</label>
              <div className={cn(theme.textPrimary, 'mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center')}>
                <CreditCard className="w-4 h-4 mr-2" />
                {transaction.paymentMethod}
              </div>
            </div>
          )}

          {transaction.bankAccountId && (
            <div>
              <label className={cn(theme.textMuted, 'text-sm')}>Bank Account</label>
              <div className={cn(theme.textPrimary, 'mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center')}>
                <Building2 className="w-4 h-4 mr-2" />
                Account ID: {transaction.bankAccountId.slice(-4)}
              </div>
            </div>
          )}

          <div>
            <label className={cn(theme.textMuted, 'text-sm')}>Linking Status</label>
            <div className={cn(
              'mt-1 px-3 py-2 rounded-lg flex items-center',
              transaction.isLinked 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
            )}>
              <Link2 className="w-4 h-4 mr-2" />
              {transaction.isLinked ? 'Linked to entities' : 'Not linked'}
              {transaction.autoLinked && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Auto</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Links */}
      {entityLinks.length > 0 && (
        <div>
          <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Current Entity Links</h4>
          <div className="space-y-2">
            {entityLinks.map((link) => {
              const Icon = getEntityIcon(link.entityType);
              return (
                <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={cn('w-5 h-5', getEntityColor(link.entityType))} />
                    <div>
                      <p className={theme.textPrimary}>{link.entityName}</p>
                      <p className={cn(theme.textMuted, 'text-sm')}>
                        ₹{link.amount.toLocaleString()} ({link.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {link.linkType === 'auto' && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Auto</span>
                    )}
                    {link.linkType === 'rule-based' && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Rule</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderLinkingTab = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <h4 className={cn(theme.textPrimary, 'font-medium')}>Entity Linking</h4>
        <div className="flex items-center space-x-2">
          {suggestedLinks.length > 0 && (
            <button
              onClick={() => setEntityLinks(suggestedLinks)}
              className={cn(theme.btnSecondary, 'text-sm flex items-center')}
              disabled={isGeneratingLinks}
            >
              <Brain className="w-4 h-4 mr-1" />
              Apply All Suggestions
            </button>
          )}
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
        </div>
      </div>

      {/* Suggested Links */}
      {suggestedLinks.length > 0 && (
        <div>
          <h5 className={cn(theme.textMuted, 'text-sm mb-3')}>
            AI Suggestions {isGeneratingLinks && <span className="animate-pulse">(Generating...)</span>}
          </h5>
          <div className="space-y-2">
            {suggestedLinks.map((suggestion, index) => {
              const Icon = getEntityIcon(suggestion.entityType);
              return (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={cn('w-5 h-5', getEntityColor(suggestion.entityType))} />
                    <div>
                      <p className={theme.textPrimary}>{suggestion.entityName}</p>
                      <p className={cn(theme.textMuted, 'text-sm')}>
                        ₹{transaction.amount.toLocaleString()} (100%)
                        {suggestion.notes && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            {suggestion.notes}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion(suggestion)}
                    className={cn(theme.btnSecondary, 'text-sm')}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Apply
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Linking Form */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <h5 className={cn(theme.textPrimary, 'font-medium mb-3')}>
          {splitMode ? 'Add Split Link' : 'Add Manual Link'}
        </h5>
        
        <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select 
            value={selectedEntity ? `${selectedEntity.type}:${selectedEntity.id}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [type, id] = e.target.value.split(':');
                const entity = type === 'goal' 
                  ? goals.find(g => g.id === id)
                  : type === 'insurance'
                  ? insurance.find(i => i.id === id)
                  : assets.find(a => a.id === id);
                if (entity) {
                  setSelectedEntity({
                    type,
                    id,
                    name: type === 'goal' ? (entity as any).name : 
                          type === 'insurance' ? (entity as any).policyName : 
                          (entity as any).name
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
            <optgroup label="Assets">
              {assets.map(asset => (
                <option key={asset.id} value={`asset:${asset.id}`}>{asset.name}</option>
              ))}
            </optgroup>
          </select>

          {!splitMode && (
            <input
              type="number"
              value={linkAmount || transaction.amount}
              onChange={(e) => setLinkAmount(Number(e.target.value))}
              className={theme.input}
              placeholder={`Amount (max: ₹${transaction.amount.toLocaleString()})`}
              max={transaction.amount}
              min={1}
            />
          )}

          <button
            onClick={splitMode ? addSplit : handleManualLink}
            disabled={!selectedEntity || (!splitMode && (linkAmount <= 0 || linkAmount > transaction.amount))}
            className={cn(theme.btnSecondary, 'flex items-center justify-center')}
          >
            <Plus className="w-4 h-4 mr-1" />
            {splitMode ? 'Add to Split' : 'Add Link'}
          </button>
        </div>

        {/* Quick Link Full Amount */}
        {!splitMode && selectedEntity && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <p className={theme.textPrimary}>Quick Link: {selectedEntity.name}</p>
              <p className={cn(theme.textMuted, 'text-sm')}>Link full transaction amount (₹{transaction.amount.toLocaleString()})</p>
            </div>
            <button
              onClick={() => {
                setLinkAmount(transaction.amount);
                handleManualLink();
              }}
              className={cn(theme.btnPrimary, 'text-sm')}
            >
              Link Full Amount
            </button>
          </div>
        )}
        </div>

        {/* Split Mode Interface */}
        {splitMode && splits.length > 0 && (
          <div className="space-y-3">
            <h6 className={cn(theme.textPrimary, 'font-medium')}>Current Splits</h6>
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

      {/* Current Links with Remove Option */}
      {entityLinks.length > 0 && (
        <div>
          <h5 className={cn(theme.textPrimary, 'font-medium mb-3')}>Current Links</h5>
          <div className="space-y-2">
            {entityLinks.map((link) => {
              const Icon = getEntityIcon(link.entityType);
              return (
                <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={cn('w-5 h-5', getEntityColor(link.entityType))} />
                    <div>
                      <p className={theme.textPrimary}>{link.entityName}</p>
                      <p className={cn(theme.textMuted, 'text-sm')}>
                        ₹{link.amount.toLocaleString()} ({link.percentage.toFixed(1)}%)
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
        </div>
      )}

      {/* Bulk Linking Options */}
      {entityLinks.length > 0 && similarTransactions.length > 0 && (
        <div className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h5 className={cn(theme.textPrimary, 'font-medium')}>Bulk Link Similar Transactions</h5>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="bulkLink"
                  value="none"
                  checked={bulkLinkMode === 'none'}
                  onChange={(e) => setBulkLinkMode(e.target.value as any)}
                />
                <span className={theme.textPrimary}>Link only this transaction</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="bulkLink"
                  value="future"
                  checked={bulkLinkMode === 'future'}
                  onChange={(e) => setBulkLinkMode(e.target.value as any)}
                />
                <span className={theme.textPrimary}>Link future similar transactions</span>
              </label>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="bulkLink"
                  value="all"
                  checked={bulkLinkMode === 'all'}
                  onChange={(e) => setBulkLinkMode(e.target.value as any)}
                />
                <span className={theme.textPrimary}>Link all similar transactions ({similarTransactions.length})</span>
              </label>
              <Repeat className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          
          {bulkLinkMode !== 'none' && (
            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This will apply the same entity links to {bulkLinkMode === 'future' ? 'future' : 'all'} similar transactions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSimilarTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={cn(theme.textPrimary, 'font-medium')}>Similar Transactions</h4>
        <span className={cn(theme.textMuted, 'text-sm')}>
          Found {similarTransactions.length} similar transactions
        </span>
      </div>

      {similarTransactions.length > 0 ? (
        <div className="space-y-2">
          {similarTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm',
                  getTransactionTypeColor(t.type)
                )}>
                  {getTransactionTypeIcon(t.type)}
                </div>
                <div>
                  <p className={theme.textPrimary}>{t.description}</p>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className={theme.textMuted}>{new Date(t.date).toLocaleDateString()}</span>
                    <span className={theme.textMuted}>•</span>
                    <span className={theme.textMuted}>₹{t.amount.toLocaleString()}</span>
                    <span className={theme.textMuted}>•</span>
                    <span className={theme.textMuted}>{t.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {t.isLinked ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center">
                    <Check className="w-3 h-3 mr-1" />
                    Linked
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Unlinked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className={cn(theme.textMuted, 'w-8 h-8 mx-auto mb-2')} />
          <p className={theme.textMuted}>No similar transactions found</p>
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Transaction Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={theme.heading2}>Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {[
            { id: 'details', label: 'Details', icon: CreditCard },
            { id: 'linking', label: 'Entity Linking', icon: Link2 },
            { id: 'similar', label: 'Similar Transactions', icon: Users }
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
        <div className="min-h-[400px]">
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'linking' && renderLinkingTab()}
          {activeTab === 'similar' && renderSimilarTab()}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className={theme.btnSecondary}
          >
            Cancel
          </button>
          {activeTab === 'linking' && (
            <button
              onClick={handleSaveLinks}
              className={cn(theme.btnPrimary, 'flex items-center')}
            >
              <Check className="w-4 h-4 mr-2" />
              Save Links
              {bulkLinkMode !== 'none' && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded">
                  + Bulk
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TransactionDetailModal;