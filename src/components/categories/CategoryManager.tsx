import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Folder, 
  FolderOpen,
  Tag,
  TrendingUp,

  BarChart3,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { mintLikeFeatures, CategoryHierarchy } from '../../services/mintLikeFeatures';

const CategoryManager: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions } = useData();
  
  const [categories, setCategories] = useState<CategoryHierarchy[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, setShowAddForm] = useState(false);
  const [, setEditingCategory] = useState<CategoryHierarchy | null>(null);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCategories();
    calculateCategorySpending();
  }, [transactions]);

  const loadCategories = () => {
    const defaultCategories = mintLikeFeatures.getCategoryHierarchy();
    setCategories(defaultCategories);
    
    // Expand all parent categories by default
    const parentIds = defaultCategories.map(cat => cat.id);
    setExpandedCategories(new Set(parentIds));
  };

  const calculateCategorySpending = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const spending: Record<string, number> = {};
    
    transactions
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear && 
               t.type === 'expense';
      })
      .forEach(t => {
        const category = t.category || 'other';
        spending[category] = (spending[category] || 0) + t.amount;
      });

    setCategorySpending(spending);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategorySpending = (categoryId: string): number => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return categorySpending[categoryId] || 0;

    // For parent categories, sum up subcategory spending
    if (category.subCategories) {
      return category.subCategories.reduce((sum, subCat) => 
        sum + (categorySpending[subCat.id] || 0), 0
      ) + (categorySpending[categoryId] || 0);
    }

    return categorySpending[categoryId] || 0;
  };

  const getBudgetStatus = (categoryId: string, spending: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category?.budgetLimit) return null;

    const percentage = (spending / category.budgetLimit) * 100;
    
    if (percentage >= 100) {
      return { status: 'exceeded', percentage, color: 'text-red-600 dark:text-red-400' };
    } else if (percentage >= 80) {
      return { status: 'warning', percentage, color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { status: 'good', percentage, color: 'text-green-600 dark:text-green-400' };
    }
  };

  const renderCategory = (category: CategoryHierarchy, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const spending = getCategorySpending(category.id);
    const budgetStatus = getBudgetStatus(category.id, spending);
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;

    return (
      <div key={category.id} className="space-y-2">
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer',
            selectedCategory === category.id 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
            level > 0 && 'ml-6 border-l-4'
          )}
          style={{ 
            borderLeftColor: level > 0 ? category.color : undefined,
            marginLeft: level * 24
          }}
          onClick={() => setSelectedCategory(category.id)}
        >
          <div className="flex items-center space-x-3">
            {hasSubCategories && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                ) : (
                  <Folder className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
            
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: category.color + '20', color: category.color }}
            >
              {category.icon}
            </div>
            
            <div>
              <h4 className={cn(theme.textPrimary, 'font-medium')}>{category.name}</h4>
              {category.budgetLimit && (
                <p className={cn(theme.textMuted, 'text-sm')}>
                  Budget: ₹{category.budgetLimit.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Spending Amount */}
            <div className="text-right">
              <p className={cn(theme.textPrimary, 'font-semibold')}>
                ₹{spending.toLocaleString()}
              </p>
              {budgetStatus && (
                <div className="flex items-center space-x-1">
                  <div className={cn('text-xs', budgetStatus.color)}>
                    {budgetStatus.percentage.toFixed(0)}% of budget
                  </div>
                  {budgetStatus.status === 'exceeded' && <AlertCircle className="w-3 h-3 text-red-500" />}
                  {budgetStatus.status === 'warning' && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                  {budgetStatus.status === 'good' && <CheckCircle className="w-3 h-3 text-green-500" />}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory(category);
                  setShowAddForm(true);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Category"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              {level > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle delete subcategory
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        {budgetStatus && (
          <div className="ml-12 mr-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  budgetStatus.status === 'exceeded' ? 'bg-red-500' :
                  budgetStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${Math.min(budgetStatus.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Subcategories */}
        {hasSubCategories && isExpanded && (
          <div className="space-y-2">
            {category.subCategories!.map(subCategory => 
              renderCategory(subCategory, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={theme.heading2}>Category Management</h2>
          <p className={theme.textMuted}>
            Organize your spending with smart categories and budgets
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowAddForm(true);
          }}
          className={cn(theme.btnPrimary, 'flex items-center')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <Tag className="w-6 h-6 text-blue-600" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className={theme.metricValue}>{categories.length}</p>
          <p className={theme.metricLabel}>Categories</p>
        </div>

        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="text-xs text-gray-500">This Month</span>
          </div>
          <p className={theme.metricValue}>
            ₹{Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
          </p>
          <p className={theme.metricLabel}>Total Spending</p>
        </div>

        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6 text-purple-600" />
            <span className="text-xs text-gray-500">Budgets</span>
          </div>
          <p className={theme.metricValue}>
            {categories.filter(c => c.budgetLimit).length}
          </p>
          <p className={theme.metricLabel}>With Budgets</p>
        </div>

        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <span className="text-xs text-gray-500">Alerts</span>
          </div>
          <p className={theme.metricValue}>
            {categories.filter(c => {
              const spending = getCategorySpending(c.id);
              const status = getBudgetStatus(c.id, spending);
              return status && (status.status === 'exceeded' || status.status === 'warning');
            }).length}
          </p>
          <p className={theme.metricLabel}>Over Budget</p>
        </div>
      </div>

      {/* Categories List */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, 'mb-4')}>Categories & Spending</h3>
        
        <div className="space-y-3">
          {categories.map(category => renderCategory(category))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8">
            <Tag className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-4')} />
            <h4 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>No categories yet</h4>
            <p className={theme.textMuted}>
              Create your first category to start organizing your spending
            </p>
          </div>
        )}
      </div>

      {/* Category Details Panel */}
      {selectedCategory && (
        <div className={theme.card}>
          <h3 className={cn(theme.heading3, 'mb-4')}>Category Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Recent Transactions</h4>
              <div className="space-y-2">
                {transactions
                  .filter(t => t.category === selectedCategory)
                  .slice(0, 5)
                  .map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div>
                        <p className={cn(theme.textPrimary, 'text-sm')}>{transaction.description}</p>
                        <p className={cn(theme.textMuted, 'text-xs')}>{new Date(transaction.date).toLocaleDateString()}</p>
                      </div>
                      <span className={cn(theme.textPrimary, 'font-medium')}>
                        ₹{transaction.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Spending Trend</h4>
              <div className="text-center py-8">
                <BarChart3 className={cn(theme.textMuted, 'w-8 h-8 mx-auto mb-2')} />
                <p className={theme.textMuted}>Trend chart coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;