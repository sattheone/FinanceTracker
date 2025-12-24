import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Check } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import SidePanel from '../common/SidePanel';
import { Category } from '../../constants/categories';
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
  const [popoverPosition, setPopoverPosition] = useState<{ top?: number; bottom?: number; left: number; width?: number; maxHeight?: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const POPOVER_HEIGHT = 300; // Estimated max height
      const GAP = 4;

      // Check space below
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;

      setPopoverPosition({
        top: showAbove ? undefined : rect.bottom + GAP,
        bottom: showAbove ? (viewportHeight - rect.top + GAP) : undefined,
        left: rect.left,
        width: 256,
        // If showing above, we might want to dynamically adjust height if space is tight, 
        // but simple flip is a good start.
        maxHeight: showAbove ? Math.min(POPOVER_HEIGHT, rect.top - GAP * 2) : Math.min(POPOVER_HEIGHT, viewportHeight - rect.bottom - GAP * 2)
      });
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside trigger button (containerRef) OR inside popover (popoverRef)
      const target = event.target as Node;

      const isInsideTrigger = containerRef.current && containerRef.current.contains(target);
      const isInsidePopover = popoverRef.current && popoverRef.current.contains(target);
      const isInsideModal = document.getElementById('category-form-modal')?.contains(target); // Safety check for nested modal

      if (!isInsideTrigger && !isInsidePopover && !isInsideModal) {
        if (!showNewCategoryModal) {
          setIsOpen(false);
          if (onCancel) onCancel();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Handle scroll to close/reposition? For now, close on scroll often safest for fixed popovers
      // pushing it: let's close on scroll to avoid detached floating elements
      const handleScroll = () => {
        // Optional: real-time update or close. Closing is simpler.
        // setIsOpen(false); 
      };
      window.addEventListener('scroll', handleScroll, true); // Capture phase for all scroll containers

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, onCancel, showNewCategoryModal]);

  // Focus search when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small timeout to allow render
      setTimeout(() => searchInputRef.current?.focus(), 50);
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
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button - Chip Style */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex items-center justify-center space-x-1 px-2 py-0.5 rounded-full transition-all w-fit max-w-[140px]",
          // Remove default border/bg classes as we override them
          "hover:opacity-80"
        )}
        style={{
          backgroundColor: currentCategoryObj?.color ? `${currentCategoryObj.color}20` : '#E5E7EB', // 20 = ~12% opacity
          color: currentCategoryObj?.color || '#374151'
        }}
      >
        <span className="text-xs flex-shrink-0">{currentCategoryObj?.icon || '📋'}</span>
        <span className="text-[10px] font-bold truncate uppercase tracking-wider">
          {currentCategoryObj?.name || 'SELECT'}
        </span>
      </button>

      {/* Popover Menu - Rendered via Portal */}
      {isOpen && popoverPosition && createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: popoverPosition.top,
            bottom: popoverPosition.bottom,
            left: popoverPosition.left,
            width: popoverPosition.width,
            maxHeight: popoverPosition.maxHeight || 300
          }}
          className={cn(
            "fixed rounded-lg shadow-xl border z-[9999] flex flex-col transform transition-all",
            // Adjust position if it goes off screen (basic check needed? usually browser handles basic layout, but fixed needs care)
            // For now rely on basic calc.
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
          <div className="overflow-y-auto flex-1 p-1 max-h-[300px]">
            {displayGroups.map(({ parent, children }) => (
              <div key={parent.id} className="mb-1">
                {/* Parent */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(parent.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-2 px-2 py-1 rounded-md text-left transition-colors",
                    currentCategory === parent.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  )}
                >
                  <span className="text-sm">{parent.icon}</span>
                  <span className="text-xs font-medium flex-1">{parent.name}</span>
                  {currentCategory === parent.id && <Check className="w-3 h-3" />}
                </button>

                {/* Children */}
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave(child.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center space-x-2 px-2 py-1 pl-8 rounded-md text-left transition-colors",
                      currentCategory === child.id
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    )}
                  >
                    <span className="text-sm">{child.icon}</span>
                    <span className="text-xs flex-1">{child.name}</span>
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
              onClick={(e) => {
                e.stopPropagation();
                setShowNewCategoryModal(true);
              }}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Category</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* New Category Modal */}
      <SidePanel
        isOpen={showNewCategoryModal}
        onClose={() => setShowNewCategoryModal(false)}
        title="Add New Category"
        footer={<></>}
      >
        <div id="category-form-modal" onClick={(e) => e.stopPropagation()}>
          <CategoryForm
            categories={categories}
            onSave={handleSaveNewCategory}
            onCancel={() => setShowNewCategoryModal(false)}
          />
        </div>
      </SidePanel>
    </div>
  );
};

export default InlineCategoryEditor;