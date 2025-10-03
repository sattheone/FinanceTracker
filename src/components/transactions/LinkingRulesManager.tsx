import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Zap, 
  Target, 
  Shield, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { transactionLinkingService } from '../../services/transactionLinkingService';
import { LinkingRule, LinkingCondition, LinkingAction } from '../../types';

const LinkingRulesManager: React.FC = () => {
  const theme = useThemeClasses();
  const { goals, insurance, assets } = useData();
  
  const [rules, setRules] = useState<LinkingRule[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<LinkingRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    priority: 50,
    conditions: [] as LinkingCondition[],
    actions: [] as LinkingAction[]
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = () => {
    const existingRules = transactionLinkingService.getLinkingRules();
    setRules(existingRules);
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      isActive: true,
      priority: 50,
      conditions: [],
      actions: []
    });
    setShowRuleForm(true);
  };

  const handleEditRule = (rule: LinkingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      priority: rule.priority,
      conditions: [...rule.conditions],
      actions: [...rule.actions]
    });
    setShowRuleForm(true);
  };

  const handleSaveRule = () => {
    try {
      if (editingRule) {
        // Update existing rule
        transactionLinkingService.updateLinkingRule(editingRule.id, formData);
      } else {
        // Create new rule
        transactionLinkingService.createLinkingRule(formData);
      }
      
      loadRules();
      setShowRuleForm(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule');
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      transactionLinkingService.deleteLinkingRule(ruleId);
      loadRules();
    }
  };

  const handleToggleRule = (ruleId: string, isActive: boolean) => {
    transactionLinkingService.updateLinkingRule(ruleId, { isActive });
    loadRules();
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        field: 'description',
        operator: 'contains',
        value: '',
        caseSensitive: false
      }]
    }));
  };

  const updateCondition = (index: number, updates: Partial<LinkingCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, ...updates } : condition
      )
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        entityType: 'goal',
        entityId: '',
        allocationMethod: 'percentage',
        percentage: 100
      }]
    }));
  };

  const updateAction = (index: number, updates: Partial<LinkingAction>) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, ...updates } : action
      )
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const getEntityOptions = (entityType: string) => {
    switch (entityType) {
      case 'goal':
        return goals.map(goal => ({ id: goal.id, name: goal.name }));
      case 'insurance':
        return insurance.map(ins => ({ id: ins.id, name: ins.policyName }));
      case 'asset':
        return assets.map(asset => ({ id: asset.id, name: asset.name }));
      default:
        return [];
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'goal': return Target;
      case 'insurance': return Shield;
      case 'asset': return TrendingUp;
      default: return Target;
    }
  };

  const renderRuleForm = () => (
    <div className={cn(theme.card, 'space-y-6')}>
      <div className="flex items-center justify-between">
        <h3 className={theme.heading3}>
          {editingRule ? 'Edit Linking Rule' : 'Create Linking Rule'}
        </h3>
        <button
          onClick={() => setShowRuleForm(false)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={cn(theme.label, 'mb-2')}>Rule Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={theme.input}
            placeholder="e.g., SIP to Retirement Goal"
          />
        </div>
        <div>
          <label className={cn(theme.label, 'mb-2')}>Priority</label>
          <input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
            className={theme.input}
            min="1"
            max="100"
          />
        </div>
      </div>

      <div>
        <label className={cn(theme.label, 'mb-2')}>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className={theme.textarea}
          rows={2}
          placeholder="Describe what this rule does..."
        />
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
          className="flex items-center space-x-2"
        >
          {formData.isActive ? (
            <ToggleRight className="w-6 h-6 text-green-600" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-400" />
          )}
          <span className={theme.textPrimary}>Active</span>
        </button>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className={theme.textPrimary}>Conditions</h4>
          <button
            onClick={addCondition}
            className={cn(theme.btnSecondary, 'text-sm')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Condition
          </button>
        </div>

        <div className="space-y-3">
          {formData.conditions.map((condition, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={cn(theme.label, 'text-sm mb-1')}>Field</label>
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value as any })}
                    className={theme.select}
                  >
                    <option value="description">Description</option>
                    <option value="amount">Amount</option>
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                    <option value="bankAccount">Bank Account</option>
                    <option value="paymentMethod">Payment Method</option>
                  </select>
                </div>

                <div>
                  <label className={cn(theme.label, 'text-sm mb-1')}>Operator</label>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                    className={theme.select}
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts With</option>
                    <option value="endsWith">Ends With</option>
                    <option value="greaterThan">Greater Than</option>
                    <option value="lessThan">Less Than</option>
                    <option value="between">Between</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>

                <div>
                  <label className={cn(theme.label, 'text-sm mb-1')}>Value</label>
                  <input
                    type={condition.field === 'amount' ? 'number' : 'text'}
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { 
                      value: condition.field === 'amount' ? Number(e.target.value) : e.target.value 
                    })}
                    className={theme.input}
                    placeholder="Enter value..."
                  />
                </div>

                <div className="flex items-end space-x-2">
                  {condition.operator === 'between' && (
                    <input
                      type={condition.field === 'amount' ? 'number' : 'text'}
                      value={condition.secondValue || ''}
                      onChange={(e) => updateCondition(index, { 
                        secondValue: condition.field === 'amount' ? Number(e.target.value) : e.target.value 
                      })}
                      className={theme.input}
                      placeholder="To..."
                    />
                  )}
                  <button
                    onClick={() => removeCondition(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(condition.field === 'description' || condition.field === 'category') && (
                <div className="mt-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={condition.caseSensitive || false}
                      onChange={(e) => updateCondition(index, { caseSensitive: e.target.checked })}
                      className="rounded"
                    />
                    <span className={cn(theme.textMuted, 'text-sm')}>Case sensitive</span>
                  </label>
                </div>
              )}
            </div>
          ))}

          {formData.conditions.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <AlertCircle className={cn(theme.textMuted, 'w-8 h-8 mx-auto mb-2')} />
              <p className={theme.textMuted}>No conditions added yet</p>
              <p className={cn(theme.textMuted, 'text-sm')}>Add conditions to define when this rule should trigger</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className={theme.textPrimary}>Actions</h4>
          <button
            onClick={addAction}
            className={cn(theme.btnSecondary, 'text-sm')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Action
          </button>
        </div>

        <div className="space-y-3">
          {formData.actions.map((action, index) => {
            const entityOptions = getEntityOptions(action.entityType);
            
            return (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className={cn(theme.label, 'text-sm mb-1')}>Entity Type</label>
                    <select
                      value={action.entityType}
                      onChange={(e) => updateAction(index, { 
                        entityType: e.target.value as any,
                        entityId: '' // Reset entity selection when type changes
                      })}
                      className={theme.select}
                    >
                      <option value="goal">Goal</option>
                      <option value="insurance">Insurance</option>
                      <option value="asset">Asset</option>
                    </select>
                  </div>

                  <div>
                    <label className={cn(theme.label, 'text-sm mb-1')}>Entity</label>
                    <select
                      value={action.entityId}
                      onChange={(e) => updateAction(index, { entityId: e.target.value })}
                      className={theme.select}
                    >
                      <option value="">Select entity...</option>
                      {entityOptions.map(entity => (
                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={cn(theme.label, 'text-sm mb-1')}>Allocation</label>
                    <select
                      value={action.allocationMethod}
                      onChange={(e) => updateAction(index, { allocationMethod: e.target.value as any })}
                      className={theme.select}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                      <option value="remaining_amount">Remaining Amount</option>
                    </select>
                  </div>

                  <div className="flex items-end space-x-2">
                    {action.allocationMethod === 'percentage' && (
                      <div className="flex-1">
                        <input
                          type="number"
                          value={action.percentage || 0}
                          onChange={(e) => updateAction(index, { percentage: Number(e.target.value) })}
                          className={theme.input}
                          min="0"
                          max="100"
                          placeholder="%"
                        />
                      </div>
                    )}
                    {action.allocationMethod === 'fixed_amount' && (
                      <div className="flex-1">
                        <input
                          type="number"
                          value={action.amount || 0}
                          onChange={(e) => updateAction(index, { amount: Number(e.target.value) })}
                          className={theme.input}
                          min="0"
                          placeholder="Amount"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => removeAction(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className={cn(theme.label, 'text-sm mb-1')}>Notes (Optional)</label>
                  <input
                    type="text"
                    value={action.notes || ''}
                    onChange={(e) => updateAction(index, { notes: e.target.value })}
                    className={theme.input}
                    placeholder="Add notes for this action..."
                  />
                </div>
              </div>
            );
          })}

          {formData.actions.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Target className={cn(theme.textMuted, 'w-8 h-8 mx-auto mb-2')} />
              <p className={theme.textMuted}>No actions added yet</p>
              <p className={cn(theme.textMuted, 'text-sm')}>Add actions to define what happens when conditions are met</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={() => setShowRuleForm(false)}
          className={theme.btnSecondary}
        >
          Cancel
        </button>
        <button
          onClick={handleSaveRule}
          disabled={!formData.name || formData.conditions.length === 0 || formData.actions.length === 0}
          className={theme.btnPrimary}
        >
          <Save className="w-4 h-4 mr-2" />
          {editingRule ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={theme.heading2}>Linking Rules Manager</h2>
          <p className={theme.textMuted}>
            Create and manage automatic transaction linking rules
          </p>
        </div>
        <button
          onClick={handleCreateRule}
          className={cn(theme.btnPrimary, 'flex items-center')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </button>
      </div>

      {/* Rule Form */}
      {showRuleForm && renderRuleForm()}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className={cn(theme.card, 'border-l-4', rule.isActive ? 'border-green-500' : 'border-gray-300')}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className={cn(theme.textPrimary, 'font-medium')}>{rule.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      rule.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    )}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                      Priority: {rule.priority}
                    </span>
                  </div>
                </div>
                
                <p className={cn(theme.textMuted, 'mb-3')}>{rule.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={cn(theme.textMuted, 'mb-1')}>Conditions ({rule.conditions.length})</p>
                    <div className="space-y-1">
                      {rule.conditions.slice(0, 2).map((condition, index) => (
                        <p key={index} className={theme.textPrimary}>
                          {condition.field} {condition.operator} "{condition.value}"
                        </p>
                      ))}
                      {rule.conditions.length > 2 && (
                        <p className={theme.textMuted}>+{rule.conditions.length - 2} more...</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className={cn(theme.textMuted, 'mb-1')}>Actions ({rule.actions.length})</p>
                    <div className="space-y-1">
                      {rule.actions.slice(0, 2).map((action, index) => {
                        const Icon = getEntityIcon(action.entityType);
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <Icon className="w-4 h-4 text-blue-600" />
                            <span className={theme.textPrimary}>
                              {action.allocationMethod === 'percentage' ? `${action.percentage}%` : 
                               action.allocationMethod === 'fixed_amount' ? `₹${action.amount}` : 'All'} 
                              → {action.entityType}
                            </span>
                          </div>
                        );
                      })}
                      {rule.actions.length > 2 && (
                        <p className={theme.textMuted}>+{rule.actions.length - 2} more...</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2 text-sm">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <span className={theme.textMuted}>Triggered {rule.triggerCount} times</span>
                  </div>
                  {rule.lastTriggered && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className={theme.textMuted}>
                        Last: {new Date(rule.lastTriggered).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    rule.isActive 
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                >
                  {rule.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleEditRule(rule)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit rule"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-12">
            <Settings className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-4')} />
            <h3 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>No linking rules yet</h3>
            <p className={theme.textMuted}>
              Create your first rule to automatically link transactions to your financial goals and entities.
            </p>
            <button
              onClick={handleCreateRule}
              className={cn(theme.btnPrimary, 'mt-4')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkingRulesManager;