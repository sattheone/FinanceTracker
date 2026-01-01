import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit3, Trash2, Tag, Search, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { Category } from '../../constants/categories';
import CategoryForm, { CategoryFormHandle } from './CategoryForm';
import SidePanel from '../common/SidePanel';

interface CategorySpending {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

const SimpleCategoryManager: React.FC = () => {
  const theme = useThemeClasses();
  const {
    transactions,
    updateTransaction,
    categories: contextCategories,
    addCategory,
    updateCategory,
    deleteCategory
  } = useData();

  // Use categories from DataContext directly, with fallback
  const categories = contextCategories || [];

  // Side overlay controls
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const formRef = useRef<CategoryFormHandle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthlySpending, setMonthlySpending] = useState<CategorySpending[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    calculateMonthlySpending();
  }, [transactions, categories]);

  const calculateMonthlySpending = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        t.type === 'expense';
    });

    const totalSpending = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

    const categorySpending: Record<string, { amount: number; count: number }> = {};

    monthlyTransactions.forEach(t => {
      const categoryId = t.category || 'other';
      const category = categories.find(c => c.id === categoryId);

      let targetId = categoryId;
      if (category?.parentId) {
        targetId = category.parentId;
      }

      if (!categorySpending[targetId]) {
        categorySpending[targetId] = { amount: 0, count: 0 };
      }
      categorySpending[targetId].amount += t.amount;
      categorySpending[targetId].count += 1;

      if (category?.parentId) {
        if (!categorySpending[categoryId]) {
          categorySpending[categoryId] = { amount: 0, count: 0 };
        }
        categorySpending[categoryId].amount += t.amount;
        categorySpending[categoryId].count += 1;
      }
    });

    const spendingArray: CategorySpending[] = Object.entries(categorySpending)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    setMonthlySpending(spendingArray);
  };

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    try {
      if (editingCategory) {
        // Update existing
        // We only pass the fields that are in categoryData
        await updateCategory(editingCategory.id, categoryData);
        setEditingCategory(null);
      } else {
        // Add new
        const parentId = categoryData.parentId || undefined;
        // Determine order: put at end of siblings
        const siblings = categories.filter(c => c.parentId === parentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.order || 0)) : 0;

        // DataContext/Firebase handles ID generation
        await addCategory({
          name: categoryData.name!,
          color: categoryData.color!,
          icon: categoryData.icon!,
          isCustom: true,
          parentId: parentId,
          order: maxOrder + 100,
          isSystem: false,
          // type: categoryData.type // Removed as it's not in Omit<Category, "id">
        });
      }
      setShowAddPanel(false);
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? Transactions will be moved to "Other".')) {
      try {
        const transactionsToUpdate = transactions.filter(t => t.category === categoryId);
        // Update transactions sequentially to avoid race conditions if any
        for (const t of transactionsToUpdate) {
          await updateTransaction(t.id, { ...t, category: 'other' });
        }

        await deleteCategory(categoryId);
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // Find siblings (same parent)
    const siblings = categories
      .filter(c => c.parentId === category.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const index = siblings.findIndex(c => c.id === categoryId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    // Swap logic: We need to re-assign orders to ensure correct sorting
    const newSiblings = [...siblings];
    // Swap positions in the array
    [newSiblings[index], newSiblings[targetIndex]] = [newSiblings[targetIndex], newSiblings[index]];

    // Re-assign order values based on new array position
    const updates = newSiblings.map((c, i) => ({
      id: c.id,
      order: (i + 1) * 100 // Use large gaps to avoid future collisions
    }));

    try {
      // Update all categories with new orders
      await Promise.all(updates.map(u => updateCategory(u.id, { order: u.order })));
    } catch (error) {
      console.error('Error moving category:', error);
      alert('Failed to move category');
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id) || categories.find(c => c.id === 'other');
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setShowAddPanel(true);
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Group categories for display
  const rootCategories = useMemo(() => {
    // Filter out invalid categories first to prevent crashes
    const validCategories = categories.filter(c => c && typeof c.name === 'string');

    return validCategories
      .filter(c => !c.parentId &&
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          validCategories.some(child => child.parentId === c.id && child.name.toLowerCase().includes(searchTerm.toLowerCase())))
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [categories, searchTerm]);

  const getSubcategories = (parentId: string) => {
    return categories
      .filter(c => c.parentId === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={theme.heading2}>Categories</h2>
          <p className={theme.textMuted}>
            Organize your spending with custom categories
          </p>
        </div>
        <button
          onClick={() => { setEditingCategory(null); setShowAddPanel(true); }}
          className={cn(theme.btnPrimary, 'flex items-center')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Monthly Spending Overview */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, 'mb-4')}>This Month's Spending</h3>
        <div className="space-y-3">
          {monthlySpending
            .filter(s => !categories.find(c => c.id === s.category)?.parentId)
            .slice(0, 8)
            .map((spending) => {
              const category = getCategoryById(spending.category);
              return (
                <div key={spending.category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: category?.color + '20' }}
                    >
                      {category?.icon}
                    </div>
                    <div>
                      <p className={cn(theme.textPrimary, 'font-medium')}>{category?.name}</p>
                      <p className={cn(theme.textMuted, 'text-sm')}>{spending.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(theme.textPrimary, 'font-semibold')}>{formatCurrency(spending.amount)}</p>
                    <p className={cn(theme.textMuted, 'text-sm')}>{spending.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Add/Edit Category - Side Overlay */}
      <SidePanel
        isOpen={showAddPanel}
        onClose={() => { setShowAddPanel(false); setEditingCategory(null); }}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        headerActions={(
          <button
            onClick={() => formRef.current?.submit()}
            className="px-4 py-1.5 bg-black text-white rounded-lg text-sm font-semibold shadow hover:bg-gray-900"
          >
            {editingCategory ? 'Save' : 'Add'}
          </button>
        )}
      >
        <div id="category-form-modal" onClick={(e) => e.stopPropagation()}>
          <CategoryForm
            ref={formRef}
            initialData={editingCategory}
            categories={categories}
            onUngroupChildren={async (parentId: string) => {
              try {
                const children = categories.filter(c => c.parentId === parentId);
                if (children.length === 0) return;
                await Promise.all(children.map(child => updateCategory(child.id, { parentId: undefined })));
                alert('All subcategories have been ungrouped.');
              } catch (e) {
                console.error('Failed to ungroup categories', e);
                alert('Failed to ungroup categories');
              }
            }}
            onSave={async (data) => {
              await handleSaveCategory(data);
              setShowAddPanel(false);
            }}
            onCancel={() => { setShowAddPanel(false); setEditingCategory(null); }}
          />
        </div>
      </SidePanel>

      {/* Categories List */}
      <div className={theme.card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={theme.heading3}>All Categories ({categories.length})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field theme-input !pl-10 text-sm"
              placeholder="Search categories..."
            />
          </div>
        </div>

        <div className="space-y-4">
          {rootCategories.map((category, index) => {
            const spending = monthlySpending.find(s => s.category === category.id);
            const subcategories = getSubcategories(category.id);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div
                key={category.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
              >
                {/* Parent Category Row */}
                <div className="p-4 bg-white dark:bg-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {subcategories.length > 0 ? (
                        isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />
                      ) : <div className="w-4 h-4" />}
                    </button>

                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <h4 className={cn(theme.textPrimary, 'font-medium')}>{category.name}</h4>
                      <p className={cn(theme.textMuted, 'text-sm')}>
                        {subcategories.length} subcategories • {category.isCustom ? 'Custom' : 'Default'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {spending && (
                      <div className="text-right mr-4">
                        <p className={cn(theme.textPrimary, 'font-medium')}>{formatCurrency(spending.amount)}</p>
                        <p className={cn(theme.textMuted, 'text-xs')}>{spending.count} txns</p>
                      </div>
                    )}

                    {/* Reorder Buttons */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => moveCategory(category.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveCategory(category.id, 'down')}
                        disabled={index === rootCategories.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      {!category.isSystem && (
                        <>
                          <button
                            onClick={() => startEdit(category)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subcategories List */}
                {isExpanded && subcategories.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-600">
                    {subcategories.map((sub, subIndex) => {
                      const subSpending = monthlySpending.find(s => s.category === sub.id);
                      return (
                        <div key={sub.id} className="flex items-center justify-between p-3 pl-16 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                              style={{ backgroundColor: sub.color + '20' }}
                            >
                              {sub.icon}
                            </div>
                            <span className={theme.textPrimary}>{sub.name}</span>
                          </div>

                          <div className="flex items-center space-x-4">
                            {subSpending && (
                              <div className="text-right mr-4">
                                <p className={cn(theme.textPrimary, 'text-sm font-medium')}>{formatCurrency(subSpending.amount)}</p>
                              </div>
                            )}

                            {/* Reorder Buttons for Subcategories */}
                            <div className="flex flex-col space-y-1">
                              <button
                                onClick={() => moveCategory(sub.id, 'up')}
                                disabled={subIndex === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => moveCategory(sub.id, 'down')}
                                disabled={subIndex === subcategories.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex items-center space-x-1">
                              {!sub.isSystem && (
                                <>
                                  <button
                                    onClick={() => startEdit(sub)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(sub.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {rootCategories.length === 0 && (
          <div className="text-center py-8">
            <Tag className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-4')} />
            <h4 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>
              {searchTerm ? 'No categories found' : 'No categories yet'}
            </h4>
            <p className={theme.textMuted}>
              {searchTerm ? 'Try a different search term' : 'Create your first category to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleCategoryManager;