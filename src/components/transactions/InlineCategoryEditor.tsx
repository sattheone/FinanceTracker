import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Check, ChevronDown } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
// removed localstorage dependent imports if any (none specific to remove, but adding useData)
import { useData } from '../../contexts/DataContext';
import { Category } from '../../constants/categories'; // defaultCategories not needed anymore, but keeping just in case for type
import Modal from '../common/Modal';
import CategoryForm from '../categories/CategoryForm';

interface InlineCategoryEditorProps {
  currentCategory: string;
  onSave: (categoryId: string) => void;
  onCancel?: () => void;
}

const InlineCategoryEditor: React.FC<InlineCategoryEditorProps> = ({
  currentCategory,
  onSave,
  onCancel
}) => {
  const { categories: contextCategories, addCategory } = useData();
  const theme = useThemeClasses();

  // Use categories from context
  const categories = contextCategories || [];

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Logic unchanged
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!showNewCategoryModal) {
          setIsOpen(false);
          if (onCancel) onCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel, showNewCategoryModal]);

  // Focus search when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSaveNewCategory = async (categoryData: Partial<Category>) => {
    try {
      // Determine order: put at end of siblings
      const parentId = categoryData.parentId;
      const siblings = categories.filter(c => c.parentId === parentId);
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.order || 0)) : 0;

      const newId = await addCategory({
        name: categoryData.name!,
        color: categoryData.color!,
        icon: categoryData.icon!,
        isCustom: true,
        parentId: parentId,
        order: maxOrder + 10,
        ...categoryData
      });

      if (newId) {
        onSave(newId);
        setShowNewCategoryModal(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to add category", error);
    }
  };

  const currentCategoryObj = categories.find(c => c.id === currentCategory) ||
    categories.find(c => c.id === 'other');

  // Refined grouping logic that handles search better
  const displayGroups = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    // 1. Find all matching categories
    const matches = categories.filter(c =>
      c.name.toLowerCase().includes(lowerSearch)
    );
    const matchIds = new Set(matches.map(c => c.id));

    // 2. Include parents of matching children
    matches.forEach(c => {
      if (c.parentId) matchIds.add(c.parentId);
    });

    // 3. Include children of matching parents
    categories.forEach(c => {
      if (c.parentId && matchIds.has(c.parentId)) {
        // Optional: only show all children if parent matches? 
        // Or just show matching children?
        // User usually expects to see children if parent matches.
        if (categories.find(p => p.id === c.parentId)?.name.toLowerCase().includes(lowerSearch)) {
          matchIds.add(c.id);
        }
      }
    });

    const relevantCategories = categories.filter(c => matchIds.has(c.id));

    const roots = relevantCategories
      .filter(c => !c.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return roots.map(root => ({
      parent: root,
      children: relevantCategories
        .filter(c => c.parentId === root.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
  }, [categories, searchTerm]);


  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all w-full",
          theme.bgElevated,
          theme.border,
          "hover:border-blue-500 dark:hover:border-blue-400"
        )}
      >
        <span className="text-lg">{currentCategoryObj?.icon || '📋'}</span>
        <span className={cn("text-sm font-medium truncate", theme.textPrimary)}>
          {currentCategoryObj?.name || 'Select Category'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-full left-0 mt-1 w-64 max-h-96 rounded-lg shadow-xl border z-50 flex flex-col",
            theme.bgElevated,
            theme.border
          )}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500",
                  theme.bgPrimary,
                  theme.border,
                  theme.textPrimary
                )}
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="overflow-y-auto flex-1 p-1">
            {displayGroups.map(({ parent, children }) => (
              <div key={parent.id} className="mb-1">
                {/* Parent */}
                <button
                  onClick={() => {
                    onSave(parent.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-left transition-colors",
                    currentCategory === parent.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  )}
                >
                  <span className="text-base">{parent.icon}</span>
                  <span className="text-sm font-medium flex-1">{parent.name}</span>
                  {currentCategory === parent.id && <Check className="w-3 h-3" />}
                </button>

                {/* Children */}
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => {
                      onSave(child.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center space-x-2 px-2 py-1.5 pl-8 rounded-md text-left transition-colors",
                      currentCategory === child.id
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    )}
                  >
                    <span className="text-base">{child.icon}</span>
                    <span className="text-sm flex-1">{child.name}</span>
                    {currentCategory === child.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            ))}

            {displayGroups.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No categories found
              </div>
            )}
          </div>

          {/* Footer: New Category */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <button
              onClick={() => setShowNewCategoryModal(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Category</span>
            </button>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      <Modal
        isOpen={showNewCategoryModal}
        onClose={() => setShowNewCategoryModal(false)}
        title="Add New Category"
      >
        <CategoryForm
          categories={categories}
          onSave={handleSaveNewCategory}
          onCancel={() => setShowNewCategoryModal(false)}
        />
      </Modal>
    </div>
  );
};

export default InlineCategoryEditor;